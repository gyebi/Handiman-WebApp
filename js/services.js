import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebase.js";

export async function acceptRequest(requestId, mechanicProfile) {
  return await updateDoc(doc(db, "requests", requestId), {
    status: "on_the_way",
    mechanic: {
      name: mechanicProfile.name,
      phone: mechanicProfile.phone,
      vehicle: mechanicProfile.vehicleType,
      photoURL: mechanicProfile.photoURL
    }
  });
}


