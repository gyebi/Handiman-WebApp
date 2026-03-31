import { db } from "../js/firebase.js";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { createMechJob } from "./mechanicJobs.js";

const mechanicApp = document.getElementById("mechanic-app");
const headerSubtitle = document.getElementById("header-subtitle");
const availabilityCard = document.getElementById("availability-card");
const availabilityLabel = document.getElementById("availability-label");
const queueCount = document.getElementById("queue-count");
const pendingCount = document.getElementById("pending-count");
const assignedCount = document.getElementById("assigned-count");
const enrouteCount = document.getElementById("enroute-count");
const requestsList = document.getElementById("requests-list");
const activeJobBadge = document.getElementById("active-job-badge");
const focusBanner = document.getElementById("focus-banner");
const progressStrip = document.getElementById("progress-strip");
const activeJobContainer = document.getElementById("active-job-container");

const mechanicProfile = {
  id: "MECH_001",
  name: "Kwame Mensah",
  phone: "+13323230435",
  vehicleType: "Tow Truck",
  photoURL: ""
};

let mechanicHasActiveJob = false;
let activeServiceRequestId = null;
let gpsWatchId = null;

function formatServiceLabel(service) {
  const labels = {
    towing: "Towing",
    jumpstart: "Jump Start",
    tire: "Tire Change",
    fuel: "Fuel Delivery"
  };

  return labels[service] || "Roadside Service";
}

function getStatusChipClass(status) {
  switch (status) {
    case "assigned":
      return "assigned";
    case "en_route":
      return "en-route";
    case "arrived":
      return "arrived";
    case "completed":
      return "completed";
    default:
      return "pending";
  }
}

function getStatusLabel(status) {
  switch (status) {
    case "assigned":
      return "Assigned";
    case "en_route":
      return "En Route";
    case "arrived":
      return "Arrived";
    case "completed":
      return "Completed";
    default:
      return "Pending";
  }
}

function formatCoordinates(location) {
  if (!location?.lat || !location?.lng) {
    return "Not available";
  }

  return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
}

function setAppMode(isBusy) {
  mechanicHasActiveJob = isBusy;

  mechanicApp.classList.toggle("state-active", isBusy);
  mechanicApp.classList.toggle("state-available", !isBusy);
  availabilityCard.classList.toggle("busy", isBusy);
  availabilityLabel.textContent = isBusy ? "On Job" : "Available";
  activeJobBadge.textContent = isBusy ? "In Progress" : "Idle";
  activeJobBadge.className = `count-pill ${isBusy ? "active" : "neutral"}`;
  focusBanner.classList.toggle("hidden", !isBusy);
  progressStrip.classList.toggle("hidden", !isBusy);
  headerSubtitle.textContent = isBusy
    ? "Focused on one customer until the job is complete."
    : "Ready to take the next roadside request.";
}

function updateProgress(status) {
  const steps = Array.from(progressStrip.querySelectorAll(".progress-step"));
  const order = {
    assigned: 0,
    en_route: 1,
    arrived: 2,
    completed: 3
  };
  const currentIndex = order[status] ?? 0;

  steps.forEach((step, index) => {
    step.classList.remove("is-active", "is-complete");
    if (index < currentIndex) {
      step.classList.add("is-complete");
    } else if (index === currentIndex) {
      step.classList.add("is-active");
    }
  });
}

function clearMechanicTracking() {
  if (gpsWatchId !== null) {
    navigator.geolocation.clearWatch(gpsWatchId);
    gpsWatchId = null;
  }
}

function startMechanicTracking(requestId) {
  if (!navigator.geolocation) {
    console.error("❌ Geolocation not supported");
    return;
  }

  clearMechanicTracking();

  gpsWatchId = navigator.geolocation.watchPosition(
    async (pos) => {
      try {
        await updateDoc(doc(db, "service-requests", requestId), {
          "mechanic.location": {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          }
        });
      } catch (error) {
        console.warn("⚠️ Failed to update mechanic location:", error);
      }
    },
    (error) => {
      console.warn("⚠️ GPS issue:", error.message);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 15000
    }
  );
}

function renderEmptyQueue(message = "No incoming requests right now.") {
  requestsList.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">📭</div>
      <h3>Queue is clear</h3>
      <p>${message}</p>
    </div>
  `;
}

function renderEmptyActiveJob() {
  activeJobContainer.className = "empty-state";
  activeJobContainer.innerHTML = `
    <div class="empty-icon">🧰</div>
    <h3>No active assignment</h3>
    <p>Accept a request to move into the live job workspace.</p>
  `;
}

function renderRequestCard(requestId, req) {
  const isOwnedByCurrentMechanic = req.mechanic?.id === mechanicProfile.id;
  const card = document.createElement("article");
  card.className = `request-card ${isOwnedByCurrentMechanic ? "owned" : ""}`;

  let actionButtons = "";

  if (req.status === "pending") {
    actionButtons = mechanicHasActiveJob
      ? `<p class="locked-msg">Finish your active job before accepting another request.</p>`
      : `
        <button class="accept" data-id="${requestId}">Accept</button>
        <button class="decline" data-id="${requestId}">Decline</button>
      `;
  } else if (isOwnedByCurrentMechanic && req.status === "assigned") {
    actionButtons = `<button class="start" data-id="${requestId}">Start Route</button>`;
  } else if (isOwnedByCurrentMechanic && req.status === "en_route") {
    actionButtons = `<button class="arrived" data-id="${requestId}">Mark Arrived</button>`;
  } else if (isOwnedByCurrentMechanic && req.status === "arrived") {
    actionButtons = `<button class="complete" data-id="${requestId}">Complete Job</button>`;
  } else if (req.status !== "pending") {
    actionButtons = `<p class="locked-msg">This request is being handled by another mechanic.</p>`;
  }

  card.innerHTML = `
    <div class="request-head">
      <div>
        <div class="service-name">${formatServiceLabel(req.serviceType)}</div>
        <p>${isOwnedByCurrentMechanic ? "Assigned to you" : "Customer request"}</p>
      </div>
      <span class="status-chip ${getStatusChipClass(req.status)}">${getStatusLabel(req.status)}</span>
    </div>

    <div class="request-meta">
      <div class="meta-card">
        <span class="meta-label">Client</span>
        <span class="meta-value">${req.clientId || "Anonymous session"}</span>
      </div>
      <div class="meta-card">
        <span class="meta-label">Location</span>
        <span class="meta-value">${formatCoordinates(req.location)}</span>
      </div>
    </div>

    <div class="actions">
      ${actionButtons}
    </div>
  `;

  return card;
}

function renderRequests(snapshot) {
  requestsList.innerHTML = "";

  const totals = {
    pending: 0,
    assigned: 0,
    en_route: 0
  };

  if (snapshot.empty) {
    queueCount.textContent = "0";
    pendingCount.textContent = "0";
    assignedCount.textContent = "0";
    enrouteCount.textContent = "0";
    renderEmptyQueue();
    return;
  }

  snapshot.forEach((docSnap) => {
    const req = docSnap.data();
    const requestId = docSnap.id;

    if (req.status === "pending") totals.pending += 1;
    if (req.status === "assigned") totals.assigned += 1;
    if (req.status === "en_route") totals.en_route += 1;

    if (!mechanicHasActiveJob || req.mechanic?.id === mechanicProfile.id) {
      requestsList.appendChild(renderRequestCard(requestId, req));
    }
  });

  queueCount.textContent = String(requestsList.children.length);
  pendingCount.textContent = String(totals.pending);
  assignedCount.textContent = String(totals.assigned);
  enrouteCount.textContent = String(totals.en_route);

  if (requestsList.children.length === 0) {
    renderEmptyQueue("Finish your current assignment to view and accept the next request.");
  }
}

function renderActiveJob(jobId, job) {
  activeServiceRequestId = jobId;
  updateProgress(job.status);
  activeJobContainer.className = "job-stack";
  activeJobContainer.innerHTML = `
    <article class="job-card">
      <div class="request-head">
        <div>
          <div class="service-name">${formatServiceLabel(job.serviceType)}</div>
          <p>${mechanicProfile.name} is currently assigned to this job.</p>
        </div>
        <span class="status-chip ${getStatusChipClass(job.status)}">${getStatusLabel(job.status)}</span>
      </div>

      <div class="job-meta-grid">
        <div class="meta-card">
          <span class="meta-label">Customer</span>
          <span class="meta-value">${job.clientId || "Anonymous session"}</span>
        </div>
        <div class="meta-card">
          <span class="meta-label">Location</span>
          <span class="meta-value">${formatCoordinates(job.location)}</span>
        </div>
        <div class="meta-card">
          <span class="meta-label">Vehicle</span>
          <span class="meta-value">${mechanicProfile.vehicleType}</span>
        </div>
        <div class="meta-card">
          <span class="meta-label">Phone</span>
          <span class="meta-value">${mechanicProfile.phone}</span>
        </div>
      </div>

      <div class="actions">
        ${job.status === "assigned" ? `<button class="start" data-id="${jobId}">Start Route</button>` : ""}
        ${job.status === "en_route" ? `<button class="arrived" data-id="${jobId}">Mark Arrived</button>` : ""}
        ${job.status === "arrived" ? `<button class="complete" data-id="${jobId}">Complete Job</button>` : ""}
      </div>
    </article>
  `;
}

async function acceptRequest(requestId) {
  await updateDoc(doc(db, "service-requests", requestId), {
    status: "assigned",
    mechanic: {
      id: mechanicProfile.id,
      name: mechanicProfile.name,
      phone: mechanicProfile.phone,
      vehicle: mechanicProfile.vehicleType,
      location: null
    },
    assignedAt: serverTimestamp()
  });

  try {
    await createMechJob(requestId, mechanicProfile.id);
  } catch (err) {
    console.warn("⚠️ Mech-job creation failed (non-blocking):", err);
  }
}

async function startEnRoute(requestId) {
  await updateDoc(doc(db, "service-requests", requestId), {
    status: "en_route"
  });

  await updateMechJobStatus(requestId, "en_route", 66);
  startMechanicTracking(requestId);
}

async function markArrived(requestId) {
  await updateDoc(doc(db, "service-requests", requestId), {
    status: "arrived"
  });

  await updateMechJobStatus(requestId, "arrived", 90);
}

async function completeJob(requestId) {
  await updateDoc(doc(db, "service-requests", requestId), {
    status: "completed",
    completedAt: serverTimestamp()
  });

  await updateMechJobStatus(requestId, "completed", 100);
  clearMechanicTracking();
  activeServiceRequestId = null;
  renderEmptyActiveJob();
}

async function declineRequest() {
  console.warn("Decline flow is not wired yet.");
}

async function updateMechJobStatus(requestId, status, progress) {
  try {
    await updateDoc(doc(db, "mech-jobs", requestId), {
      status,
      progress,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.warn("⚠️ Mech-job status sync failed (non-blocking):", err);
  }
}

const requestsQuery = query(
  collection(db, "service-requests"),
  where("status", "in", ["pending", "assigned", "en_route", "arrived"])
);

onSnapshot(requestsQuery, (snapshot) => {
  renderRequests(snapshot);
});

const activeJobQuery = query(
  collection(db, "service-requests"),
  where("mechanic.id", "==", mechanicProfile.id),
  where("status", "in", ["assigned", "en_route", "arrived"])
);

onSnapshot(activeJobQuery, (snapshot) => {
  const hasActiveJob = !snapshot.empty;
  setAppMode(hasActiveJob);

  if (snapshot.empty) {
    activeServiceRequestId = null;
    clearMechanicTracking();
    renderEmptyActiveJob();
    return;
  }

  snapshot.forEach((docSnap) => {
    renderActiveJob(docSnap.id, docSnap.data());
  });
});

requestsList.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const requestId = target.dataset.id;
  if (!requestId) {
    return;
  }

  if (target.classList.contains("accept")) {
    await acceptRequest(requestId);
  }

  if (target.classList.contains("decline")) {
    await declineRequest(requestId);
  }

  if (target.classList.contains("start")) {
    await startEnRoute(requestId);
  }

  if (target.classList.contains("arrived")) {
    await markArrived(requestId);
  }

  if (target.classList.contains("complete")) {
    await completeJob(requestId);
  }
});

activeJobContainer.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const requestId = target.dataset.id || activeServiceRequestId;
  if (!requestId) {
    return;
  }

  if (target.classList.contains("start")) {
    await startEnRoute(requestId);
  }

  if (target.classList.contains("arrived")) {
    await markArrived(requestId);
  }

  if (target.classList.contains("complete")) {
    await completeJob(requestId);
  }
});
