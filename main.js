const width = 700;

const height = 700;

const svg = d3.select("#globe")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

svg.append("circle")

  .attr("cx", width / 2)

  .attr("cy", height / 2)

  .attr("r", 280)

  .attr("fill", "#0ea5e9")

  .attr("opacity", 0.25)

  .attr("stroke", "#67e8f9")

  .attr("stroke-width", 4)

  .style(
    "filter",
    "drop-shadow(0px 0px 40px #38bdf8)"
  );
