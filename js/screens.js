import { navigate } from "./router.js";
import { appState } from "./handiman.js";
import { listenToRequestStatus, calculateETA } from "./handiman.js";

const app = document.getElementById("app");

let map = null;
let clientMarker = null;
let mechanicMarker = null;

function formatServiceLabel(service) {
  const labels = {
    towing: "Towing",
    jumpstart: "Jump Start",
    tire: "Tire Change",
    fuel: "Fuel Delivery"
  };

  return labels[service] || "Roadside Help";
}

function getTrackingStages(currentStatus) {
  const stages = [
    { key: "pending", label: "Requested", meta: "Sent" },
    { key: "assigned", label: "Assigned", meta: "Matched" },
    { key: "en_route", label: "En Route", meta: "Traveling" },
    { key: "completed", label: "Completed", meta: "Closed" }
  ];

  const stageOrder = {
    pending: 0,
    assigned: 1,
    en_route: 2,
    arrived: 2,
    completed: 3
  };

  const activeIndex = stageOrder[currentStatus] ?? 0;

  return stages
    .map((stage, index) => {
      let state = "";

      if (index < activeIndex) {
        state = "is-complete";
      } else if (index === activeIndex) {
        state = "is-active";
      }

      return `
        <div class="progress-step ${state}">
          <div class="progress-dot"></div>
          <span class="progress-label">${stage.label}</span>
          <span class="progress-meta">${stage.meta}</span>
        </div>
      `;
    })
    .join("");
}

function buildMechanicCard(request) {
  if (!request.mechanic) {
    return `
      <div class="mechanic-card">
        <div class="mechanic-head">
          <div class="mechanic-avatar">🧑‍🔧</div>
          <div class="mechanic-meta">
            <span class="mechanic-name">Finding the best match</span>
            <span class="mechanic-role">We’ll show your mechanic details here once assigned.</span>
          </div>
        </div>
      </div>
    `;
  }

  const mechanicName = request.mechanic.name || "Assigned mechanic";
  const vehicle = request.mechanic.vehicle || "Service vehicle";
  const phone = request.mechanic.phone || "Shared once available";

  return `
    <div class="mechanic-card">
      <div class="mechanic-head">
        <div class="mechanic-avatar">🧑‍🔧</div>
        <div class="mechanic-meta">
          <span class="mechanic-name">${mechanicName}</span>
          <span class="mechanic-role">Your roadside professional is now linked to this request.</span>
        </div>
      </div>

      <div class="mechanic-grid">
        <div class="mechanic-field">
          <span class="mechanic-field-label">Vehicle</span>
          <span class="mechanic-field-value">${vehicle}</span>
        </div>

        <div class="mechanic-field">
          <span class="mechanic-field-label">Phone</span>
          <span class="mechanic-field-value">${phone}</span>
        </div>
      </div>
    </div>
  `;
}

/* =========================
   HOME SCREEN
========================= */
export function renderHome() {
  app.innerHTML = `
    <div class="screen">
      <div class="app-card hero-card">
        <div class="hero-copy">
          <span class="eyebrow">Roadside support</span>
          <h1>Help for the road, with an app feel.</h1>
      
        </div>

        <div class="hero-panel">
          <h3>Customer first, stress down</h3>
          

          <div class="hero-stats">
            <div class="hero-stat">
              <span class="stat-value">4</span>
              <span class="stat-label">Services</span>
            </div>
            <div class="hero-stat">
              <span class="stat-value">Live</span>
              <span class="stat-label">Tracking</span>
            </div>
            <div class="hero-stat">
              <span class="stat-value">1 Tap</span>
              <span class="stat-label">Start</span>
            </div>
          </div>
        </div>

        <div class="feature-list">
          <div class="feature-item">
            <div class="feature-icon">📍</div>
            <div class="feature-copy">
              <strong>Share your location quickly</strong>
            </div>
          </div>

          <div class="feature-item">
            <div class="feature-icon">🧰</div>
            <div class="feature-copy">
              <strong>Pick the service you need</strong>
            </div>
          </div>

          <div class="feature-item">
            <div class="feature-icon">🚗</div>
            <div class="feature-copy">
              <strong>Track progress live</strong>
            </div>
          </div>
        </div>

        <div class="button-group">
          <button class="accent" onclick="navigate('location')">Request Help</button>
        </div>
      </div>
    </div>
  `;
}

/* =========================
   LOCATION SCREEN
========================= */
export function renderLocation() {
  app.innerHTML = `
    <div class="screen">
      <div class="app-card">
        <div class="top-nav">
          <button class="ghost" onclick="navigate('home')">Back</button>
        </div>

        <div class="section-copy">
          <span class="eyebrow">Step 1</span>
          <h2>Share your live location</h2>
          <p id="location-status">
            We use your current location to direct the nearest available mechanic to you.
          </p>
        </div>

        <div class="info-panel">
          <div class="info-list">
            <div class="info-item">
              <div class="info-icon">🛰️</div>
              <div class="info-copy">
                <strong>Precise dispatching</strong>
                <p>Your location lets the request land with the right mechanic faster.</p>
              </div>
            </div>

            <div class="info-item">
              <div class="info-icon">🔒</div>
              <div class="info-copy">
                <strong>Used only for your request</strong>
                <p>We only need it to place and track your roadside assistance job.</p>
              </div>
            </div>
          </div>
        </div>

        <div class="button-group">
          <button id="locateBtn" class="primary" onclick="getLocation()">Use My Location</button>
          <button class="secondary" onclick="navigate('home')">Cancel</button>
        </div>
      </div>
    </div>
  `;
}

/* =========================
   SERVICE SCREEN
========================= */
export function renderService() {
  app.innerHTML = `
    <div class="screen">
      <div class="app-card">
        <div class="top-nav">
          <button class="ghost" onclick="navigate('location')">Back</button>
        </div>

        <div class="section-copy">
          <span class="eyebrow">Step 2</span>
          <h2>Select your service</h2>
          <p>Choose the help you need so the request is routed with the right context.</p>
        </div>

        <div class="service-grid">
          <button class="service-option" onclick="selectService('towing')">
            <span class="service-icon">🚗</span>
            <strong>Towing</strong>
            <span>For breakdowns, non-starting vehicles, or relocation.</span>
          </button>

          <button class="service-option" onclick="selectService('jumpstart')">
            <span class="service-icon">🔋</span>
            <strong>Jump Start</strong>
            <span>When the battery is flat and you need power quickly.</span>
          </button>

          <button class="service-option" onclick="selectService('tire')">
            <span class="service-icon">🛞</span>
            <strong>Tire Change</strong>
            <span>Flat tire support to get you safely moving again.</span>
          </button>

          <button class="service-option" onclick="selectService('fuel')">
            <span class="service-icon">⛽</span>
            <strong>Fuel Delivery</strong>
            <span>Emergency fuel brought to your current location.</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

export function selectService(service) {
  appState.serviceType = service;
  navigate("confirm");
}

/* =========================
   CONFIRM SCREEN
========================= */
export function renderConfirm() {
  if (!appState.location) {
    navigate("location");
    return;
  }

  const { lat, lng } = appState.location;
  const mapUrl = `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`;

  app.innerHTML = `
    <div class="screen">
      <div class="app-card">
        <div class="top-nav">
          <button class="ghost" onclick="navigate('service')">Back</button>
        </div>

        <div class="section-copy">
          <span class="eyebrow">Step 3</span>
          <h2>Confirm your request</h2>
          <p>Take one quick look before we send your roadside request out.</p>
        </div>

        <div class="map-preview">
          <iframe
            src="${mapUrl}"
            width="100%"
            height="100%"
            style="border:0;"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade">
          </iframe>
        </div>

        <div class="summary-card">
          <div class="summary-grid">
            <div class="summary-row">
              <span class="summary-label">Service</span>
              <span class="summary-value">${formatServiceLabel(appState.serviceType)}</span>
            </div>

            <div class="summary-row">
              <span class="summary-label">Coordinates</span>
              <span class="summary-value">${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
            </div>
          </div>
        </div>

        <div class="button-group">
          <button class="primary" onclick="submitRequest()">Confirm Request</button>
          <button class="secondary" onclick="navigate('service')">Choose Another Service</button>
        </div>

        <p id="confirm-status" class="muted-note">
          Your request will be sent as soon as you confirm.
        </p>
      </div>
    </div>
  `;
}

window.selectService = selectService;

/* =========================
   REQUEST SUBMITTED SCREEN
========================= */
export function renderSubmitted() {
  const requestId = appState.currentRequestId;

  map = null;
  clientMarker = null;
  mechanicMarker = null;

  app.innerHTML = `
    <div class="screen tracking-screen">
      <div class="tracking-topbar">
        <div class="topbar-copy">
          <span class="eyebrow">Live request</span>
          <h2>Mechanic progress</h2>
          <p>Track your request in real time while help is on the way.</p>
        </div>
      </div>

      <div class="map-shell">
        <div id="map" class="map-container"></div>
      </div>

      <div class="status-card">
        <span id="status-pill" class="status-pill">Waiting for mechanic</span>
        <p id="status-summary" class="status-summary">
          We are looking for the best mechanic near your current location.
        </p>

        <div class="eta-row">
          <div class="mini-stat">
            <span class="mini-stat-label">ETA</span>
            <span id="eta-time" class="mini-stat-value">Calculating…</span>
          </div>

          <div class="mini-stat">
            <span class="mini-stat-label">Distance</span>
            <span id="eta-distance" class="mini-stat-value">--</span>
          </div>

          <div class="mini-stat">
            <span class="mini-stat-label">Status</span>
            <span id="eta-status" class="mini-stat-value">Pending</span>
          </div>
        </div>
      </div>

      <div class="request-id">
        <p>Request ID</p>
        <div class="mono">${requestId || "Pending assignment"}</div>
      </div>

      <div class="tracking-details">
        <div class="detail-row">
          <span class="detail-key">Service</span>
          <span class="detail-value">${formatServiceLabel(appState.serviceType)}</span>
        </div>

        <div id="progress-strip" class="progress-strip">
          ${getTrackingStages("pending")}
        </div>

        <div class="detail-row">
          <span class="detail-key">Customer location</span>
          <span class="detail-value">
            ${appState.location ? `${appState.location.lat.toFixed(4)}, ${appState.location.lng.toFixed(4)}` : "--"}
          </span>
        </div>

        <div id="mechanic-card-slot">
          ${buildMechanicCard({ mechanic: null })}
        </div>

        <p id="live-status" class="muted-note">
          We are looking for the best mechanic near your current location.
        </p>
      </div>

      <div class="button-group">
        <button class="ghost" onclick="copyRequestId()">Copy Request ID</button>
        <button class="secondary" onclick="navigate('home')">Back To Home</button>
      </div>
    </div>
  `;

  listenToRequestStatus();
}

export function renderLiveStatus(request) {
  const statusEl = document.getElementById("live-status");
  const pillEl = document.getElementById("status-pill");
  const statusCardEl = document.querySelector(".status-card");
  const summaryEl = document.getElementById("status-summary");
  const etaTimeEl = document.getElementById("eta-time");
  const etaDistEl = document.getElementById("eta-distance");
  const etaStatusEl = document.getElementById("eta-status");
  const progressStripEl = document.getElementById("progress-strip");
  const mechanicCardSlotEl = document.getElementById("mechanic-card-slot");

  if (
    !statusEl ||
    !pillEl ||
    !statusCardEl ||
    !summaryEl ||
    !etaTimeEl ||
    !etaDistEl ||
    !etaStatusEl ||
    !progressStripEl ||
    !mechanicCardSlotEl
  ) {
    return;
  }

  if (!map && request.location) {
    initMap({
      lat: request.location.lat,
      lng: request.location.lng
    });
  }

  let message = "We are looking for the best mechanic near your current location.";
  let pill = "Waiting for mechanic";
  let compactStatus = "Pending";
  let pillClass = "pending";
  let statusCardClass = "status-pending";
  let summary = "We have your request and are scanning nearby availability.";

  switch (request.status) {
    case "pending":
      message = "We have your request and we’re matching it with an available mechanic.";
      pill = "Request received";
      compactStatus = "Pending";
      pillClass = "pending";
      statusCardClass = "status-pending";
      summary = "Your request is live and waiting for the best nearby mechanic.";
      break;
    case "assigned":
      message = "A mechanic has been assigned and is preparing to head to you.";
      pill = "Mechanic assigned";
      compactStatus = "Assigned";
      pillClass = "assigned";
      statusCardClass = "status-assigned";
      summary = "A mechanic has accepted the job and is getting ready to move.";
      break;
    case "en_route":
      message = "Your mechanic is on the move. Follow the ETA and live map below.";
      pill = "Mechanic en route";
      compactStatus = "En route";
      pillClass = "en-route";
      statusCardClass = "status-en-route";
      summary = "Travel is in progress. ETA and distance are updating from the live route.";
      break;
    case "arrived":
      message = "Your mechanic has arrived at your location.";
      pill = "Mechanic arrived";
      compactStatus = "Arrived";
      pillClass = "arrived";
      statusCardClass = "status-arrived";
      summary = "Your mechanic is on site and ready to help.";
      break;
    case "completed":
      message = "This roadside request has been marked as completed.";
      pill = "Job completed";
      compactStatus = "Completed";
      pillClass = "completed";
      statusCardClass = "status-completed";
      summary = "The request has been closed successfully.";
      break;
  }

  pillEl.textContent = pill;
  pillEl.className = `status-pill ${pillClass}`;
  statusCardEl.className = `status-card ${statusCardClass}`;
  summaryEl.textContent = summary;
  statusEl.textContent = message;
  etaStatusEl.textContent = compactStatus;
  progressStripEl.innerHTML = getTrackingStages(request.status);
  mechanicCardSlotEl.innerHTML = buildMechanicCard(request);

  if (request.mechanic?.location) {
    updateMechanicMarker(request.mechanic.location);

    calculateETA(request.mechanic.location, request.location)
      .then(({ distance, duration }) => {
        etaTimeEl.textContent = duration;
        etaDistEl.textContent = distance;
      })
      .catch(() => {
        etaTimeEl.textContent = "Updating…";
        etaDistEl.textContent = "--";
      });
  }
}

window.renderLiveStatus = renderLiveStatus;

function initMap(clientLocation) {
  if (!window.google?.maps) {
    return;
  }

  map = new google.maps.Map(document.getElementById("map"), {
    center: clientLocation,
    zoom: 14,
    disableDefaultUI: true,
    zoomControl: true
  });

  clientMarker = new google.maps.Marker({
    position: clientLocation,
    map,
    label: "You"
  });
}

function updateMechanicMarker(mechanicLocation) {
  if (!map || !window.google?.maps) {
    return;
  }

  if (!mechanicMarker) {
    mechanicMarker = new google.maps.Marker({
      position: mechanicLocation,
      map,
      icon: {
        url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
      },
      label: "Mechanic"
    });
  } else {
    mechanicMarker.setPosition(mechanicLocation);
  }
}

function copyRequestId() {
  if (!appState.currentRequestId || !navigator.clipboard) {
    return;
  }

  navigator.clipboard
    .writeText(appState.currentRequestId)
    .then(() => {
      const statusEl = document.getElementById("live-status");
      if (statusEl) {
        statusEl.textContent = "Request ID copied to your clipboard.";
      }
    })
    .catch(() => {});
}

window.copyRequestId = copyRequestId;
