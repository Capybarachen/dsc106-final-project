const width = 700;

const height = 700;

const svg = d3.select("#globe")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

const projection = d3.geoOrthographic()
  .scale(300)
  .translate([width / 2, height / 2]);

const path = d3.geoPath(projection);

svg.append("circle")
  .attr("cx", width / 2)
  .attr("cy", height / 2)
  .attr("r", 300)
  .attr("fill", "#0f172a")
  .attr("stroke", "#38bdf8")
  .attr("stroke-width", 2);

let rotation = 0;

d3.timer(() => {

  rotation += 0.1;

  projection.rotate([rotation, -15]);

  svg.selectAll("path")
    .attr("d", path);

});
