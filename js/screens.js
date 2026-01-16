import { navigate } from "./router.js";
import { appState } from "./handiman.js";
import { listenToRequestStatus, calculateETA } from "./handiman.js";




const app = document.getElementById("app");

let map = null;
let clientMarker = null;
let mechanicMarker = null;

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
  console.log("Rendered Home Screen");
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
  console.log("Rendered Submitted Screen");
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
        
        <div id="map" style="height: 300px; width: 100%; border-radius: 12px;">
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



export function renderLiveStatus(request) {
  const statusEl = document.getElementById("live-status");

  if (!statusEl) {
    return;
  } else {
        statusEl.textContent = `Status: ${request.status}`;

  }

  // Init map once (client location)
  if (!map && request.location) {
    initMap({
      lat: request.location.lat,
      lng: request.location.lng
    });
  }

  // Update mechanic marker live
  if (request.mechanic?.location) {
    updateMechanicMarker({
      lat: request.mechanic.location.lat,
      lng: request.mechanic.location.lng
    });
  }

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

function initMap(clientLocation) {
  map = new google.maps.Map(document.getElementById("map"), {
    center: clientLocation,
    zoom: 14
  });

  // Client marker
  clientMarker = new google.maps.Marker({
    position: clientLocation,
    map,
    label: "You"
  });
}


function updateMechanicMarker(mechanicLocation) {
  if (!map) return;

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

/*
onSnapshot(requestRef, (snapshot) => {
  const data = snapshot.data();
  renderLiveStatus(data);
});
*/

