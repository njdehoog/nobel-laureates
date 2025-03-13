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

const categories = Array.from(new Set(data.map(d => d.category)))

const colorScale = d3.scaleOrdinal(categories, d3.schemeTableau10)

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
    .attr("fill", "#CCC");

circles.transition()
    .delay(() => Math.random() * 500)
    .duration(750)
    .attrTween("r", d => {
        const i = d3.interpolate(0, d.r);
        return t => d.r = i(t);
    });


const categoryLabels = svg.append("g")
    .selectAll("text")
    .data(categories)
    .join("text")
    .attr("fill", "#333")
    .attr("opacity", 0)
    .attr("font-size", "16px")
    .attr("font-weight", "bold")
    .attr("text-anchor", "middle")
    .attr("style", "filter: drop-shadow(1px 1px 2px rgb(255 255 255)) drop-shadow(-1px -1px 2px rgb(255 255 255)) drop-shadow(-1px 1px 2px rgb(255 255 255)) drop-shadow(1px -1px 2px rgb(255 255 255))")
    .text(d => d)

const genderLabels = svg.append("g")
    .selectAll("text")
    .data(Array.from(new Set(data.map(d => d.gender))))
    .join("text")
    .attr("fill", "#333")
    .attr("opacity", 0)
    .attr("font-size", "16px")
    .attr("font-weight", "bold")
    .attr("text-anchor", "middle")
    .attr("style", "filter: drop-shadow(1px 1px 2px rgb(255 255 255)) drop-shadow(-1px -1px 2px rgb(255 255 255)) drop-shadow(-1px 1px 2px rgb(255 255 255)) drop-shadow(1px -1px 2px rgb(255 255 255))")
    .text(d => d.charAt(0).toUpperCase() + d.slice(1))

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
    let grouping;

    switch (step) {
        case 1:
            grouping = "category"
            break;
        case 2:
            grouping = "gender"
            break;
        default:
            break;
    }

    let fill = "#CCC"
    let centroids;

    if (grouping) {
        const layout = clusteredLayout(nodes, grouping)
        centroids = layout.centroids

        if (grouping === "category") {
            categoryLabels
                .attr("x", d => centroids.get(d).x)
                .attr("y", d => centroids.get(d).y)
        } else {
            genderLabels
                .attr("x", d => centroids.get(d).x)
                .attr("y", d => centroids.get(d).y)
        }

        fill = d => colorScale(d.data.category)
    } else {
        initialLayout(nodes)
    }

    circles.interrupt()
        .transition()
        .duration(750)
        .delay(() => Math.random() * 300)
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", d => d.r)
        .attr("fill", fill);

    showAndHideLabelsForStep(step)
}

function showAndHideLabelsForStep(step) {
    categoryLabels.interrupt()
        .transition()
        .duration(750)
        .attr("opacity", step === 1 ? 1 : 0)

    genderLabels.interrupt()
        .transition()
        .duration(750)
        .attr("opacity", step === 2 ? 1 : 0)
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
        node.r = circleRadius;
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

    const centroids = d3.rollup(leaves, centroid, d => {
        return d.parent.data[0]
    });

    return { nodes, centroids };
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


