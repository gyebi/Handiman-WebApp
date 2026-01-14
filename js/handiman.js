const app = document.getElementById("app");

console.log("APP ELEMENT:", app);

const appState = {
  location: null,
  serviceType: null
};



console.log("App starting ...")
navigate("home");

function getLocation() {
  const status = document.getElementById("location-status");
  const btn = document.getElementById("locateBtn");

  if (!navigator.geolocation) {
    status.textContent = "Geolocation is not supported on this device.";
    return;
  }

  // Loading state
  btn.classList.add("loading");
  btn.innerHTML = `<div class="spinner"></div>`;
  status.textContent = "Getting your location…";

  navigator.geolocation.getCurrentPosition(
    (position) => {
      appState.location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      navigate("service");
    },
    (error) => {
      // Reset UI
      btn.classList.remove("loading");
      btn.textContent = "Use my location";

      // Handle errors PROPERLY
      switch (error.code) {
        case error.PERMISSION_DENIED:
          status.textContent = "Location permission denied.";
          break;

        case error.POSITION_UNAVAILABLE:
          status.textContent = "Location unavailable.";
          break;

        case error.TIMEOUT:
          status.textContent = "Location request timed out.";
          break;

        default:
          status.textContent = "Unable to retrieve location.";
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 10000
    }
  );
}
