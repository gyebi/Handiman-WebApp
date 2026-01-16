import { navigate } from "./router.js";
import { appState } from "./handiman.js";





/* =========================
   HOME SCREEN
========================= */
export function renderHome() {
  console.log("Rendered Home Screen");
  app.innerHTML = `
    <div class="screen">
      <div class="app-card">

        <div>
          <h1>Handiman</h1>
          <p>Need help with your car?</p>
        </div>

        <div class="button-group">
          <button class="accent" onclick="navigate('location')">
            Request Help
          </button>
        </div>

      </div>
    </div>
  `;
}



/* =========================
   LOCATION SCREEN
========================= */
export function renderLocation() {
  console.log("Rendered Location Screen");
  app.innerHTML = `
    <div class="screen">
      <div class="app-card">

      <div>
        <h2>Share your location</h2>
        <p id = "location-status">
        We need your location to send help.
        </p>
      </div>

      <div class="button-group">
        <button id = "locateBtn" class="primary" onclick="getLocation()">
        Use my location
        </button>
        
        <button class="secondary" onclick="navigate('home')">
        Back
        </button>
      </div>

      </div>
    </div>
  `;
}




/* =========================
   SERVICE SCREEN
========================= */
export function renderService() {
   console.log("Rendered Service Screen");
  app.innerHTML = `
    <div class="screen">
      <div class="app-card">

        <h2>Select Service</h2>

        <div class="button-group">
          <button class="primary" onclick="selectService('towing')">🚗 Towing</button>
          <button class="primary" onclick="selectService('jumpstart')">🔋 Jump Start</button>
          <button class="primary" onclick="selectService('tire')">🛞 Tire Change</button>
          <button class="primary" onclick="selectService('fuel')">⛽ Fuel Delivery</button>
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
  console.log("Rendered Confirm Screen");

  const { lat, lng } = appState.location;
  const mapUrl = `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`;


  app.innerHTML = `
    <div class="screen">
      <div class="app-card">

      <div>
        <h2>Confirm Request</h2>
        <p>Here is your current location</p>
        </div>

        <div class="map-preview">
          <iframe src="${mapUrl}"
            width="100%"
            height="100%"
            style="border:0;"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade">
          </iframe>
        </div>

        <p><strong>Service:</strong> ${appState.serviceType}</p>

        <div class="button-group">
        <button class="primary" onclick="submitRequest()">Confirm</button>
        <button class="secondary" onclick="navigate('service')">Back</button>
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
  app.innerHTML = `
    <div class="screen">
      <div class="app-card">

        <div>
          <h2>✅ Request Submitted</h2>
          <p>Your request has been received.</p>
          <p>Status: <strong>Pending</strong></p>
        </div>

        <div>
          <h2>📡 Request Status</h2>
          <p id="live-status">🔄 Waiting for updates…</p>
        </div>

             <div class="request-id">
          <p><strong>Request ID</strong></p>
          <p class="mono">${requestId}</p>
        </div>

        <div class="button-group">
          <button class="primary" onclick="navigate('home')">
            Done
          </button>
        </div>

      </div>
    </div>
  `;

  // Start listening AFTER UI renders
  listenToRequestStatus();
}

console.log("Rendered Submitted Screen");

export function renderLiveStatus(request) {
  const statusEl = document.getElementById("live-status");

  if (!statusEl) return;

  let message = "Pending…";

  switch (request.status) {
    case "pending":
      message = "🔄 Waiting for a mechanic";
      break;
    case "assigned":
      message = "🧑‍🔧 Mechanic assigned";
      break;
    case "en_route":
      message = "🚗 Mechanic en route";
      break;
    case "completed":
      message = "✅ Job completed";
      break;
  }

  statusEl.textContent = message;

  if (request.mechanic?.location) {
  calculateETA(
    request.mechanic.location,
    request.location
  ).then(({ distance, duration }) => {
    document.getElementById("live-status").innerHTML = `
      🚗 Mechanic on the way<br>
      ⏱ ETA: <strong>${duration}</strong><br>
      📍 Distance: ${distance}
    `;
  });
}

}


window.renderLiveStatus = renderLiveStatus;