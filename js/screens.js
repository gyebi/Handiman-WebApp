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

        <div class="detail-row">
          <span class="detail-key">Customer location</span>
          <span class="detail-value">
            ${appState.location ? `${appState.location.lat.toFixed(4)}, ${appState.location.lng.toFixed(4)}` : "--"}
          </span>
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
  const etaTimeEl = document.getElementById("eta-time");
  const etaDistEl = document.getElementById("eta-distance");
  const etaStatusEl = document.getElementById("eta-status");

  if (!statusEl || !pillEl || !etaTimeEl || !etaDistEl || !etaStatusEl) {
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

  switch (request.status) {
    case "pending":
      message = "We have your request and we’re matching it with an available mechanic.";
      pill = "Request received";
      compactStatus = "Pending";
      break;
    case "assigned":
      message = "A mechanic has been assigned and is preparing to head to you.";
      pill = "Mechanic assigned";
      compactStatus = "Assigned";
      break;
    case "en_route":
      message = "Your mechanic is on the move. Follow the ETA and live map below.";
      pill = "Mechanic en route";
      compactStatus = "En route";
      break;
    case "arrived":
      message = "Your mechanic has arrived at your location.";
      pill = "Mechanic arrived";
      compactStatus = "Arrived";
      break;
    case "completed":
      message = "This roadside request has been marked as completed.";
      pill = "Job completed";
      compactStatus = "Completed";
      break;
  }

  pillEl.textContent = pill;
  statusEl.textContent = message;
  etaStatusEl.textContent = compactStatus;

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

  navigator.clipboard.writeText(appState.currentRequestId).catch(() => {});
}

window.copyRequestId = copyRequestId;
