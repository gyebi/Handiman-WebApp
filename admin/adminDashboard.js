import { db } from "../js/firebase.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const requestList = document.getElementById("request-list");
const requestCount = document.getElementById("request-count");
const requestDetail = document.getElementById("request-detail");
const metricPending = document.getElementById("metric-pending");
const metricAssigned = document.getElementById("metric-assigned");
const metricEnroute = document.getElementById("metric-enroute");
const metricCompleted = document.getElementById("metric-completed");
const filterButtons = Array.from(document.querySelectorAll(".filter-chip"));
const navTabs = Array.from(document.querySelectorAll(".nav-tab"));
const adminViews = Array.from(document.querySelectorAll(".admin-view"));
const mechanicList = document.getElementById("mechanic-list");
const mechanicAvailableCount = document.getElementById("mechanic-available-count");
const mechanicBusyCount = document.getElementById("mechanic-busy-count");
const reportTotalRequests = document.getElementById("report-total-requests");
const reportCompletionRate = document.getElementById("report-completion-rate");
const reportTopService = document.getElementById("report-top-service");
const reportServiceGrid = document.getElementById("report-service-grid");

const mechanicOptions = [
  {
    id: "MECH_001",
    name: "Kwame Mensah",
    phone: "+13323230435",
    vehicle: "Tow Truck"
  },
  {
    id: "MECH_002",
    name: "Ama Boateng",
    phone: "+13323230436",
    vehicle: "Service Van"
  },
  {
    id: "MECH_003",
    name: "Kojo Asante",
    phone: "+13323230437",
    vehicle: "Pickup Support"
  }
];

let activeFilter = "all";
let selectedRequestId = null;
let requestCache = [];
let activeView = "operations";

function formatServiceLabel(service) {
  const labels = {
    towing: "Towing",
    jumpstart: "Jump Start",
    tire: "Tire Change",
    fuel: "Fuel Delivery"
  };

  return labels[service] || "Roadside Service";
}

function formatCoordinates(location) {
  if (!location?.lat || !location?.lng) {
    return "Not available";
  }

  return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
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

function formatTimestamp(timestamp) {
  if (!timestamp?.toDate) {
    return "Pending";
  }

  return timestamp.toDate().toLocaleString();
}

function getRequestsForMechanic(mechanicId) {
  return requestCache.filter((request) => request.mechanic?.id === mechanicId && request.status !== "completed");
}

function setMetrics(requests) {
  const totals = {
    pending: 0,
    assigned: 0,
    en_route: 0,
    completed: 0
  };

  requests.forEach((request) => {
    if (totals[request.status] !== undefined) {
      totals[request.status] += 1;
    }
  });

  metricPending.textContent = String(totals.pending);
  metricAssigned.textContent = String(totals.assigned);
  metricEnroute.textContent = String(totals.en_route);
  metricCompleted.textContent = String(totals.completed);
}

function getFilteredRequests() {
  if (activeFilter === "all") {
    return requestCache;
  }

  return requestCache.filter((request) => request.status === activeFilter);
}

function renderEmptyList(message = "No requests match the current filter.") {
  requestList.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">📭</div>
      <div>
        <h3>Request list is clear</h3>
        <p>${message}</p>
      </div>
    </div>
  `;
}

function renderRequestList() {
  const filteredRequests = getFilteredRequests();
  requestList.innerHTML = "";
  requestCount.textContent = `${filteredRequests.length} request${filteredRequests.length === 1 ? "" : "s"}`;

  if (filteredRequests.length === 0) {
    renderEmptyList();
    return;
  }

  filteredRequests.forEach((request) => {
    const card = document.createElement("article");
    card.className = `request-card ${selectedRequestId === request.id ? "selected" : ""}`;
    card.dataset.id = request.id;
    card.innerHTML = `
      <div class="request-head">
        <div>
          <div class="service-name">${formatServiceLabel(request.serviceType)}</div>
          <p>${request.id}</p>
        </div>
        <span class="status-chip ${getStatusChipClass(request.status)}">${getStatusLabel(request.status)}</span>
      </div>

      <div class="request-meta">
        <div class="meta-card">
          <span class="meta-label">Client</span>
          <span class="meta-value">${request.clientId || "Anonymous session"}</span>
        </div>
        <div class="meta-card">
          <span class="meta-label">Mechanic</span>
          <span class="meta-value">${request.mechanic?.name || "Unassigned"}</span>
        </div>
        <div class="meta-card">
          <span class="meta-label">Location</span>
          <span class="meta-value">${formatCoordinates(request.location)}</span>
        </div>
        <div class="meta-card">
          <span class="meta-label">Created</span>
          <span class="meta-value">${formatTimestamp(request.createdAt)}</span>
        </div>
      </div>
    `;
    requestList.appendChild(card);
  });
}

function renderRequestDetail() {
  const selectedRequest = requestCache.find((request) => request.id === selectedRequestId);

  if (!selectedRequest) {
    requestDetail.className = "empty-state";
    requestDetail.innerHTML = `
      <div class="empty-icon">🧭</div>
      <div>
        <h3>Select a request</h3>
        <p>Choose a request from the queue to review details and use admin actions.</p>
      </div>
    `;
    return;
  }

  requestDetail.className = "detail-card";
  requestDetail.innerHTML = `
    <div class="detail-card">
      <div class="request-head">
        <div>
          <div class="service-name">${formatServiceLabel(selectedRequest.serviceType)}</div>
          <p>${selectedRequest.id}</p>
        </div>
        <span class="status-chip ${getStatusChipClass(selectedRequest.status)}">${getStatusLabel(selectedRequest.status)}</span>
      </div>

      <div class="detail-grid">
        <div class="meta-card">
          <span class="meta-label">Client</span>
          <span class="meta-value">${selectedRequest.clientId || "Anonymous session"}</span>
        </div>
        <div class="meta-card">
          <span class="meta-label">Location</span>
          <span class="meta-value">${formatCoordinates(selectedRequest.location)}</span>
        </div>
        <div class="meta-card">
          <span class="meta-label">Created</span>
          <span class="meta-value">${formatTimestamp(selectedRequest.createdAt)}</span>
        </div>
        <div class="meta-card">
          <span class="meta-label">Assigned</span>
          <span class="meta-value">${formatTimestamp(selectedRequest.assignedAt)}</span>
        </div>
        <div class="meta-card">
          <span class="meta-label">Mechanic</span>
          <span class="meta-value">${selectedRequest.mechanic?.name || "Unassigned"}</span>
        </div>
        <div class="meta-card">
          <span class="meta-label">Phone</span>
          <span class="meta-value">${selectedRequest.mechanic?.phone || "Not available"}</span>
        </div>
      </div>

      <div class="action-card">
        <h3>Assignment</h3>
        <p>Assign or reassign the selected request to a mechanic.</p>
        <div class="action-row">
          <select id="mechanic-select">
            <option value="">Select mechanic</option>
            ${mechanicOptions.map((mechanic) => `
              <option value="${mechanic.id}" ${selectedRequest.mechanic?.id === mechanic.id ? "selected" : ""}>
                ${mechanic.name} · ${mechanic.vehicle}
              </option>
            `).join("")}
          </select>
          <button class="primary" data-action="assign" data-id="${selectedRequest.id}">
            ${selectedRequest.mechanic ? "Reassign Mechanic" : "Assign Mechanic"}
          </button>
        </div>
      </div>

      <div class="action-card">
        <h3>Interventions</h3>
        <p>Use admin actions only when the workflow needs manual help.</p>
        <div class="action-row">
          <button class="secondary" data-action="resolve" data-id="${selectedRequest.id}">Mark Resolved</button>
          <button class="danger" data-action="cancel" data-id="${selectedRequest.id}">Cancel Request</button>
        </div>
      </div>
    </div>
  `;
}

function renderMechanicRoster() {
  const mechanicSummaries = mechanicOptions.map((mechanic) => {
    const jobs = getRequestsForMechanic(mechanic.id);
    const activeJob = jobs[0] || null;

    return {
      mechanic,
      jobCount: jobs.length,
      activeJob
    };
  });

  const availableCount = mechanicSummaries.filter((item) => item.jobCount === 0).length;
  const busyCount = mechanicSummaries.length - availableCount;

  mechanicAvailableCount.textContent = String(availableCount);
  mechanicBusyCount.textContent = String(busyCount);

  mechanicList.innerHTML = mechanicSummaries.map(({ mechanic, jobCount, activeJob }) => `
    <article class="roster-card">
      <div class="roster-card-head">
        <div>
          <div class="roster-name">${mechanic.name}</div>
          <p class="roster-subtitle">${mechanic.vehicle}</p>
        </div>
        <span class="status-chip ${jobCount > 0 ? "assigned" : "pending"}">${jobCount > 0 ? "Busy" : "Available"}</span>
      </div>

      <div class="detail-grid">
        <div class="meta-card">
          <span class="meta-label">Mechanic ID</span>
          <span class="meta-value">${mechanic.id}</span>
        </div>
        <div class="meta-card">
          <span class="meta-label">Phone</span>
          <span class="meta-value">${mechanic.phone}</span>
        </div>
        <div class="meta-card">
          <span class="meta-label">Active Jobs</span>
          <span class="meta-value">${jobCount}</span>
        </div>
        <div class="meta-card">
          <span class="meta-label">Current Status</span>
          <span class="meta-value">${activeJob ? getStatusLabel(activeJob.status) : "Standing by"}</span>
        </div>
      </div>

      <div class="detail-grid">
        <div class="meta-card">
          <span class="meta-label">Current Service</span>
          <span class="meta-value">${activeJob ? formatServiceLabel(activeJob.serviceType) : "No active job"}</span>
        </div>
        <div class="meta-card">
          <span class="meta-label">Client</span>
          <span class="meta-value">${activeJob?.clientId || "Not assigned"}</span>
        </div>
      </div>
    </article>
  `).join("");
}

function renderReports() {
  const totalsByService = requestCache.reduce((accumulator, request) => {
    const key = request.serviceType || "other";
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});

  const totalRequests = requestCache.length;
  const completedRequests = requestCache.filter((request) => request.status === "completed").length;
  const completionRate = totalRequests === 0 ? 0 : Math.round((completedRequests / totalRequests) * 100);
  const topServiceEntry = Object.entries(totalsByService).sort((first, second) => second[1] - first[1])[0];

  reportTotalRequests.textContent = String(totalRequests);
  reportCompletionRate.textContent = `${completionRate}%`;
  reportTopService.textContent = topServiceEntry ? formatServiceLabel(topServiceEntry[0]) : "N/A";

  const services = Object.keys(totalsByService);

  if (services.length === 0) {
    reportServiceGrid.innerHTML = `
      <div class="empty-state">
        <div>
          <h3>No report data yet</h3>
          <p>Create requests in the client app to populate service reporting.</p>
        </div>
      </div>
    `;
    return;
  }

  reportServiceGrid.innerHTML = services.map((serviceKey) => `
    <article class="report-card">
      <div class="report-card-head">
        <div class="report-title">${formatServiceLabel(serviceKey)}</div>
        <span class="status-chip pending">${totalsByService[serviceKey]} jobs</span>
      </div>
      <p class="report-value">Current share of live and historic request volume in this view.</p>
    </article>
  `).join("");
}

function setActiveView(viewName) {
  activeView = viewName;

  navTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === viewName);
  });

  adminViews.forEach((view) => {
    view.classList.toggle("active", view.id === `${viewName}-view`);
  });
}

async function assignMechanic(requestId) {
  const select = document.getElementById("mechanic-select");
  const mechanicId = select?.value;

  if (!mechanicId) {
    return;
  }

  const mechanic = mechanicOptions.find((item) => item.id === mechanicId);
  if (!mechanic) {
    return;
  }

  await updateDoc(doc(db, "service-requests", requestId), {
    status: "assigned",
    mechanic: {
      id: mechanic.id,
      name: mechanic.name,
      phone: mechanic.phone,
      vehicle: mechanic.vehicle,
      location: null
    },
    assignedAt: serverTimestamp()
  });
}

async function cancelRequest(requestId) {
  await updateDoc(doc(db, "service-requests", requestId), {
    status: "completed",
    adminCancelledAt: serverTimestamp(),
    cancelledBy: "admin"
  });
}

async function markResolved(requestId) {
  await updateDoc(doc(db, "service-requests", requestId), {
    status: "completed",
    completedAt: serverTimestamp(),
    resolvedBy: "admin"
  });
}

const requestsQuery = query(collection(db, "service-requests"), orderBy("createdAt", "desc"));

onSnapshot(requestsQuery, (snapshot) => {
  requestCache = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data()
  }));

  setMetrics(requestCache);

  if (selectedRequestId && !requestCache.some((request) => request.id === selectedRequestId)) {
    selectedRequestId = null;
  }

  renderRequestList();
  renderRequestDetail();
  renderMechanicRoster();
  renderReports();
});

navTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const nextView = tab.dataset.view || "operations";
    setActiveView(nextView);
  });
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter || "all";
    filterButtons.forEach((chip) => chip.classList.toggle("active", chip === button));
    renderRequestList();
  });
});

requestList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const card = target.closest(".request-card");
  if (!(card instanceof HTMLElement)) {
    return;
  }

  selectedRequestId = card.dataset.id || null;
  renderRequestList();
  renderRequestDetail();
});

requestDetail.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const action = target.dataset.action;
  const requestId = target.dataset.id;

  if (!action || !requestId) {
    return;
  }

  if (action === "assign") {
    await assignMechanic(requestId);
  }

  if (action === "cancel") {
    await cancelRequest(requestId);
  }

  if (action === "resolve") {
    await markResolved(requestId);
  }
});

setActiveView(activeView);
