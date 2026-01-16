
import { navigate } from "./router.js";
import { auth } from "./firebase.js";
import { signInAnonymously, onAuthStateChanged } 
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { collection, addDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { db } from "./firebase.js";

import { doc, onSnapshot } 
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

  import { renderLiveStatus } from "./screens.js";




  const app = document.getElementById("app");
  let unsubscribeRequestListener = null;

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

function getCurrentPositionAsync(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

export function handleNavigationCleanup(from, to) {
  if (from === "submitted" && to !== "submitted") {
    stopRequestListener();
  }
}

export function getLocation() {
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

window.getLocation = getLocation;



export async function submitRequest() {
  console.log("🔥 submitRequest called");

  // Safety check
  if (!appState.user || !appState.location || !appState.serviceType) {
    console.error("❌ Missing data:", appState);
    return;
  }

  try {
    const docRef = await addDoc(
      collection(db, "service-requests"),
      {
        clientId: appState.user.uid,
        serviceType: appState.serviceType,
        location: {
          lat: appState.location.lat,
          lng: appState.location.lng
        },
        status: "pending",
        createdAt: serverTimestamp()
      }
    );

    console.log("✅ Request saved with ID:", docRef.id);
    appState.currentRequestId = docRef.id;



    // Optional UX step
    navigate("submitted");

  } catch (error) {
    console.error("❌ Firestore write failed:", error);
  }
}


window.submitRequest = submitRequest;


export function listenToRequestStatus() {
  const requestId = appState.currentRequestId;

  if (!requestId) {
    console.error("❌ No request ID to listen to");
    return;
  }

  const requestRef = doc(db, "service-requests", requestId);

  console.log("🔄 Listening to request:", requestId);

  // Clean up old listener if any
  if (unsubscribeRequestListener) {
    unsubscribeRequestListener();
  }

  unsubscribeRequestListener = onSnapshot(requestRef, (snapshot) => {
    if (!snapshot.exists()) {
      console.warn("⚠️ Request document no longer exists");
      return;
    }

    const data = snapshot.data();
    console.log("📡 Live update:", data);
    appState.currentRequest = data;

    // Re-render status UI
    renderLiveStatus(data);
  });
}

window.listenToRequestStatus = listenToRequestStatus;

export function stopRequestListener() {
  if (unsubscribeRequestListener) {
    unsubscribeRequestListener();
    unsubscribeRequestListener = null;
    console.log("🛑 Stopped request listener");
  }
}

window.stopRequestListener = stopRequestListener;

// Calculate ETA using Google Maps Distance Matrix API

export async function calculateETA(mechanicLoc, clientLoc) {
  const service = new google.maps.DistanceMatrixService();

  return new Promise((resolve, reject) => {
    service.getDistanceMatrix(
      {
        origins: [mechanicLoc],
        destinations: [clientLoc],
        travelMode: "DRIVING",
      },
      (response, status) => {
        if (status !== "OK") reject(status);

        const el = response.rows[0].elements[0];
        resolve({
          distance: el.distance.text,
          duration: el.duration.text
        });
      }
    );
  });
}


console.log("App starting ...");
//navigate("home");

window.addEventListener("DOMContentLoaded", () => {
  console.log("App starting …");
  navigate("home");
});