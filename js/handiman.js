
import { navigate } from "./router.js";
import { auth } from "./firebase.js";
import { signInAnonymously, onAuthStateChanged } 
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

  const app = document.getElementById("app");


export const appState = {
  user: null,          // firebase user
  location: null,      // { lat, lng }
  serviceType: null,
  currentRequestId: null

};

onAuthStateChanged(auth, (user) => {
  if (user) {
    appState.user = user;
    console.log("✅ Anonymous user signed in:", user.uid);
  } else {
    signInAnonymously(auth)
      .then((result) => {
        appState.user = result.user;
        console.log("✅ Anonymous sign-in successful:", result.user.uid);
      })
      .catch((error) => {
        console.error("❌ Anonymous sign-in failed:", error);
      });
  }
});

console.log("APP ELEMENT:", app);





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

console.log("App starting ...")
navigate("home");