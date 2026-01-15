const STORAGE_KEY = "wswe.restaurants.v1";

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

const addForm = document.getElementById("addForm");
const nameInput = document.getElementById("name");
const weightInput = document.getElementById("weight");
const listEl = document.getElementById("list");
const emptyHint = document.getElementById("emptyHint");

const btnSpin = document.getElementById("btnSpin");
const btnAddSample = document.getElementById("btnAddSample");
const btnReset = document.getElementById("btnReset");
const btnExport = document.getElementById("btnExport");
const fileImport = document.getElementById("fileImport");

const resultText = document.getElementById("resultText");
const resultMeta = document.getElementById("resultMeta");

const dialog = document.getElementById("dialog");
const dialogValue = document.getElementById("dialogValue");
const dialogSubtitle = document.getElementById("dialogSubtitle");
const btnSpinAgain = document.getElementById("btnSpinAgain");

const confettiCanvas = document.getElementById("confetti");
const confettiCtx = confettiCanvas ? confettiCanvas.getContext("2d") : null;

const TWO_PI = Math.PI * 2;
const BASE_START = -Math.PI / 2; // top

const PALETTE = [
  "#8b5cf6",
  "#22c55e",
  "#06b6d4",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#ec4899",
  "#14b8a6",
  "#a3e635",
  "#f97316",
  "#eab308",
  "#7c3aed",
];

const DEFAULT_RESTAURANTS = [
  { name: "Happy Hands", weight: 0.2 },
  { name: "Blues", weight: 1 },
  { name: "O'Learys", weight: 1 },
  { name: "Food Market", weight: 0.7 },
  { name: "Partymakarna", weight: 0.7 },
  { name: "Grekiska", weight: 0.7 },
  { name: "Peony", weight: 0.2 },
  { name: "Keb", weight: 0.4 },
  { name: "Brödernas", weight: 0.2 },
  { name: "Vi går till Marie", weight: 0.5 },
  { name: "Daisys", weight: 0.1 },
];

let restaurants = loadRestaurants();
let rotation = 0; // radians, increasing spins clockwise in canvas coordinates
let spinning = false;
let lastWinnerId = null;

let confettiRaf = 0;
let confettiStopAt = 0;

function prefersReducedMotion() {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function resizeConfettiCanvas() {
  if (!confettiCanvas || !confettiCtx) return;
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(1, Math.floor(window.innerWidth));
  const h = Math.max(1, Math.floor(window.innerHeight));
  const nextW = Math.floor(w * dpr);
  const nextH = Math.floor(h * dpr);

  if (confettiCanvas.width !== nextW || confettiCanvas.height !== nextH) {
    confettiCanvas.width = nextW;
    confettiCanvas.height = nextH;
  }
  confettiCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function stopConfetti() {
  if (!confettiCanvas || !confettiCtx) return;
  if (confettiRaf) cancelAnimationFrame(confettiRaf);
  confettiRaf = 0;
  confettiStopAt = 0;
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiCanvas.style.display = "none";
}

function burstConfetti({ durationMs = 750, particleCount = 150 } = {}) {
  if (!confettiCanvas || !confettiCtx) return;
  if (prefersReducedMotion()) return;

  stopConfetti();
  resizeConfettiCanvas();
  confettiCanvas.style.display = "block";

  const initialW = window.innerWidth;
  const initialH = window.innerHeight;

  const wheelRect = canvas.getBoundingClientRect();
  const origin = {
    x: wheelRect.left + wheelRect.width / 2,
    y: wheelRect.top + wheelRect.height / 2,
  };

  const colors = [
    "#8b5cf6",
    "#22c55e",
    "#06b6d4",
    "#f59e0b",
    "#ef4444",
    "#3b82f6",
    "#ec4899",
    "#14b8a6",
    "#a3e635",
    "#f97316",
  ];

  const particles = Array.from({ length: particleCount }, () => {
    // Burst outward with a slight upward bias
    const angle = (Math.random() * TWO_PI) - Math.PI / 2;
    const speed = 260 + Math.random() * 560;
    const jitter = 18;

    return {
      x: origin.x + (Math.random() - 0.5) * jitter,
      y: origin.y + (Math.random() - 0.5) * jitter,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      g: 1200 + Math.random() * 700,
      size: 5 + Math.random() * 7,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 12,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 0.95,
    };
  });

  const t0 = performance.now();
  confettiStopAt = t0 + durationMs;

  let last = t0;
  function frame(now) {
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;

    if (!confettiCanvas || !confettiCtx) return;
    if (now >= confettiStopAt) {
      stopConfetti();
      return;
    }

    resizeConfettiCanvas();
    const w = window.innerWidth;
    const h = window.innerHeight;
    confettiCtx.clearRect(0, 0, w, h);

    for (const p of particles) {
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;

      // Air drag so the burst settles quickly
      const drag = Math.pow(0.08, dt);
      p.vx *= drag;
      p.vy *= drag;

      // Fade towards the end
      const remaining = (confettiStopAt - now) / durationMs;
      p.alpha = clamp(remaining * 1.25, 0, 0.95);

      confettiCtx.save();
      confettiCtx.globalAlpha = p.alpha;
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate(p.rot);
      confettiCtx.fillStyle = p.color;
      confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      confettiCtx.restore();
    }

    confettiRaf = requestAnimationFrame(frame);
  }

  confettiRaf = requestAnimationFrame(frame);
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function safeParseNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : NaN;
}

function normalizeRotation(r) {
  const m = r % TWO_PI;
  return m < 0 ? m + TWO_PI : m;
}

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function loadRestaurants() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((r) => ({
        id: typeof r.id === "string" ? r.id : uuid(),
        name: typeof r.name === "string" ? r.name.trim() : "",
        weight: clamp(Number(r.weight) || 0, 0, 1e9),
      }))
      .filter((r) => r.name.length > 0 && r.weight > 0);
  } catch {
    return [];
  }
}

function saveRestaurants() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(restaurants));
}

function totalWeight() {
  return restaurants.reduce((sum, r) => sum + r.weight, 0);
}

function buildSegments() {
  const total = totalWeight();
  if (total <= 0) return [];

  let cursor = 0;
  return restaurants.map((r, index) => {
    const fraction = r.weight / total;
    const angle = fraction * TWO_PI;
    const seg = {
      id: r.id,
      name: r.name,
      weight: r.weight,
      color: PALETTE[index % PALETTE.length],
      start: cursor,
      end: cursor + angle,
      angle,
    };
    cursor += angle;
    return seg;
  });
}

function pickWeighted() {
  const total = totalWeight();
  if (total <= 0) return null;

  const roll = Math.random() * total;
  let acc = 0;
  for (const r of restaurants) {
    acc += r.weight;
    if (roll < acc) return r;
  }
  return restaurants[restaurants.length - 1] ?? null;
}

function currentPointerTheta() {
  // theta measured from BASE_START (top), in [0,2pi)
  // We want the segment-local theta that ends up at pointer (top).
  // Condition: theta + rotation ≡ 0 (mod 2pi) => theta = -rotation (mod 2pi)
  return normalizeRotation(-rotation);
}

function winnerFromRotation() {
  const segments = buildSegments();
  if (segments.length === 0) return null;

  const theta = currentPointerTheta();
  return segments.find((s) => theta >= s.start && theta < s.end) ?? segments[segments.length - 1];
}

function roundTo(n, decimals) {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

function setResult(winnerSeg) {
  if (!winnerSeg) {
    resultText.textContent = "—";
    resultMeta.textContent = "";
    return;
  }

  const total = totalWeight();
  const pct = total > 0 ? (winnerSeg.weight / total) * 100 : 0;

  resultText.textContent = winnerSeg.name;
  resultMeta.textContent = `Weight ${winnerSeg.weight} • ${roundTo(pct, 1)}% chance (relative)`;
}

function setDialog(winnerSeg) {
  if (!winnerSeg) return;
  dialogValue.textContent = winnerSeg.name;

  const total = totalWeight();
  const pct = total > 0 ? (winnerSeg.weight / total) * 100 : 0;
  dialogSubtitle.textContent = `Weight ${winnerSeg.weight} • ${roundTo(pct, 1)}% chance`;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function drawWheel() {
  const dpr = window.devicePixelRatio || 1;

  const rect = canvas.getBoundingClientRect();
  const size = Math.floor(Math.min(rect.width, 700));
  const px = Math.max(360, size);

  if (canvas.width !== Math.floor(px * dpr) || canvas.height !== Math.floor(px * dpr)) {
    canvas.width = Math.floor(px * dpr);
    canvas.height = Math.floor(px * dpr);
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, px, px);

  const cx = px / 2;
  const cy = px / 2;
  const radius = (px / 2) - 14;

  // background ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, TWO_PI);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fill();
  ctx.restore();

  const segments = buildSegments();

  if (segments.length === 0) {
    // empty state
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, TWO_PI);
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "700 18px ui-sans-serif, system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Add restaurants to begin", cx, cy - 8);

    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "14px ui-sans-serif, system-ui";
    ctx.fillText("Weights control slice size", cx, cy + 18);
    ctx.restore();

    return;
  }

  // draw segments
  for (const seg of segments) {
    const start = BASE_START + seg.start + rotation;
    const end = BASE_START + seg.end + rotation;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.92)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // label
    const mid = (start + end) / 2;
    const label = seg.name.length > 18 ? `${seg.name.slice(0, 16)}…` : seg.name;

    ctx.save();
    // Draw text along the radius (from center outward).
    // Flip on the left half so it's not upside down.
    const isLeftHalf = mid > Math.PI / 2 && mid < (3 * Math.PI) / 2;
    const textAngle = isLeftHalf ? mid + Math.PI : mid;

    ctx.translate(cx, cy);
    ctx.rotate(textAngle);

    const inner = radius * 0.52;
    ctx.textAlign = isLeftHalf ? "right" : "left";
    ctx.textBaseline = "middle";
    ctx.font = "700 14px ui-sans-serif, system-ui";

    // text shadow for readability
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillText(label, isLeftHalf ? -inner + 1 : inner + 1, 2);

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillText(label, isLeftHalf ? -inner : inner, 0);
    ctx.restore();
  }

  // rim
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, TWO_PI);
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.restore();
}

function renderList() {
  const segments = buildSegments();

  listEl.innerHTML = "";

  for (const r of restaurants) {
    const seg = segments.find((s) => s.id === r.id);
    const color = seg?.color ?? "rgba(255,255,255,0.5)";

    const row = document.createElement("div");
    row.className = "row";

    const name = document.createElement("div");
    name.className = "name";

    const swatch = document.createElement("div");
    swatch.className = "swatch";
    swatch.style.background = color;

    const nameText = document.createElement("div");
    nameText.className = "name__text";
    nameText.textContent = r.name;
    nameText.title = r.name;

    name.append(swatch, nameText);

    const weightWrap = document.createElement("div");
    weightWrap.className = "weight";

    const weightField = document.createElement("input");
    weightField.type = "number";
    weightField.min = "0.01";
    weightField.step = "0.01";
    weightField.value = String(r.weight);
    weightField.setAttribute("aria-label", `Weight for ${r.name}`);

    weightField.addEventListener("change", () => {
      const w = safeParseNumber(weightField.value);
      if (!Number.isFinite(w) || w <= 0) {
        weightField.value = String(r.weight);
        return;
      }
      r.weight = clamp(w, 0.01, 1e9);
      saveRestaurants();
      renderAll();
    });

    weightWrap.append(weightField);

    const del = document.createElement("button");
    del.className = "icon-btn";
    del.type = "button";
    del.innerHTML = "✕";
    del.setAttribute("aria-label", `Remove ${r.name}`);

    del.addEventListener("click", () => {
      restaurants = restaurants.filter((x) => x.id !== r.id);
      if (lastWinnerId === r.id) lastWinnerId = null;
      saveRestaurants();
      renderAll();
    });

    row.append(name, weightWrap, del);
    listEl.append(row);
  }

  emptyHint.style.display = restaurants.length < 2 ? "block" : "none";

  btnSpin.disabled = spinning || restaurants.length < 2;
}

function renderAll() {
  renderList();
  drawWheel();

  const winner = winnerFromRotation();
  if (!lastWinnerId) setResult(winner);
}

function spin() {
  if (spinning) return;
  if (restaurants.length < 2) return;

  const segments = buildSegments();
  const picked = pickWeighted();
  if (!picked) return;

  const seg = segments.find((s) => s.id === picked.id);
  if (!seg) return;

  spinning = true;
  btnSpin.disabled = true;
  btnSpin.textContent = "…";

  // pick an angle within the winning segment, away from edges a bit
  const margin = Math.min(0.12, seg.angle * 0.15);
  const thetaInSeg = seg.start + margin + Math.random() * Math.max(0, (seg.end - seg.start) - margin * 2);

  const desired = -thetaInSeg; // rotation that aligns theta with pointer (see currentPointerTheta)
  const spins = 4 + Math.floor(Math.random() * 3); // 4..6

  const k = Math.ceil((rotation - desired) / TWO_PI) + spins;
  const target = desired + k * TWO_PI;

  const start = rotation;
  const delta = target - start;

  const durationMs = 4200;
  const t0 = performance.now();

  function tick(now) {
    const t = clamp((now - t0) / durationMs, 0, 1);
    const eased = easeOutCubic(t);
    rotation = start + delta * eased;
    drawWheel();

    if (t < 1) {
      requestAnimationFrame(tick);
      return;
    }

    spinning = false;
    btnSpin.disabled = restaurants.length < 2;
    btnSpin.textContent = "SPIN";

    const winner = winnerFromRotation();
    if (winner) {
      lastWinnerId = winner.id;
      setResult(winner);
      setDialog(winner);
      // Keep this short so it feels like a celebration, not visual noise.
      burstConfetti({ durationMs: 750, particleCount: 150 });
      // NOTE: <dialog>.showModal() puts up a full-page backdrop on a top-layer,
      // which would hide any confetti drawn behind it. Give the confetti a moment
      // to be visible before opening the winner dialog.
      if (typeof dialog.showModal === "function") {
        setTimeout(() => {
          if (!dialog.open) dialog.showModal();
        }, 450);
      }
    }

    renderList();
  }

  requestAnimationFrame(tick);
}

function resetAll() {
  if (!confirm("Reset all restaurants on this device?")) return;
  restaurants = [];
  lastWinnerId = null;
  rotation = 0;
  saveRestaurants();
  setResult(null);
  renderAll();
}

function addSample() {
  const sample = DEFAULT_RESTAURANTS;

  const existingNames = new Set(restaurants.map((r) => r.name.toLowerCase()));
  for (const s of sample) {
    if (existingNames.has(s.name.toLowerCase())) continue;
    restaurants.push({ id: uuid(), name: s.name, weight: s.weight });
  }
  saveRestaurants();
  renderAll();
}

function exportJson() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    restaurants: restaurants.map((r) => ({ name: r.name, weight: r.weight })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "where-should-we-eat.json";
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

async function importJsonFile(file) {
  const text = await file.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    alert("That file isn't valid JSON.");
    return;
  }

  const rawList = Array.isArray(payload?.restaurants) ? payload.restaurants : Array.isArray(payload) ? payload : null;
  if (!rawList) {
    alert("JSON format not recognized. Expected { restaurants: [...] } or an array.");
    return;
  }

  const imported = rawList
    .map((r) => ({
      name: typeof r.name === "string" ? r.name.trim() : "",
      weight: Number(r.weight),
    }))
    .filter((r) => r.name.length > 0 && Number.isFinite(r.weight) && r.weight > 0);

  if (imported.length === 0) {
    alert("No valid restaurants found in that file.");
    return;
  }

  const shouldReplace = confirm(`Import ${imported.length} restaurants?\n\nOK = replace current list\nCancel = merge`);

  const next = shouldReplace ? [] : [...restaurants];
  const names = new Set(next.map((r) => r.name.toLowerCase()));

  for (const r of imported) {
    if (names.has(r.name.toLowerCase())) continue;
    next.push({ id: uuid(), name: r.name, weight: clamp(r.weight, 0.01, 1e9) });
    names.add(r.name.toLowerCase());
  }

  restaurants = next;
  lastWinnerId = null;
  saveRestaurants();
  renderAll();
}

// Events
addForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = nameInput.value.trim();
  const w = safeParseNumber(weightInput.value);

  if (!name) return;
  if (!Number.isFinite(w) || w <= 0) {
    weightInput.focus();
    return;
  }

  restaurants.push({ id: uuid(), name, weight: clamp(w, 0.01, 1e9) });
  saveRestaurants();

  nameInput.value = "";
  nameInput.focus();
  weightInput.value = "1";

  lastWinnerId = null;
  renderAll();
});

btnSpin.addEventListener("click", spin);
canvas.addEventListener("click", () => {
  // clicking the wheel should also spin
  spin();
});

dialog.addEventListener("close", stopConfetti);
dialog.addEventListener("cancel", stopConfetti);

btnReset.addEventListener("click", resetAll);
btnAddSample.addEventListener("click", addSample);
btnExport.addEventListener("click", exportJson);

fileImport.addEventListener("change", async () => {
  const file = fileImport.files?.[0];
  fileImport.value = "";
  if (!file) return;
  await importJsonFile(file);
});

btnSpinAgain.addEventListener("click", () => {
  // dialog closes automatically because it's a form[method=dialog]
  // schedule spin so the close animation isn't jarring
  setTimeout(() => spin(), 50);
});

window.addEventListener("resize", () => drawWheel());

// Seed defaults on first visit (only when there's nothing stored yet)
if (restaurants.length === 0) {
  restaurants = DEFAULT_RESTAURANTS.map((r) => ({ id: uuid(), name: r.name, weight: r.weight }));
  saveRestaurants();
}

// First render
renderAll();
