import { db, auth, HOUSES } from "./firebase-config.js";
import {
  signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc, setDoc, updateDoc, increment,
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
    timestamp: serverTimestamp()
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
      <span class="house-tag ${a.house}">${info.label}</span>
    `;
    activityList.appendChild(li);
  });
});
