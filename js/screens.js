
/* =========================
   HOME SCREEN
========================= */
function renderHome() {
  app.innerHTML = `
    <div class="screen">
      <div class="app-card">
        <h1>Handiman</h1>
        <p>Need help with your car?</p>
        <button onclick="navigate('location')">
          Request Help
        </button>
      </div>
    </div>
  `;
}


/* =========================
   LOCATION SCREEN
========================= */
function renderLocation() {
  app.innerHTML = `
    <div class="screen">
      <div class="app-card">
        <h2>Share your location</h2>
        <p>We need your location to send help.</p>

        <button onclick="getLocation()">Use my location</button>
        <button class="secondary" onclick="navigate('home')">Back</button>
      </div>
    </div>
  `;
}



function getLocation() {
  appState.location = {
    lat: 0,
    lng: 0
  };

  navigate("service");
}


/* =========================
   SERVICE SCREEN
========================= */
function renderService() {
  app.innerHTML = `
    <div class="screen">
      <div class="app-card">
        <h2>Select Service</h2>

        <button class="service-btn" onclick="selectService('towing')">🚗 Towing</button>
        <button class="service-btn" onclick="selectService('jumpstart')">🔋 Jump Start</button>
        <button class="service-btn" onclick="selectService('tire')">🛞 Tire Change</button>
        <button class="service-btn" onclick="selectService('fuel')">⛽ Fuel Delivery</button>
      </div>
    </div>
  `;
}



function selectService(service) {
  appState.serviceType = service;
  navigate("confirm");
}


/* =========================
   CONFIRM SCREEN
========================= */
function renderConfirm() {
  app.innerHTML = `
    <div class="screen">
      <div class="app-card">
        <h2>Confirm Request</h2>

        <p><strong>Service:</strong> ${appState.serviceType}</p>
        <p><strong>Location:</strong> Captured</p>

        <button onclick="submitRequest()">Confirm</button>
        <button class="secondary" onclick="navigate('service')">Back</button>
      </div>
    </div>
  `;
}



function submitRequest() {
  console.log("REQUEST DATA:", appState);
  alert("Request sent 🚗");
  navigate("home");
}
