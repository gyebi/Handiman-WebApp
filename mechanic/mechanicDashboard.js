import { db } from "../js/firebase.js";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { createMechJob } from "./mechanicJobs.js";

import {
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";



let mechanicHasActiveJob = false;
const activeJobContainer = document.getElementById("active-job-container");




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
  where("status", "in", ["pending", "assigned", "en_route", "arrived"])
);

onSnapshot(q, (snapshot) => {
    console.log("📡 Pending jobs:", snapshot.docs.length);
  requestsList.innerHTML = "";

  if (snapshot.empty) {
    requestsList.innerHTML = "<p>No incoming requests</p>";
    return;
  }


snapshot.forEach((docSnap) => {
  const req = docSnap.data();
  const requestId = docSnap.id;

  const card = document.createElement("div");
  //card.className = "request-card";

  let actionButtons = "";

  if (req.status === "pending") {
    if (!mechanicHasActiveJob) {
    actionButtons = `
      <button class="accept" data-id="${requestId}">Accept</button>
      <button class="decline" data-id="${requestId}">Decline</button>
    `;
  } else {
    actionButtons = `
      <p class="locked-msg">
        🔒 Finish your active job before accepting another
      </p>
    `;
  }
  }

  if (req.status === "assigned") {
    actionButtons = `
      <button class="start" data-id="${requestId}">Start</button>
    `;
  }

  if (req.status === "en_route") {
    actionButtons = `
      <button class="arrived" data-id="${requestId}">Arrived</button>
    `;
  }

  if (req.status === "arrived") {
    actionButtons = `
      <button class="complete" data-id="${requestId}">Complete</button>
    `;
  }

  card.innerHTML = `
    <div class="info">
      <p>🚗 ${req.serviceType}</p>
      <p>Status: ${req.status}</p>
    </div>

    <div class="actions">
      ${actionButtons}
    </div>
  `;

  requestsList.appendChild(card);
});

});

// 🔘 BUTTON HANDLING (EVENT DELEGATION)
requestsList.addEventListener("click", async (e) => {
  const requestId = e.target.dataset.id;

  if (!requestId) return;

  if (e.target.classList.contains("accept")) {
    await acceptRequest(requestId, mechanicProfile);
  }

  if (e.target.classList.contains("start")) {
    await startEnRoute(requestId);
  }

  if (e.target.classList.contains("arrived")) {
    await markArrived(requestId);
  }

  if (e.target.classList.contains("complete")) {
    await completeJob(requestId);
  }
});



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
  navigator.geolocation.watchPosition((pos) => {
    updateDoc(doc(db, "service-requests", requestId), {
      "mechanic.location": {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      }
    });
  }, 
  (error) => {
    console.warn("⚠️ GPS issue:", error.message);
  },
  {
    enableHighAccuracy: false,
    maximumAge: 5000,
    timeout: 30000
  });
  /*if (!navigator.geolocation) {
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
  */
}



// ✅ ACCEPT REQUEST LOGIC

async function acceptRequest(requestId, mechanicProfile) {
  await updateDoc(doc(db, "service-requests", requestId), {
    status: "assigned",
    mechanic: {
      id: mechanicProfile.id,
      name: mechanicProfile.name,
      phone: mechanicProfile.phone,
      vehicle: mechanicProfile.vehicleType,
      location: null
    },
    assignedAt: serverTimestamp()
  });

  console.log("✅ Request accepted:", requestId);

  // 🔗 WRITE-ONLY BRIDGE (safe)
  try {
    await createMechJob(requestId, mechanicProfile.id);
  } catch (err) {
    console.warn("⚠️ Mech-job creation failed (non-blocking):", err);
  }
}



async function startEnRoute(requestId) {
  await updateDoc(doc(db, "service-requests", requestId), {
    status: "en_route"
  });

    await updateMechJobStatus(requestId, "en_route", 66);


  startMechanicTracking(requestId);
}


async function markArrived(requestId) {
  await updateDoc(doc(db, "service-requests", requestId), {
    status: "arrived"
  });

  // 🔄 sync mech-job
  await updateMechJobStatus(requestId, "arrived", 90);

}


async function completeJob(requestId) {
  await updateDoc(doc(db, "service-requests", requestId), {
    status: "completed",
    completedAt: serverTimestamp()
  });

  activeJobContainer.innerHTML = "";
}




const activeJobQuery = query(
  collection(db, "service-requests"),
  where("mechanic.id", "==", mechanicProfile.id),
  where("status", "in", ["assigned", "en_route", "arrived"])
);

onSnapshot(activeJobQuery, (snapshot) => {
  if (snapshot.empty) return;

  snapshot.forEach((docSnap) => {
    const job = docSnap.data();
    const jobId = docSnap.id;

    renderActiveJob(jobId, job);
  });
});


function renderActiveJob(jobId, job) {
  activeJobContainer.innerHTML = `
    <div class="request-card active">

      <h3>🚗 Active Job</h3>

      <p><strong>Service:</strong> ${job.serviceType || "Service Request"}</p>
      <p><strong>Status:</strong> ${job.status}</p>

      <div class="actions">
        ${job.status === "assigned"
          ? `<button class="start" data-id="${jobId}">Start</button>`
          : ""}

        ${job.status === "en_route"
          ? `<button class="arrived" data-id="${jobId}">Arrived</button>`
          : ""}

        ${job.status === "arrived"
          ? `<button class="complete" data-id="${jobId}">Complete</button>`
          : ""}
      </div>

    </div>
  `;
}


const activeMechJobQuery = query(
  collection(db, "mech-jobs"),
  where("mechanicId", "==", mechanicProfile.id),
  where("status", "in", ["assigned", "en_route", "arrived"])
);

onSnapshot(activeMechJobQuery, (snapshot) => {
  mechanicHasActiveJob = !snapshot.empty;

  console.log(
    mechanicHasActiveJob
      ? "🔒 Mechanic has an active job"
      : "🔓 Mechanic is free"
  );
});


async function updateMechJobStatus(requestId, status, progress) {
  try {
    await updateDoc(doc(db, "mech-jobs", requestId), {
      status,
      progress,
      updatedAt: serverTimestamp()
    });

    console.log("🔄 Mech-job status updated:", status);
  } catch (err) {
    console.warn("⚠️ Mech-job status sync failed (non-blocking):", err);
  }
}


window.startEnRoute = startEnRoute;
window.markArrived = markArrived;
window.completeJob = completeJob;