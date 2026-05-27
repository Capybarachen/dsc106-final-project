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


function dims(id, height) {

  const svg =
    document.getElementById(id);

  const width =
    svg.clientWidth || 1200;

  const margin = {

    top: 30,
    right: 70,
    bottom: 50,
    left: 70

  };

  return {

    W: width,

    H: height,

    M: margin,

    iW:
      width -
      margin.left -
      margin.right,

    iH:
      height -
      margin.top -
      margin.bottom

  };

}


// ════════════════════════════════════════════════════════════════════════════
// CHART 1 — Dual-axis time series (AND section)
// ════════════════════════════════════════════════════════════════════════════
function drawChart1() {
  const { monthly, events } = DATA;
  const d   = dims("chart1", 340);
  const svg = d3.select("#chart1").attr("width", d.W).attr("height", d.H).html("");
  const g   = svg.append("g").attr("transform", `translate(${d.M.left},${d.M.top})`);

  const aodSmooth = rolling(monthly.aod, SMOOTH_N);
  const tasSmooth = rolling(monthly.tas_anomaly, SMOOTH_N);

  const xSc = d3.scaleLinear()
    .domain(d3.extent(monthly.time)).range([0, d.iW]);
  CHART1_XSC = xSc; // expose for live clip updates

  const aodSc = d3.scaleLinear()
    .domain(d3.extent(monthly.aod.filter(v => v != null))).nice()
    .range([d.iH, 0]);

  const tasExt = d3.extent(monthly.tas_anomaly.filter(v => v != null));
  const tasSc  = d3.scaleLinear().domain(tasExt).nice().range([d.iH, 0]);

  // Clip path — grows as MAX_YEAR advances
  svg.append("defs").html("").append("clipPath").attr("id", "c1-clip")
    .append("rect").attr("id", "c1-clip-rect")
      .attr("x", 0).attr("y", -d.M.top)
      .attr("width", Math.max(0, xSc(MAX_YEAR)))
      .attr("height", d.H);

  // Grid
  g.append("g").attr("class", "grid")
    .call(d3.axisLeft(tasSc).ticks(5).tickSize(-d.iW).tickFormat(""))
    .selectAll(".domain, line").attr("stroke", "#1a2332");

  // Axes
  g.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${d.iH})`)
    .call(d3.axisBottom(xSc).ticks(8).tickFormat(d3.format("d")));

  g.append("g").attr("class", "axis")
    .call(d3.axisLeft(aodSc).ticks(5).tickFormat(d3.format(".3f")));

  const axisR = g.append("g").attr("class", "axis")
    .attr("transform", `translate(${d.iW},0)`)
    .call(d3.axisRight(tasSc).ticks(5).tickFormat(v => `${v > 0 ? "+" : ""}${v.toFixed(2)}°`));
  axisR.selectAll("text").style("fill", C.tas);

  // Axis labels
  g.append("text").attr("x", -d.iH / 2).attr("y", -38)
    .attr("transform", "rotate(-90)").attr("text-anchor", "middle")
    .attr("fill", C.aod).attr("font-size", 10).text("AOD (550 nm)");
  g.append("text")
    .attr("transform", `translate(${d.iW + 48},0) rotate(90)`)
    .attr("x", -d.iH / 2).attr("y", 0)
    .attr("text-anchor", "middle").attr("fill", C.tas).attr("font-size", 10)
    .text("Temp. Anomaly (°C)");

  // Volcanic event lines
  events.filter(e => e.type === "volcano").forEach(ev => {
    const x = xSc(ev.year);
    g.append("line")
      .attr("x1", x).attr("x2", x).attr("y1", 0).attr("y2", d.iH)
      .attr("stroke", C.accent).attr("stroke-width", 1)
      .attr("stroke-dasharray", "3 3").attr("opacity", 0.5);
    g.append("text")
      .attr("x", x + 3).attr("y", 12)
      .attr("font-size", 8).attr("fill", C.accent).attr("opacity", 0.8)
      .text(ev.name.split(" ")[ev.name.includes("Mt.") ? 1 : 0]);
  });

  // Line generators
  const lineAOD = d3.line()
    .x((_, i) => xSc(monthly.time[i]))
    .y(v => aodSc(v))
    .defined(v => v != null);

  const lineTAS = d3.line()
    .x((_, i) => xSc(monthly.time[i]))
    .y(v => tasSc(v))
    .defined(v => v != null);

  g.append("path").datum(aodSmooth)
    .attr("fill", "none").attr("stroke", C.aod)
    .attr("stroke-width", SMOOTH_N > 1 ? 2 : 1).attr("opacity", SMOOTH_N > 1 ? 1 : 0.5)
    .attr("clip-path", "url(#c1-clip)")
    .attr("d", lineAOD);

  g.append("path").datum(tasSmooth)
    .attr("fill", "none").attr("stroke", C.tas)
    .attr("stroke-width", SMOOTH_N > 1 ? 2 : 1).attr("opacity", SMOOTH_N > 1 ? 1 : 0.5)
    .attr("clip-path", "url(#c1-clip)")
    .attr("d", lineTAS);

  // Correlation badge — computed up to MAX_YEAR only
  const cutIdx = d3.bisectRight(monthly.time, MAX_YEAR);
  const r = pearson(monthly.aod.slice(0, cutIdx), monthly.tas_anomaly.slice(0, cutIdx));
  d3.select("#corr-badge")
    .attr("class", `badge ${r >= 0 ? "badge-pos" : "badge-neg"}`)
    .text(`r(AOD, Temp) = ${r.toFixed(3)}`);

  // Hover focus line
  const focus = g.append("g").attr("id", "c1-focus").style("display", "none");
  focus.append("line").attr("class", "focus-line")
    .attr("y1", 0).attr("y2", d.iH)
    .attr("stroke", "#475569").attr("stroke-dasharray", "4 2");

  // Invisible overlay for mouse events
  g.append("rect")
    .attr("width", d.iW).attr("height", d.iH).attr("fill", "transparent")
    .on("mousemove", function (event) {
      const [mx] = d3.pointer(event, this);
      const yr   = Math.min(xSc.invert(mx), MAX_YEAR);
      const idx  = d3.bisectCenter(monthly.time, yr);
      const t    = monthly.time[idx];
      const a    = monthly.aod[idx];
      const ts   = monthly.tas_anomaly[idx];
      focus.style("display", null)
        .select(".focus-line").attr("x1", xSc(t)).attr("x2", xSc(t));
      showTip(
        `<strong>${Math.floor(t)} · Mo.${Math.round((t % 1) * 12) + 1}</strong>
         <div class="row"><span style="color:${C.aod}">AOD</span>
           <span class="val">${a != null ? a.toFixed(4) : "—"}</span></div>
         <div class="row"><span style="color:${C.tas}">Temp. Anom.</span>
           <span class="val">${ts != null ? (ts > 0 ? "+" : "") + ts.toFixed(3) + " °C" : "—"}</span></div>`,
        event
      );
    })
    .on("mouseleave", () => { focus.style("display", "none"); hideTip(); });
}

// ── set max year (no full redraw — just moves the clip rect + updates badge) ──
function setMaxYear(yr) {
  MAX_YEAR = Math.max(1850, Math.min(2014, yr));
  document.getElementById("year-scrub").value  = MAX_YEAR;
  document.getElementById("year-display").textContent = Math.round(MAX_YEAR);

  if (CHART1_XSC) {
    d3.select("#c1-clip-rect").attr("width", Math.max(0, CHART1_XSC(MAX_YEAR)));

    // Refresh Pearson r for the visible window
    const { monthly } = DATA;
    const cutIdx = d3.bisectRight(monthly.time, MAX_YEAR);
    const r = pearson(monthly.aod.slice(0, cutIdx), monthly.tas_anomaly.slice(0, cutIdx));
    d3.select("#corr-badge")
      .attr("class", `badge ${r >= 0 ? "badge-pos" : "badge-neg"}`)
      .text(`r(AOD, Temp) = ${r.toFixed(3)}`);
  }
}

// ── wire smoothing control + time scrubber + play button ─────────────────────
function wireControls() {
  document.getElementById("smooth-sel").addEventListener("change", function () {
    SMOOTH_N = +this.value;
    drawChart1();
  });

  document.getElementById("year-scrub").addEventListener("input", function () {
    if (PLAY_INTERVAL) stopPlay();
    setMaxYear(+this.value);
  });

  document.getElementById("play-btn").addEventListener("click", function () {
    if (PLAY_INTERVAL) {
      stopPlay();
    } else {
      if (MAX_YEAR >= 2014) setMaxYear(1850); // restart from beginning
      this.textContent = "⏸ Pause";
      PLAY_INTERVAL = setInterval(() => {
        setMaxYear(MAX_YEAR + 1);
        if (MAX_YEAR >= 2014) stopPlay();
      }, 40); // ~25 yrs/sec → ~6.5 seconds total
    }
  });
}

function stopPlay() {
  clearInterval(PLAY_INTERVAL);
  PLAY_INTERVAL = null;
  const btn = document.getElementById("play-btn");
  if (btn) btn.textContent = "▶ Play";
}

// ── resize handler ────────────────────────────────────────────────────────────
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(drawChart1, 180);
});

// ── entry point ───────────────────────────────────────────────────────────────
d3.json(DATA_URL).then(data => {
  DATA = data;

  // Update hero stats from real data
  const m   = data.meta;
  const pct = Math.round((m.aod_2000s_mean / m.aod_1850s_mean - 1) * 100);
  const statAod = document.getElementById("stat-aod-pct");
  const statTas = document.getElementById("stat-warming");
  if (statAod) statAod.textContent = `+${pct}%`;
  if (statTas) statTas.textContent = `+${m.warming_total.toFixed(2)}°C`;

  wireControls();
  drawChart1();
}).catch(err => {
  document.querySelector(".chart-wrap").innerHTML =
    `<div style="color:#f87171;font-size:.85rem;padding:20px">
      <strong>data/timeseries.json not found.</strong><br>
      Serve with a local HTTP server (e.g. <code>python -m http.server 8765</code>).<br>
      <em>${err.message}</em></div>`;
});
