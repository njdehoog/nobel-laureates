import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let data = await d3.csv("assets/nobel-prize-laureates.csv", (d) => ({
    id: parseInt(d["id"]),
    first_name: d["Firstname"],
    last_name: d["Surname"],
    category: d["Category"],
    year: parseInt(d["Year"]),
    gender: d["Gender"],
}));

data = data.filter(d => d.gender !== "org")

const width = 700;
const height = 700;

const circleRadius = 6;
const center = { x: width / 2, y: height / 2 };

const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)

const colorScale = d3.scaleOrdinal(d3.range(6), d3.schemeCategory10)

const nodes = data.map((d, index) => {
    return {
        id: index,
        r: circleRadius,
        data: d
    }
})
initialLayout(nodes)

const circles = svg.append("g")
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("id", d => `node-${d.id}`)
    .attr("r", 0)
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("fill", d => colorScale(d.data.category));

circles.transition()
    .delay(() => Math.random() * 500)
    .duration(750)
    .attrTween("r", d => {
        const i = d3.interpolate(0, d.r);
        return t => d.r = i(t);
    });

const container = d3.select("#chart").node()
container.prepend(svg.node())

let currentStep = 0;

const observer = new IntersectionObserver(callback, {
    rootMargin: "0px",
    threshold: 1.0,
});

const sections = document.querySelectorAll("section");
sections.forEach((section) => {
    observer.observe(section);
})

function callback(entries) {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            const section = entry.target;
            const index = Array.from(sections).indexOf(section);
            if (index !== currentStep) {
                updateLayoutForStep(index);
                currentStep = index;
            }
        }
    });
}

function updateLayoutForStep(step) {
    switch (step) {
        case 1:
            clusteredLayout(nodes, "category")
            break;
        case 2:
            clusteredLayout(nodes, "gender")
            break;
        default:
            initialLayout(nodes)
            break;
    }

    circles.interrupt().transition()
        .duration(750)
        .delay(() => Math.random() * 300)
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
}

function initialLayout(nodes) {
    // ensure that node.x and node.y are not set
    nodes.forEach((node) => {
        delete node.x;
        delete node.y;
    });

    // d3 force simulation will default to phyllotaxis layout if node.x and node.y are not set
    d3.forceSimulation(nodes).stop();

    // center nodes
    nodes.forEach((node) => {
        node.x = node.x + center.x;
        node.y = node.y + center.y;
    });

    return nodes;
}

function clusteredLayout(nodes, grouping) {
    const grouped = d3.group(nodes, d => d.data[grouping])

    const packLayout = d3.pack()
        .size([width, height])
        .padding(10)

    const pack = packLayout(d3.hierarchy(grouped).sum(d => 1))
    const leaves = pack.leaves()

    leaves.forEach((leaf) => {
        const node = nodes.find(node => node.id === leaf.data.id)
        if (!node) {
            console.error("Node not found for leaf", leaf)
        }
        node.x = leaf.x
        node.y = leaf.y
    })

    return nodes;
}


