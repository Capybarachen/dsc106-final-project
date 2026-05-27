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
// AUTO DIALOGUE SYSTEM
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

let dialogueIndex = 0;

// clear at start

leftDialogue.innerText = "";
rightDialogue.innerText = "";

// =========================
// SHOW DIALOGUE
// =========================

function showDialogue() {

  // finished all dialogue

  if (dialogueIndex >= dialogueLines.length) {

    overlay.style.opacity = 0;

    setTimeout(() => {

      overlay.style.display = "none";

    }, 1500);

    return;
  }

  // clear previous dialogue

  leftDialogue.innerText = "";
  rightDialogue.innerText = "";

  // current line

  const current =
    dialogueLines[dialogueIndex];

  // show on correct side

  if (current.side === "left") {

    leftDialogue.innerText =
      current.text;

  }

  else {

    rightDialogue.innerText =
      current.text;

  }

  dialogueIndex++;

  // next dialogue after 2.5 sec

  setTimeout(showDialogue, 2500);

}

// =========================
// START AUTOMATICALLY
// =========================

setTimeout(showDialogue, 1200);

// =========================
// CHART 1 DATA
// =========================

const DATA_URL = "data/timeseries.json";

const C = {
  aod: "#f59e0b",
  tas: "#f87171",
  accent: "#818cf8"
};

let DATA = null;

let SMOOTH_N = 12;

let MAX_YEAR = 2014;

let CHART1_XSC = null;

let PLAY_INTERVAL = null;

// =========================
// TOOLTIP
// =========================

const tip = d3.select("#tooltip");

function showTip(html, e) {

  tip.html(html)
    .style("opacity", 1)
    .style("left", (e.clientX + 16) + "px")
    .style("top", (e.clientY - 8) + "px");

}

function hideTip() {

  tip.style("opacity", 0);

}

// =========================
// ROLLING MEAN
// =========================

function rolling(arr, n) {

  if (n <= 1) return arr;

  const h = Math.floor(n / 2);

  return arr.map((_, i) => {

    const slice = arr.slice(
      Math.max(0, i - h),
      Math.min(arr.length, i + h + 1)
    ).filter(v => v != null);

    return slice.length
      ? slice.reduce((a, b) => a + b, 0) / slice.length
      : null;

  });

}

// =========================
// PEARSON CORRELATION
// =========================

function pearson(xs, ys) {

  const pts = xs.map(
    (x, i) => [x, ys[i]]
  ).filter(
    p => p[0] != null && p[1] != null
  );

  if (pts.length < 3) return 0;

  const n = pts.length;

  const mx =
    pts.reduce((s, p) => s + p[0], 0) / n;

  const my =
    pts.reduce((s, p) => s + p[1], 0) / n;

  const num = pts.reduce(
    (s, p) =>
      s + (p[0] - mx) * (p[1] - my),
    0
  );

  const den = Math.sqrt(

    pts.reduce(
      (s, p) =>
        s + (p[0] - mx) ** 2,
      0
    )

    *

    pts.reduce(
      (s, p) =>
        s + (p[1] - my) ** 2,
      0
    )

  );

  return den === 0 ? 0 : num / den;

}


