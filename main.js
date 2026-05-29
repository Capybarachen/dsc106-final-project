const GLOBE_SIZE = 700;
const DATA_URL = "data/timeseries.json";
const C = { aod: "#f59e0b", tas: "#fb7185", accent: "#818cf8" };

let DATA = null;
let SMOOTH_N = 12;
let MAX_YEAR = 2014;
let CHART1_XSC = null;
let PLAY_INTERVAL = null;

// ---------- Scroll progress + reveal ----------
function updateProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
  document.getElementById("progress-bar").style.width = `${pct}%`;
}
window.addEventListener("scroll", updateProgress);
updateProgress();

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add("active");
  });
}, { threshold: 0.14 });
document.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));

// ---------- Intro dialogue ----------
const overlay = document.getElementById("intro-overlay");
const leftDialogue = document.getElementById("left-dialogue");
const rightDialogue = document.getElementById("right-dialogue");
const dialogueLines = [
  { side: "left", text: "This planet looks beautiful..." },
  { side: "right", text: "But its atmosphere is changing." },
  { side: "left", text: "Let's investigate the signal in the data." }
];
let dialogueIndex = 0;
let typingTimer = null;

function closeIntro() {
  clearTimeout(typingTimer);
  overlay.style.opacity = 0;
  setTimeout(() => overlay.style.display = "none", 1200);
}

document.getElementById("skip-intro").addEventListener("click", closeIntro);

function typeText(el, text, i = 0) {
  el.textContent = text.slice(0, i);
  if (i <= text.length) {
    typingTimer = setTimeout(() => typeText(el, text, i + 1), 25);
  } else {
    typingTimer = setTimeout(showDialogue, 1300);
  }
}

function showDialogue() {
  if (dialogueIndex >= dialogueLines.length) return closeIntro();
  leftDialogue.textContent = "";
  rightDialogue.textContent = "";
  const current = dialogueLines[dialogueIndex++];
  typeText(current.side === "left" ? leftDialogue : rightDialogue, current.text);
}
setTimeout(showDialogue, 900);

// ---------- Globe ----------
const globeSvg = d3.select("#globe")
  .append("svg")
  .attr("viewBox", `0 0 ${GLOBE_SIZE} ${GLOBE_SIZE}`)
  .attr("aria-hidden", "true");

const projection = d3.geoOrthographic()
  .scale(250)
  .translate([GLOBE_SIZE / 2, GLOBE_SIZE / 2])
  .rotate([20, -15]);
const path = d3.geoPath(projection);

globeSvg.append("circle")
  .attr("cx", GLOBE_SIZE / 2)
  .attr("cy", GLOBE_SIZE / 2)
  .attr("r", 250)
  .attr("fill", "#082f49")
  .style("filter", "drop-shadow(0px 0px 38px rgba(56,189,248,.85))");

globeSvg.append("circle")
  .attr("cx", GLOBE_SIZE / 2)
  .attr("cy", GLOBE_SIZE / 2)
  .attr("r", 252)
  .attr("fill", "none")
  .attr("stroke", "rgba(103,232,249,.55)")
  .attr("stroke-width", 1.2);

let countriesGroup;
d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json").then(world => {
  const countries = topojson.feature(world, world.objects.countries);
  countriesGroup = globeSvg.append("g");
  countriesGroup.selectAll("path")
    .data(countries.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("fill", "#166534")
    .attr("stroke", "rgba(103,232,249,.75)")
    .attr("stroke-width", 0.35);

  function render() { countriesGroup.selectAll("path").attr("d", path); }
  const continentViews = {
  
    Asia: {
      rotate: [-100, -30],
      scale: 380
    },
  
    Europe: {
      rotate: [-15, -50],
      scale: 430
    },
  
    Africa: {
      rotate: [-20, -5],
      scale: 420
    },
  
    NorthAmerica: {
      rotate: [100, -40],
      scale: 380
    },
  
    SouthAmerica: {
      rotate: [60, 10],
      scale: 400
    },
  
    Australia: {
      rotate: [-140, 25],
      scale: 500
    }
  
  };
  
  window.focusContinent = function(name) {
  
    const target = continentViews[name];
  
    if (!target) return;
  
    d3.transition()
  
      .duration(1200)
  
      .ease(d3.easeCubicInOut)
  
      .tween("focus", () => {
  
        const rotateInterp =
          d3.interpolate(
            projection.rotate(),
            target.rotate
          );
  
        return t => {
  
          projection.rotate(
            rotateInterp(t)
          );
  
          render();
  
        };
  
      })
  
      .on("end", () => {
  
        showRegion(name);
  
      });
  
  };
  
  let rotation = projection.rotate();
  let isDragging = false;

  d3.timer(() => {
    if (!isDragging) {
      rotation[1] += (-15 - rotation[1]) * 0.02;
      rotation[0] += 0.035;
      projection.rotate(rotation);
      render();
    }
  });

  globeSvg.call(d3.drag()
    .on("start", () => { isDragging = true; })
    .on("drag", event => {
      rotation = projection.rotate();
      projection.rotate([rotation[0] + event.dx * 0.22, rotation[1] - event.dy * 0.22]);
      render();
    })
    .on("end", () => { rotation = projection.rotate(); isDragging = false; })
  );
});





// ---------- Chart helpers ----------
const tip = d3.select("#tooltip");
function showTip(html, e) {
  tip.html(html).style("opacity", 1)
    .style("left", `${e.clientX + 16}px`)
    .style("top", `${e.clientY - 8}px`);
}
function hideTip() { tip.style("opacity", 0); }

function rolling(arr, n) {
  if (n <= 1) return arr;
  const h = Math.floor(n / 2);
  return arr.map((_, i) => {
    const slice = arr.slice(Math.max(0, i - h), Math.min(arr.length, i + h + 1)).filter(v => v != null);
    return slice.length ? d3.mean(slice) : null;
  });
}

function pearson(xs, ys) {
  const pts = xs.map((x, i) => [x, ys[i]]).filter(p => p[0] != null && p[1] != null);
  if (pts.length < 3) return 0;
  const mx = d3.mean(pts, p => p[0]);
  const my = d3.mean(pts, p => p[1]);
  const num = d3.sum(pts, p => (p[0] - mx) * (p[1] - my));
  const den = Math.sqrt(d3.sum(pts, p => (p[0] - mx) ** 2) * d3.sum(pts, p => (p[1] - my) ** 2));
  return den === 0 ? 0 : num / den;
}

function dims(id, height) {
  const svg = document.getElementById(id);
  const width = svg.clientWidth || 1100;
  const margin = { top: 28, right: 74, bottom: 48, left: 72 };
  return { W: width, H: height, M: margin, iW: width - margin.left - margin.right, iH: height - margin.top - margin.bottom };
}

function updateCorrelationBadge() {
  const { monthly } = DATA;
  const cutIdx = d3.bisectRight(monthly.time, MAX_YEAR);
  const r = pearson(monthly.aod.slice(0, cutIdx), monthly.tas_anomaly.slice(0, cutIdx));
  d3.select("#corr-badge")
    .attr("class", `badge ${r >= 0 ? "badge-pos" : "badge-neg"}`)
    .text(`r(AOD, Temp) = ${r.toFixed(3)}`);
}

function drawChart1() {
  if (!DATA) return;
  const { monthly, events } = DATA;
  const d = dims("chart1", 360);
  const svg = d3.select("#chart1").attr("width", d.W).attr("height", d.H).html("");
  const g = svg.append("g").attr("transform", `translate(${d.M.left},${d.M.top})`);

  const aodSmooth = rolling(monthly.aod, SMOOTH_N);
  const tasSmooth = rolling(monthly.tas_anomaly, SMOOTH_N);
  const xSc = d3.scaleLinear().domain(d3.extent(monthly.time)).range([0, d.iW]);
  CHART1_XSC = xSc;
  const aodSc = d3.scaleLinear().domain(d3.extent(monthly.aod.filter(v => v != null))).nice().range([d.iH, 0]);
  const tasSc = d3.scaleLinear().domain(d3.extent(monthly.tas_anomaly.filter(v => v != null))).nice().range([d.iH, 0]);

  svg.append("defs").append("clipPath").attr("id", "c1-clip")
    .append("rect").attr("id", "c1-clip-rect")
    .attr("x", 0).attr("y", -d.M.top)
    .attr("width", Math.max(0, xSc(MAX_YEAR))).attr("height", d.H);

  g.append("g").attr("class", "grid")
    .call(d3.axisLeft(tasSc).ticks(5).tickSize(-d.iW).tickFormat(""))
    .selectAll(".domain").remove();

  g.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${d.iH})`)
    .call(d3.axisBottom(xSc).ticks(8).tickFormat(d3.format("d")));
  g.append("g").attr("class", "axis")
    .call(d3.axisLeft(aodSc).ticks(5).tickFormat(d3.format(".3f")));
  const axisR = g.append("g").attr("class", "axis")
    .attr("transform", `translate(${d.iW},0)`)
    .call(d3.axisRight(tasSc).ticks(5).tickFormat(v => `${v > 0 ? "+" : ""}${v.toFixed(2)}°`));
  axisR.selectAll("text").style("fill", C.tas);

  g.append("text").attr("x", -d.iH / 2).attr("y", -44).attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle").attr("fill", C.aod).attr("font-size", 11).attr("font-weight", 800).text("AOD (550 nm)");
  g.append("text").attr("transform", `translate(${d.iW + 52},0) rotate(90)`)
    .attr("x", -d.iH / 2).attr("y", 0).attr("text-anchor", "middle")
    .attr("fill", C.tas).attr("font-size", 11).attr("font-weight", 800).text("Temp. anomaly (°C)");

  events.filter(e => e.type === "volcano").forEach(ev => {
    const x = xSc(ev.year);
    g.append("line").attr("x1", x).attr("x2", x).attr("y1", 0).attr("y2", d.iH)
      .attr("stroke", C.accent).attr("stroke-width", 1).attr("stroke-dasharray", "4 4").attr("opacity", .58);
    g.append("text").attr("x", x + 4).attr("y", 12).attr("font-size", 9)
      .attr("fill", C.accent).attr("opacity", .88).text(ev.name.split(" ")[0]);
  });

  const lineAOD = d3.line().x((_, i) => xSc(monthly.time[i])).y(v => aodSc(v)).defined(v => v != null);
  const lineTAS = d3.line().x((_, i) => xSc(monthly.time[i])).y(v => tasSc(v)).defined(v => v != null);

  g.append("path").datum(aodSmooth).attr("fill", "none").attr("stroke", C.aod)
    .attr("stroke-width", SMOOTH_N > 1 ? 2.7 : 1.3).attr("opacity", SMOOTH_N > 1 ? 1 : .55)
    .attr("clip-path", "url(#c1-clip)").attr("d", lineAOD);
  g.append("path").datum(tasSmooth).attr("fill", "none").attr("stroke", C.tas)
    .attr("stroke-width", SMOOTH_N > 1 ? 2.7 : 1.3).attr("opacity", SMOOTH_N > 1 ? 1 : .55)
    .attr("clip-path", "url(#c1-clip)").attr("d", lineTAS);

  updateCorrelationBadge();

  const focus = g.append("g").style("display", "none");
  focus.append("line").attr("y1", 0).attr("y2", d.iH).attr("stroke", "#94a3b8").attr("stroke-dasharray", "4 3");
  g.append("rect")
    .attr("width", d.iW).attr("height", d.iH).attr("fill", "transparent")
    .on("mousemove", function (event) {
      const [mx] = d3.pointer(event, this);
      const yr = Math.min(xSc.invert(mx), MAX_YEAR);
      const idx = d3.bisectCenter(monthly.time, yr);
      const t = monthly.time[idx];
      const a = monthly.aod[idx];
      const ts = monthly.tas_anomaly[idx];
      focus.style("display", null).select("line").attr("x1", xSc(t)).attr("x2", xSc(t));
      showTip(`<strong>${Math.floor(t)} · Month ${Math.round((t % 1) * 12) + 1}</strong>
        <div class="row"><span style="color:${C.aod}">AOD</span><span class="val">${a != null ? a.toFixed(4) : "—"}</span></div>
        <div class="row"><span style="color:${C.tas}">Temp.</span><span class="val">${ts != null ? (ts > 0 ? "+" : "") + ts.toFixed(3) + " °C" : "—"}</span></div>`, event);
    })
    .on("mouseleave", () => { focus.style("display", "none"); hideTip(); });
}

function setMaxYear(yr) {
  MAX_YEAR = Math.max(1850, Math.min(2014, yr));
  document.getElementById("year-scrub").value = MAX_YEAR;
  document.getElementById("year-display").textContent = Math.round(MAX_YEAR);
  if (CHART1_XSC) d3.select("#c1-clip-rect").attr("width", Math.max(0, CHART1_XSC(MAX_YEAR)));
  if (DATA) updateCorrelationBadge();
}

function stopPlay() {
  clearInterval(PLAY_INTERVAL);
  PLAY_INTERVAL = null;
  document.getElementById("play-btn").textContent = "▶ Play";
}

function wireControls() {
  document.getElementById("smooth-sel").addEventListener("change", function () { SMOOTH_N = +this.value; drawChart1(); });
  document.getElementById("year-scrub").addEventListener("input", function () { if (PLAY_INTERVAL) stopPlay(); setMaxYear(+this.value); });
  document.getElementById("play-btn").addEventListener("click", function () {
    if (PLAY_INTERVAL) return stopPlay();
    if (MAX_YEAR >= 2014) setMaxYear(1850);
    this.textContent = "⏸ Pause";
    PLAY_INTERVAL = setInterval(() => { setMaxYear(MAX_YEAR + 1); if (MAX_YEAR >= 2014) stopPlay(); }, 42);
  });
}

let resizeTimer;
window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(drawChart1, 160); });

d3.json(DATA_URL).then(data => {
  DATA = data;
  const m = data.meta;
  const pct = Math.round((m.aod_2000s_mean / m.aod_1850s_mean - 1) * 100);
  document.getElementById("stat-aod-pct").textContent = `${pct > 0 ? "+" : ""}${pct}%`;
  document.getElementById("stat-warming").textContent = `+${m.warming_total.toFixed(2)}°C`;
  wireControls();
  drawChart1();
}).catch(err => {
  document.querySelector(".chart-wrap").innerHTML = `<div style="color:#f87171;font-size:.9rem;padding:20px"><strong>data/timeseries.json not found.</strong><br>Run the folder with a local server, for example: <code>python3 -m http.server 8765</code><br><em>${err.message}</em></div>`;
});

function showRegion(name){

  const regionView =
    document.getElementById("region-view");

  regionView.style.display = "block";

  document.getElementById("region-title")
    .textContent =
      name.toUpperCase();

  document.getElementById("region-heading")
    .textContent =
      name + " Climate Story";
  
  loadRegionMap(name);

  regionView.scrollIntoView({
    behavior: "smooth"
  });

}

async function loadRegionMap(name){

  const svg =
    d3.select("#continent-svg");

  svg.selectAll("*").remove();

  const world =
    await d3.json(
      "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
    );

  const countries =
    topojson.feature(
      world,
      world.objects.countries
    );

  const continentBounds = {

    Asia: [[25, -10], [150, 60]],

    Europe: [[-25, 34], [45, 72]],

    Africa: [[-20, -35], [55, 38]],

    NorthAmerica: [[-170, 5], [-50, 75]],

    SouthAmerica: [[-85, -60], [-30, 15]],

    Australia: [[105, -48], [180, -5]]

  };

  const bounds =
    continentBounds[name];

  const selected =
    countries.features.filter(d => {

      const c =
        d3.geoCentroid(d);

      return (
        c[0] >= bounds[0][0] &&
        c[0] <= bounds[1][0] &&
        c[1] >= bounds[0][1] &&
        c[1] <= bounds[1][1]
      );

    });

  const featureCollection = {
    type: "FeatureCollection",
    features: selected
  };

  const projection =
    d3.geoMercator();

  const path =
    d3.geoPath(projection);

  projection.fitSize(
    [900, 500],
    featureCollection
  );

  svg
    .append("g")
    .selectAll("path")
    .data(selected)
    .join("path")
    .attr("d", path)
    .attr("fill", "#166534")
    .attr("stroke", "#67e8f9")
    .attr("stroke-width", 0.5);

}
