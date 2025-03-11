import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const data = await d3.csv("assets/nobel-prize-laureates.csv", (d) => ({
    id: parseInt(d["id"]),
    first_name: d["Firstname"],
    last_name: d["Surname"],
    category: d["Category"],
    year: parseInt(d["Year"]),
    gender: d["Gender"],
}));
console.log('data', data);

const width = 700;
const height = 700;

const circleRadius = 6;
const center = { x: width / 2, y: height / 2 };

const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)

const colorScale = d3.scaleOrdinal(d3.range(6), d3.schemeCategory10)

const grouped = d3.group(data, d => d.category)

const packLayout = d3.pack()
    .size([width, height])
    .padding(10)

const pack = packLayout(d3.hierarchy(grouped).sum(d => 1))
const nodes = pack.leaves().map(d => {
    d.r = circleRadius;
    d.x = d.x + Math.random() * 10;
    d.y = d.y + Math.random() * 10;
    return d;
})

const circles = svg.append("g")
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("r", circleRadius)
    .attr("fill", d => colorScale(d.data.category));

const simulation = d3.forceSimulation(nodes)
    .force("cluster", forceCluster())
    .force("collide", forceCollide())
    .force("x", d3.forceX(center.x).strength(0.01))
    .force("y", d3.forceY(center.y).strength(0.01))
// .stop();

simulation.on("tick", () => {
    circles
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
});

const container = d3.select("#chart").node()
container.prepend(svg.node())

// Force functions from d3 clustered bubbles example: https://observablehq.com/@d3/clustered-bubbles?collection=@d3/d3-force

function forceCluster() {
    const strength = 0.2;
    let nodes;

    function force(alpha) {
        const centroids = d3.rollup(nodes, centroid, d => d.data.category);
        const l = alpha * strength;
        for (const d of nodes) {
            const { x: cx, y: cy } = centroids.get(d.data.category);
            d.vx -= (d.x - cx) * l;
            d.vy -= (d.y - cy) * l;
        }
    }

    force.initialize = _ => nodes = _;

    return force;
}

function forceCollide() {
    const alpha = 0.4; // fixed for greater rigidity!
    const padding1 = 4; // separation between same-color nodes
    const padding2 = 20; // separation between different-color nodes
    let nodes;
    let maxRadius;

    function force() {
        const quadtree = d3.quadtree(nodes, d => d.x, d => d.y);
        for (const d of nodes) {
            const r = d.r + maxRadius;
            const nx1 = d.x - r, ny1 = d.y - r;
            const nx2 = d.x + r, ny2 = d.y + r;
            quadtree.visit((q, x1, y1, x2, y2) => {
                if (!q.length) do {
                    if (q.data !== d) {
                        const r = d.r + q.data.r + (d.data.category === q.data.data.category ? padding1 : padding2);
                        let x = d.x - q.data.x, y = d.y - q.data.y, l = Math.hypot(x, y);
                        if (l < r) {
                            l = (l - r) / l * alpha;
                            d.x -= x *= l, d.y -= y *= l;
                            q.data.x += x, q.data.y += y;
                        }
                    }
                } while (q = q.next);
                return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
            });
        }
    }

    force.initialize = _ => maxRadius = d3.max(nodes = _, d => d.r) + Math.max(padding1, padding2);

    return force;
}

function centroid(nodes) {
    let x = 0;
    let y = 0;
    let z = 0;
    for (const d of nodes) {
        let k = d.r ** 2;
        x += d.x * k;
        y += d.y * k;
        z += k;
    }
    return { x: x / z, y: y / z };
}