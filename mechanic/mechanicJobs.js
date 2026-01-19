// mechanicJobs.js
// Purpose: Handle mechanic-specific job lifecycle
// NOTE: Skeleton only — no logic executed yet

import { db } from "../js/firebase.js";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/**
 * Create a mech-job when a service request is accepted
 * (NOT wired yet)
 */
export async function createMechJob(requestId, mechanicId) {
    console.log("🧩 createMechJob CALLED with:", {

    requestId,
    mechanicId
  });
    const jobRef = doc(db, "mech-jobs", requestId);

    try {
  await setDoc(jobRef, {
    requestId,
    mechanicId,
    status: "assigned",
    progress: 33,
    createdAt: serverTimestamp()
  });

  console.log("🧩 Mech-job created:", requestId);
} catch (error) {
  console.error("❌ Mech-job creation failed:", error);
  throw error;
}
}
/**
 * Update mech-job status (assigned → en_route → arrived → completed)
 * (NOT wired yet)
 */
export async function updateMechJobStatus(jobId, status) {
  // TODO: implement later
}

/**
 * Listen for an active mech-job for a mechanic
 * (NOT wired yet)
 */
export function listenToActiveMechJob(mechanicId, callback) {
  // TODO: implement later
}

