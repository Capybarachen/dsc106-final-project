const svg = d3.select("#chart")
  .append("svg")
  .attr("width", 600)
  .attr("height", 400);

svg.append("circle")
  .attr("cx", 300)
  .attr("cy", 200)
  .attr("r", 80)
  .attr("fill", "orange");
