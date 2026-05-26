const width = 700;
const height = 700;

const svg = d3.select("#globe")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("viewBox", "0 0 700 700");

const projection = d3.geoOrthographic()
  .scale(250)
  .translate([width / 2, height / 2])
  .rotate([20, -15]);

const path = d3.geoPath(projection);

const globe = svg.append("circle")
  .attr("cx", width / 2)
  .attr("cy", height / 2)
  .attr("r", 250)
  .attr("fill", "#082f49")
  .style(
    "filter",
    "drop-shadow(0px 0px 35px #38bdf8)"
  );

let countriesGroup;

d3.json(
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
).then(world => {

  const countries = topojson.feature(
    world,
    world.objects.countries
  );

  countriesGroup = svg.append("g");

  countriesGroup.selectAll("path")
    .data(countries.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("fill", "#14532d")
    .attr("stroke", "#67e8f9")
    .attr("stroke-width", 0.3);

  function render() {

    countriesGroup.selectAll("path")
      .attr("d", path);
  }

  // =========================
  // AUTO ROTATION
  // =========================

  let rotation = projection.rotate();

  d3.timer(() => {

    rotation[0] += 0.03;

    projection.rotate(rotation);

    render();

  });

  // =========================
  // DRAG ROTATION
  // =========================

  svg.call(

    d3.drag()

      .on("drag", (event) => {

        rotation = projection.rotate();

        const rotateSpeed = 0.2;

        projection.rotate([
          rotation[0] + event.dx * rotateSpeed,
          rotation[1] - event.dy * rotateSpeed
        ]);

        render();

      })

  );

});
