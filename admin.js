import { db, auth, HOUSES } from "./firebase-config.js?v=3";
import {
  signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, increment,
  collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const loginScreen = document.getElementById("loginScreen");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");

/* ---------- toast ---------- */
const toastEl = document.getElementById("toast");
let toastTimer = null;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
}

/* ---------- auth ---------- */
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    loginError.textContent = "Login failed — check email and password.";
  }
});

logoutBtn.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginScreen.style.display = "none";
    dashboard.style.display = "block";
    ensureHousesExist();
  } else {
    loginScreen.style.display = "flex";
    dashboard.style.display = "none";
  }
});

/* make sure the 4 house documents exist so increments never fail */
async function ensureHousesExist() {
  for (const id of Object.keys(HOUSES)) {
    const ref = doc(db, "houses", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, { name: HOUSES[id].label, points: 0 });
    }
  }
}

/* ---------- quick score update ---------- */
const quickForm = document.getElementById("quickForm");
quickForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const houseId = document.getElementById("quickHouse").value;
  const points = Number(document.getElementById("quickPoints").value);
  if (!points) { toast("Enter a non-zero point value."); return; }

  await updateDoc(doc(db, "houses", houseId), { points: increment(points) });
  toast(`${points > 0 ? "Added" : "Subtracted"} ${Math.abs(points)} points — ${HOUSES[houseId].label}`);
  quickForm.reset();
});

/* ---------- result entry / announcement ---------- */
const resultForm = document.getElementById("resultForm");
resultForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const studentName = document.getElementById("resStudent").value.trim();
  const cls = document.getElementById("resClass").value.trim();
  const programme = document.getElementById("resProgramme").value.trim();
  const rank = document.getElementById("resRank").value;
  const house = document.getElementById("resHouse").value;
  const pointsRaw = document.getElementById("resPoints").value;
  const points = pointsRaw ? Number(pointsRaw) : 0;

  await addDoc(collection(db, "announcements"), {
    studentName, cls, programme, rank, house, points,
    timestamp: serverTimestamp(),   // fixed creation time — used to order this list
    publishedAt: serverTimestamp()  // "last shown" time — bumped again by Show Again
  });

  if (points) {
    await updateDoc(doc(db, "houses", house), { points: increment(points) });
  }

  toast(`Announced: ${studentName} — ${rank}`);
  resultForm.reset();
});

/* ---------- recent activity feed ---------- */
const activityList = document.getElementById("activityList");
const activityQuery = query(collection(db, "announcements"), orderBy("timestamp", "desc"), limit(10));
onSnapshot(activityQuery, (snap) => {
  if (snap.empty) {
    activityList.innerHTML = `<li class="meta">Nothing yet.</li>`;
    return;
  }
  activityList.innerHTML = "";
  snap.forEach((d) => {
    const a = d.data();
    const info = HOUSES[a.house] || { label: a.house };
    const li = document.createElement("li");
    li.innerHTML = `
      <span>
        <span class="who">${a.studentName || "—"}</span> — ${a.rank || ""}
        <div class="meta">${a.cls || ""} · ${a.programme || ""}${a.points ? ` · +${a.points} pts` : ""}</div>
      </span>
      <span class="activity-actions">
        <span class="house-tag ${a.house}">${info.label}</span>
        <button type="button" class="show-btn" title="Show again on public screen"
          data-id="${d.id}" data-kind="announcements">👁</button>
        <button type="button" class="remove-btn" title="Remove this result"
          data-id="${d.id}" data-house="${a.house}" data-points="${a.points || 0}"
          data-name="${(a.studentName || "this result").replace(/"/g, "&quot;")}">✕</button>
      </span>
    `;
    activityList.appendChild(li);
  });
});

/* removing a result also reverses any points it added, so totals stay correct */
activityList.addEventListener("click", async (e) => {
  const showBtn = e.target.closest(".show-btn");
  if (showBtn) return handleShowAgain(showBtn);

  const btn = e.target.closest(".remove-btn");
  if (!btn) return;

  const { id, house, points, name } = btn.dataset;
  const pointsNum = Number(points);
  const confirmMsg = pointsNum
    ? `Remove "${name}"? This will also subtract ${pointsNum} points from ${HOUSES[house]?.label || house}.`
    : `Remove "${name}"?`;
  if (!window.confirm(confirmMsg)) return;

  btn.disabled = true;
  try {
    await deleteDoc(doc(db, "announcements", id));
    if (pointsNum) {
      await updateDoc(doc(db, "houses", house), { points: increment(-pointsNum) });
    }
    toast(`Removed "${name}"`);
  } catch (err) {
    toast("Couldn't remove — try again.");
    btn.disabled = false;
  }
});

/* shared by both the results list and the thoughts list — bumping
   publishedAt re-triggers the public page's animation without creating
   a duplicate entry */
async function handleShowAgain(btn) {
  const { id, kind } = btn.dataset;
  btn.disabled = true;
  try {
    await updateDoc(doc(db, kind, id), { publishedAt: serverTimestamp() });
    toast("Showing on the public screen…");
  } catch (err) {
    toast("Couldn't show — try again.");
  }
  btn.disabled = false;
}

/* ---------- thoughts / announcements ---------- */
const thoughtForm = document.getElementById("thoughtForm");
thoughtForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const textEl = document.getElementById("thoughtText");
  const text = textEl.value.trim();
  if (!text) return;

  await addDoc(collection(db, "messages"), {
    text,
    createdAt: serverTimestamp(),
    publishedAt: serverTimestamp()
  });

  toast("Published to the public screen");
  thoughtForm.reset();
});

const thoughtsList = document.getElementById("thoughtsList");
const thoughtsQuery = query(collection(db, "messages"), orderBy("createdAt", "desc"), limit(10));
onSnapshot(thoughtsQuery, (snap) => {
  if (snap.empty) {
    thoughtsList.innerHTML = `<li class="meta">Nothing yet.</li>`;
    return;
  }
  thoughtsList.innerHTML = "";
  snap.forEach((d) => {
    const m = d.data();
    const li = document.createElement("li");
    li.innerHTML = `
      <span>
        <div class="meta">${(m.text || "").replace(/</g, "&lt;")}</div>
      </span>
      <span class="activity-actions">
        <button type="button" class="show-btn" title="Show again on public screen"
          data-id="${d.id}" data-kind="messages">👁</button>
        <button type="button" class="remove-btn" title="Remove this message"
          data-id="${d.id}" data-name="this message">✕</button>
      </span>
    `;
    thoughtsList.appendChild(li);
  });
});

thoughtsList.addEventListener("click", async (e) => {
  const showBtn = e.target.closest(".show-btn");
  if (showBtn) return handleShowAgain(showBtn);

  const btn = e.target.closest(".remove-btn");
  if (!btn) return;
  if (!window.confirm("Remove this message?")) return;

  btn.disabled = true;
  try {
    await deleteDoc(doc(db, "messages", btn.dataset.id));
    toast("Removed");
  } catch (err) {
    toast("Couldn't remove — try again.");
    btn.disabled = false;
  }
});
