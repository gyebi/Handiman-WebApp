import { db } from "../js/firebase.js";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

console.log("🧑‍🔧 Mechanic dashboard live");

const requestsList = document.getElementById("requests-list");

// TEMP mechanic profile (will come from Firestore later)
const mechanicProfile = {
  id: "MECH_001",
  name: "Kwame Mensah",
  phone: "+13323230435",
  vehicleType: "Tow Truck",
  photoURL: ""
};

let gpsWatchId = null;


// 🔔 Listen to pending requests
const q = query(
  collection(db, "service-requests"),
  where("status", "==", "pending")
);

onSnapshot(q, (snapshot) => {
  requestsList.innerHTML = "";

  if (snapshot.empty) {
    requestsList.innerHTML = "<p>No incoming requests</p>";
    return;
  }

  snapshot.forEach((docSnap) => {
    const request = docSnap.data();
    const requestId = docSnap.id;

    const card = document.createElement("div");
    card.className = "request-card";

    card.innerHTML = `
      <div class="info">
        <p class="service">🚗 ${request.serviceType}</p>
        <p class="distance">📍 Client nearby</p>
        <p class="time">⏱ Just now</p>
      </div>

      <div class="actions">
        <button class="accept" data-id="${requestId}">Accept</button>
        <button class="decline" data-id="${requestId}">Decline</button>
      </div>
    `;

    requestsList.appendChild(card);
  });
});

// 🔘 BUTTON HANDLING (EVENT DELEGATION)
requestsList.addEventListener("click", async (e) => {
  const requestId = e.target.dataset.id;

  if (!requestId) return;

  // ✅ ACCEPT
  if (e.target.classList.contains("accept")) {
    await acceptRequest(requestId);
  }

  // ❌ DECLINE (UI-only for now)
  if (e.target.classList.contains("decline")) {
    alert("Request declined");
  }
});

// ✅ ACCEPT REQUEST LOGIC
async function acceptRequest(requestId) {
  try {
    await updateDoc(doc(db, "service-requests", requestId), {
      status: "on_the_way",
      mechanicId: mechanicProfile.id,
      mechanic: {
        name: mechanicProfile.name,
        phone: mechanicProfile.phone,
        vehicle: mechanicProfile.vehicleType,
        photoURL: mechanicProfile.photoURL
      }
    });

    console.log("✅ Request accepted:", requestId);

    startMechanicTracking(requestId);

  } catch (error) {
    console.error("❌ Failed to accept request:", error);
  }
}
/*
// 🚚 START MECHANIC GPS TRACKING
function startMechanicTracking(requestId) {
  if (!navigator.geolocation) {
    console.error("❌ Geolocation not supported");
    return;
  }

  if (gpsWatchId !== null) {
    navigator.geolocation.clearWatch(gpsWatchId);
  }

  gpsWatchId = navigator.geolocation.watchPosition(
    async (position) => {
      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      try {
        await updateDoc(doc(db, "service-requests", requestId), {
          "mechanic.location": location
        });

        console.log("📍 Mechanic location updated:", location);

      } catch (err) {
        console.error("❌ Failed to update mechanic location:", err);
      }
    },
    (error) => {
      console.error("❌ GPS tracking error:", error);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000
    }
  );
}

*/

function startMechanicTracking(requestId) {
  if (!navigator.geolocation) {
    console.error("❌ Geolocation not supported");
    return;
  }

  if (gpsWatchId !== null) {
    navigator.geolocation.clearWatch(gpsWatchId);
  }

  gpsWatchId = navigator.geolocation.watchPosition(
    async (position) => {
      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      try {
        await updateDoc(doc(db, "service-requests", requestId), {
          "mechanic.location": location
        });

        console.log("📍 Mechanic location updated:", location);

      } catch (err) {
        console.error("❌ Failed to update mechanic location:", err);
      }
    },
    (error) => {
      console.error("❌ GPS tracking error:", error);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000
    }
  );
}




/*

navigator.geolocation.watchPosition(
  (pos) => {
    updateDoc(doc(db, "service-requests", requestId), {
      "mechanic.location": {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      }
    });
  },
  (err) => console.error("Mechanic GPS error", err),
  { enableHighAccuracy: true }
);
*/