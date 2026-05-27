const width = 700;
const height = 700;

// =========================
// CREATE SVG
// =========================

const svg = d3.select("#globe")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("viewBox", "0 0 700 700");

// =========================
// GLOBE PROJECTION
// =========================

const projection = d3.geoOrthographic()
  .scale(250)
  .translate([width / 2, height / 2])
  .rotate([20, -15]);

const path = d3.geoPath(projection);

// =========================
// OCEAN GLOW
// =========================

svg.append("circle")
  .attr("cx", width / 2)
  .attr("cy", height / 2)
  .attr("r", 250)
  .attr("fill", "#082f49")
  .style(
    "filter",
    "drop-shadow(0px 0px 35px #38bdf8)"
  );

// =========================
// LOAD WORLD MAP
// =========================

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

  // =========================
  // RENDER FUNCTION
  // =========================

  function render() {

    countriesGroup.selectAll("path")
      .attr("d", path);

  }

  // =========================
  // AUTO ROTATION
  // =========================

  let rotation = projection.rotate();

  let isDragging = false;

  d3.timer(() => {

    if (!isDragging) {

      // slowly return latitude

      rotation[1] += (-15 - rotation[1]) * 0.02;

      // keep spinning

      rotation[0] += 0.03;

      projection.rotate(rotation);

      render();

    }

  });

  // =========================
  // DRAG ROTATION
  // =========================

  svg.call(

    d3.drag()

      .on("start", () => {

        isDragging = true;

      })

      .on("drag", (event) => {

        rotation = projection.rotate();

        const rotateSpeed = 0.2;

        projection.rotate([
          rotation[0] + event.dx * rotateSpeed,
          rotation[1] - event.dy * rotateSpeed
        ]);

        render();

      })

      .on("end", () => {

        isDragging = false;

      })

  );

});

// =========================
// ALIEN DIALOGUE
// =========================

const overlay = document.getElementById(
  "intro-overlay"
);

const leftDialogue = document.getElementById(
  "left-dialogue"
);

const rightDialogue = document.getElementById(
  "right-dialogue"
);

const dialogueLines = [

  {
    side: "left",
    text: "This planet looks beautiful..."
  },

  {
    side: "right",
    text: "But something is changing."
  },

  {
    side: "left",
    text: "Let's investigate."
  }

];

let dialogueIndex = -1;

overlay.addEventListener("click", () => {

  dialogueIndex++;

  if (dialogueIndex < dialogueLines.length) {

    const current =
      dialogueLines[dialogueIndex];

    // clear old text

    leftDialogue.innerText = "";
    rightDialogue.innerText = "";

    // show current speaker

    if (current.side === "left") {

      leftDialogue.innerText =
        current.text;

    }

    else {

      rightDialogue.innerText =
        current.text;

    }

  }

  else {

    overlay.style.opacity = 0;

    setTimeout(() => {

      overlay.style.display = "none";

    }, 1500);

  }

});
});
