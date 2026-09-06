import { db, HOUSES } from "./firebase-config.js";
import {
  collection, onSnapshot, query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ---------- keep the poster's proportions at any screen size ---------- */
const stage = document.getElementById("stage");
function updateScale() {
  stage.style.setProperty("--scale", stage.clientWidth / 1671);
}
updateScale();
window.addEventListener("resize", updateScale);
new ResizeObserver(updateScale).observe(stage);

/* ---------- standings ---------- */
const RANK_LABELS = ["1st", "2nd", "3rd", "4th"];
const row = document.getElementById("houseRow");
const pointsCache = {}; // houseId -> currently displayed points, for count-up animation

function animateNumber(el, from, to) {
  const duration = 700;
  const start = performance.now();
  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(from + (to - from) * eased);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function renderHouses(dataById) {
  const ids = Object.keys(HOUSES);
  const sorted = [...ids].sort((a, b) => (dataById[b]?.points || 0) - (dataById[a]?.points || 0));

  row.innerHTML = "";
  sorted.forEach((id, index) => {
    const info = HOUSES[id];
    const points = dataById[id]?.points || 0;
    const isLeader = index === 0 && points > 0;

    const card = document.createElement("div");
    card.className = `house-card house-${id}${isLeader ? " leader" : ""}`;
    card.innerHTML = `
      <img class="card-frame" src="assets/card-${id}.png" alt="${info.label}">
      <div class="card-text">
        <div class="card-name">${info.label.replace(" House", "")}</div>
        <div class="card-house-label">House</div>
        <div class="card-divider"></div>
        <div class="card-points" id="pts-${id}">${pointsCache[id] ?? 0}</div>
        <div class="card-points-label">Points</div>
        <div class="card-rank">${RANK_LABELS[index] || `${index + 1}th`}</div>
      </div>
    `;
    row.appendChild(card);

    const el = document.getElementById(`pts-${id}`);
    const from = pointsCache[id] ?? 0;
    if (from !== points) animateNumber(el, from, points);
    pointsCache[id] = points;
  });
}

onSnapshot(collection(db, "houses"), (snap) => {
  const dataById = {};
  snap.forEach((d) => (dataById[d.id] = d.data()));
  renderHouses(dataById);
});

/* ---------- announcement overlay ---------- */
const overlay = document.getElementById("announceOverlay");
const elMedal = document.getElementById("announceMedal");
const elName = document.getElementById("announceName");
const elMeta = document.getElementById("announceMeta");
const elHouse = document.getElementById("announceHouse");

function medalFor(rank) {
  const r = (rank || "").toString().toLowerCase();
  if (r.includes("1")) return "🥇";
  if (r.includes("2")) return "🥈";
  if (r.includes("3")) return "🥉";
  return "🎖️";
}

let announceTimer = null;
function showAnnouncement(data) {
  const info = HOUSES[data.house] || { label: data.house, icon: "🏅" };
  elMedal.textContent = medalFor(data.rank);
  elName.textContent = data.studentName || "—";
  elMeta.textContent = `${data.cls || "—"} · ${data.programme || "—"} · ${data.rank || ""}`;
  elHouse.textContent = `${info.icon} ${info.label}`;

  clearTimeout(announceTimer);
  overlay.classList.remove("hide");
  overlay.classList.add("show");

  announceTimer = setTimeout(() => {
    overlay.classList.remove("show");
    overlay.classList.add("hide");
    setTimeout(() => overlay.classList.remove("hide"), 400);
  }, 6000);
}

let firstAnnouncementLoad = true;
let lastAnnouncementId = null;
const annQuery = query(collection(db, "announcements"), orderBy("timestamp", "desc"), limit(1));
onSnapshot(annQuery, (snap) => {
  if (snap.empty) { firstAnnouncementLoad = false; return; }
  const doc = snap.docs[0];
  if (firstAnnouncementLoad) {
    firstAnnouncementLoad = false;
    lastAnnouncementId = doc.id;
    return;
  }
  if (doc.id !== lastAnnouncementId) {
    lastAnnouncementId = doc.id;
    showAnnouncement(doc.data());
  }
});
