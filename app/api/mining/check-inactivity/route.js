import { db, serverTimestamp } from "../../../lib/firebase-admin";
import * as admin from "firebase-admin";

const INACTIVITY_LIMIT_MS = 12 * 60 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Secure the endpoint with a secret stored in environment variables
  const cronSecret = process.env.CRON_SECRET;
  const authorization = req.headers.authorization;

  if (
    !cronSecret ||
    !authorization ||
    authorization !== `Bearer ${cronSecret}`
  ) {
    console.warn("[API/check-inactivity] Unauthorized access attempt.");
    return res.status(401).json({ error: "Unauthorized" });
  }

  console.log("[API/check-inactivity] Starting inactivity check job...");
  const now = Date.now();
  let checkedCount = 0;
  let pausedCount = 0;

  try {
    // Query for miners that are currently supposed to be mining
    const snapshot = await db
      .collection("miners")
      .where("isMining", "==", true)
      .where("isMiningPaused", "==", false)
      .get();

    if (snapshot.empty) {
      console.log("[API/check-inactivity] No active miners found to check.");
      return res.status(200).json({ success: true, checked: 0, paused: 0 });
    }

    const updatePromises = [];
    checkedCount = snapshot.docs.length;
    console.log(
      `[API/check-inactivity] Found ${checkedCount} active miners to check.`
    );

    snapshot.docs.forEach((doc) => {
      const minerData = doc.data();
      const lastActive = minerData.lastActive?.toMillis() || 0;

      if (now - lastActive > INACTIVITY_LIMIT_MS) {
        console.log(
          `[API/check-inactivity] Miner ${doc.id} is inactive. Pausing mining.`
        );
        const minerRef = db.collection("miners").doc(doc.id);
        updatePromises.push(
          minerRef.update({
            isMiningPaused: true,
            // Optional: record the time it was paused by the cron job
            pausedByCronAt: serverTimestamp(),
          })
        );
        pausedCount++;
      }
    });

    // Wait for all updates to complete
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
      console.log(
        `[API/check-inactivity] Successfully paused ${pausedCount} inactive miners.`
      );
    }

    return res
      .status(200)
      .json({ success: true, checked: checkedCount, paused: pausedCount });
  } catch (error) {
    console.error(
      "[API/check-inactivity] Error during inactivity check:",
      error
    );
    return res
      .status(500)
      .json({ success: false, error: "Internal Server Error" });
  }
}
