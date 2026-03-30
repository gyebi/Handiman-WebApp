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
let authReadyResolve;
const authReady = new Promise((resolve) => {
  authReadyResolve = resolve;
});

export const appState = {
  user: null,
  location: null,
  serviceType: null,
  currentRequestId: null,
  currentRequest: null,
  authResolved: false
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    appState.user = user;
    appState.authResolved = true;
    authReadyResolve();
    console.log("✅ Anonymous user signed in:", user.uid);
  } else {
    signInAnonymously(auth)
      .then((result) => {
        appState.user = result.user;
        appState.authResolved = true;
        authReadyResolve();
        console.log("✅ Anonymous sign-in successful:", result.user.uid);
      })
      .catch((error) => {
        appState.authResolved = true;
        authReadyResolve();
        console.error("❌ Anonymous sign-in failed:", error);
      });
  }
});

console.log("APP ELEMENT:", app);

function setElementText(id, message) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = message;
  }
}

export function handleNavigationCleanup(from, to) {
  if (from === "submitted" && to !== "submitted") {
    stopRequestListener();
  }
}

export function getLocation() {
  const status = document.getElementById("location-status");
  const btn = document.getElementById("locateBtn");

  if (!status || !btn) {
    return;
  }

  if (!window.navigator.geolocation) {
    status.textContent = "Geolocation is not supported on this device.";
    return;
  }

  btn.classList.add("loading");
  btn.innerHTML = `<div class="spinner"></div>`;
  status.textContent = "Getting your location…";

  window.navigator.geolocation.getCurrentPosition(
    (position) => {
      appState.location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      btn.classList.remove("loading");
      btn.textContent = "Use My Location";
      navigate("service");
    },
    (error) => {
      btn.classList.remove("loading");
      btn.textContent = "Use My Location";

      switch (error.code) {
        case error.PERMISSION_DENIED:
          status.textContent = "Location permission denied. Please allow location access and try again.";
          break;
        case error.POSITION_UNAVAILABLE:
          status.textContent = "Location unavailable right now. Move to a clearer area and try again.";
          break;
        case error.TIMEOUT:
          status.textContent = "Location request timed out. Please try again.";
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
  const confirmButton = document.querySelector('button[onclick="submitRequest()"]');

  if (confirmButton) {
    confirmButton.classList.add("loading");
    confirmButton.innerHTML = `<div class="spinner"></div>`;
  }

  setElementText("confirm-status", "Preparing your request…");

  await authReady;

  if (!appState.location || !appState.serviceType) {
    console.error("❌ Missing request data:", appState);
    setElementText("confirm-status", "Your request details are incomplete. Please choose the service again.");
    if (confirmButton) {
      confirmButton.classList.remove("loading");
      confirmButton.textContent = "Confirm Request";
    }
    navigate("service");
    return;
  }

  if (!appState.user) {
    console.error("❌ No authenticated user available");
    setElementText("confirm-status", "We could not connect your session. Please try again.");
    if (confirmButton) {
      confirmButton.classList.remove("loading");
      confirmButton.textContent = "Confirm Request";
    }
    return;
  }

  try {
    setElementText("confirm-status", "Sending your request now…");

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
    appState.currentRequest = {
      clientId: appState.user.uid,
      serviceType: appState.serviceType,
      location: {
        lat: appState.location.lat,
        lng: appState.location.lng
      },
      status: "pending"
    };
    navigate("submitted");
  } catch (error) {
    console.error("❌ Firestore write failed:", error);
    setElementText("confirm-status", "We could not submit the request. Please try again.");
    if (confirmButton) {
      confirmButton.classList.remove("loading");
      confirmButton.textContent = "Confirm Request";
    }
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

  unsubscribeRequestListener = onSnapshot(
    requestRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        console.warn("⚠️ Request document no longer exists");
        setElementText("live-status", "Your request could not be found. Please start a new request.");
        return;
      }

      const data = snapshot.data();
      console.log("📡 Live update:", data);
      appState.currentRequest = data;
      renderLiveStatus(data);
    },
    (error) => {
      console.error("❌ Request listener failed:", error);
      setElementText("live-status", "Live tracking is temporarily unavailable. We will reconnect automatically.");
    }
  );
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

export async function calculateETA(mechanicLoc, clientLoc) {
  if (!window.google?.maps?.DistanceMatrixService) {
    throw new Error("Google Maps is not ready");
  }

  const service = new google.maps.DistanceMatrixService();

  return new Promise((resolve, reject) => {
    service.getDistanceMatrix(
      {
        origins: [mechanicLoc],
        destinations: [clientLoc],
        travelMode: "DRIVING"
      },
      (response, status) => {
        if (status !== "OK") {
          reject(new Error(status));
          return;
        }

        const el = response?.rows?.[0]?.elements?.[0];
        if (!el || el.status !== "OK") {
          reject(new Error(el?.status || "No route found"));
          return;
        }

        resolve({
          distance: el.distance.text,
          duration: el.duration.text
        });
      }
    );
  });
}

console.log("App starting ...");

window.addEventListener("DOMContentLoaded", () => {
  console.log("App starting …");
  navigate("home");
});
