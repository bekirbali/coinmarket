import { db, serverTimestamp } from "../../../lib/firebase-admin";
import * as admin from "firebase-admin"; // Import admin for FieldValue

// Constants (should match frontend if used there, but server is source of truth)
const INCREMENT = 11.52; // Per 4-hour period
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const INACTIVITY_LIMIT_MS = 12 * 60 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Get deviceId from query parameters
  const { deviceId } = req.query;

  if (!deviceId || typeof deviceId !== "string") {
    return res.status(400).json({ error: "Invalid deviceId" });
  }

  try {
    const minerRef = db.collection("miners").doc(deviceId);
    const now = Date.now(); // Use server time consistently
    const nowTimestamp = admin.firestore.Timestamp.now(); // Firestore Timestamp for comparisons

    let balance = 0;
    let isMining = false;
    let isMiningPaused = false;
    let lastUpdateTime = now; // Default to now if new user
    let lastActive = now; // Default to now if new user
    let needsUpdate = false;
    let updatePayload = {
      lastActive: serverTimestamp(), // Always update lastActive on status check
    };
    let periodsElapsed = 0;
    let totalIncrement = 0;

    const docSnap = await minerRef.get();

    if (!docSnap.exists) {
      // User doesn't exist, create initial document
      console.log(
        `[API/mining/status] Miner ${deviceId} not found, creating...`
      );
      const initialData = {
        balance: 0,
        isMining: false,
        isMiningPaused: false,
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp(),
        lastUpdateTime: serverTimestamp(),
      };
      await minerRef.set(initialData);
      // Set local variables to initial state
      lastUpdateTime = now;
      lastActive = now;
    } else {
      // User exists, get data
      const data = docSnap.data();
      balance = data.balance || 0;
      isMining = data.isMining || false;
      isMiningPaused = data.isMiningPaused || false;
      // Convert Firestore Timestamps to JS milliseconds for calculations
      lastUpdateTime =
        data.lastUpdateTime?.toMillis() || data.createdAt?.toMillis() || now;
      lastActive =
        data.lastActive?.toMillis() || data.createdAt?.toMillis() || now;

      // Check if mining should be paused due to inactivity (redundant if cron is working, but good failsafe)
      if (
        isMining &&
        !isMiningPaused &&
        now - lastActive > INACTIVITY_LIMIT_MS
      ) {
        console.log(
          `[API/mining/status] Miner ${deviceId} detected as inactive during status check. Pausing.`
        );
        isMiningPaused = true;
        updatePayload.isMiningPaused = true;
        needsUpdate = true;
      }
      // Check if mining should be resumed (user became active again)
      else if (
        isMining &&
        isMiningPaused &&
        now - lastActive < INACTIVITY_LIMIT_MS
      ) {
        console.log(
          `[API/mining/status] Miner ${deviceId} detected as active again during status check. Resuming.`
        );
        isMiningPaused = false;
        updatePayload.isMiningPaused = false;
        // Reset lastUpdateTime to prevent earning for inactive period
        updatePayload.lastUpdateTime = serverTimestamp();
        lastUpdateTime = now; // Update local variable too
        needsUpdate = true;
      }

      // Calculate balance increment only if mining is active and not paused
      if (isMining && !isMiningPaused) {
        const timeElapsed = now - lastUpdateTime;
        periodsElapsed = Math.floor(timeElapsed / FOUR_HOURS_MS);

        if (periodsElapsed > 0) {
          console.log(
            `[API/mining/status] Miner ${deviceId} has ${periodsElapsed} periods elapsed.`
          );
          totalIncrement = periodsElapsed * INCREMENT;
          const newBalance = balance + totalIncrement;
          const newLastUpdateTime = admin.firestore.Timestamp.fromMillis(
            lastUpdateTime + periodsElapsed * FOUR_HOURS_MS
          );

          // Add balance and lastUpdateTime to the update payload
          updatePayload.balance =
            admin.firestore.FieldValue.increment(totalIncrement);
          updatePayload.lastUpdateTime = newLastUpdateTime;

          // Update local variables for response
          balance = newBalance;
          lastUpdateTime = newLastUpdateTime.toMillis();
          needsUpdate = true;
        }
      } else {
        console.log(
          `[API/mining/status] Miner ${deviceId} not eligible for balance update (isMining: ${isMining}, isMiningPaused: ${isMiningPaused}).`
        );
      }
    }

    // Perform Firestore update if needed
    if (needsUpdate) {
      console.log(
        `[API/mining/status] Updating Firestore for ${deviceId} with payload:`,
        updatePayload
      );
      await minerRef.update(updatePayload);
    }

    // Return current status
    return res.status(200).json({
      success: true,
      deviceId,
      balance,
      isMining,
      isMiningPaused,
      lastUpdateTime: lastUpdateTime, // Send as millis
      lastActive: now, // Send current server time as last active confirmation
      periodsElapsed, // Info for debugging
      incrementApplied: totalIncrement, // Info for debugging
    });
  } catch (error) {
    console.error(
      `[API/mining/status] Error processing status for ${deviceId}:`,
      error
    );
    return res
      .status(500)
      .json({ success: false, error: "Internal Server Error" });
  }
}
