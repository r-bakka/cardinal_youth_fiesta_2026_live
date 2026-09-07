import { db, HOUSES } from "./firebase-config.js?v=3";
import {
  collection, onSnapshot, query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* keep the poster's proportions at any screen size — sets both a CSS
   custom property (for scaling text) and an explicit pixel height as a
   fallback for any renderer that doesn't honor the `aspect-ratio` CSS
   property (some embedded/TV browsers used on projectors still don't). */
const stage = document.getElementById("stage");
function updateScale() {
  const w = stage.clientWidth;
  stage.style.setProperty("--scale", w / 1671);
  stage.style.height = (w * (941 / 1671)) + "px";
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
        <div class="card-house-label"></div>
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

/* helper: turns a Firestore doc into a "did this actually change" key.
   Keying on id + publishedAt (not just id) means an admin can hit
   "Show Again" on something already on screen and it'll re-trigger,
   even though the document's id hasn't changed. */
function publishKey(docSnap) {
  const data = docSnap.data();
  const ms = data.publishedAt?.toMillis ? data.publishedAt.toMillis() : 0;
  return `${docSnap.id}_${ms}`;
}

/* watches a single-doc "latest" query and calls onChange(data) whenever
   a genuinely new publish happens — skips the initial snapshot on page
   load so refreshing the screen doesn't replay the last thing shown. */
function watchLatest(collectionName, orderField, onChange) {
  let isFirstLoad = true;
  let lastKey = null;
  const q = query(collection(db, collectionName), orderBy(orderField, "desc"), limit(1));
  onSnapshot(q, (snap) => {
    if (snap.empty) { isFirstLoad = false; return; }
    const docSnap = snap.docs[0];
    const key = publishKey(docSnap);
    if (isFirstLoad) {
      isFirstLoad = false;
      lastKey = key;
      return;
    }
    if (key !== lastKey) {
      lastKey = key;
      onChange(docSnap.data());
    }
  });
}

/* ---------- result announcement overlay ---------- */
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

watchLatest("announcements", "publishedAt", showAnnouncement);

/* ---------- thought / message overlay ---------- */
const messageOverlay = document.getElementById("messageOverlay");
const elMessageText = document.getElementById("messageText");

let messageTimer = null;
function showMessage(data) {
  elMessageText.textContent = data.text || "";

  clearTimeout(messageTimer);
  messageOverlay.classList.remove("hide");
  messageOverlay.classList.add("show");

  messageTimer = setTimeout(() => {
    messageOverlay.classList.remove("show");
    messageOverlay.classList.add("hide");
    setTimeout(() => messageOverlay.classList.remove("hide"), 400);
  }, 7000);
}

watchLatest("messages", "publishedAt", showMessage);
