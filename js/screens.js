
/* =========================
   HOME SCREEN
========================= */
function renderHome() {
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
function renderLocation() {
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
        <button class="primary" onclick="getLocation()">
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

        <button class="primary" onclick="submitRequest()">Confirm</button>
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
