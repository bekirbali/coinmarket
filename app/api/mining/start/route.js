import { db, serverTimestamp } from "../../../lib/firebase-admin";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { deviceId } = req.body;

  if (!deviceId || typeof deviceId !== "string") {
    return res.status(400).json({ error: "Invalid deviceId" });
  }

  try {
    const minerRef = db.collection("miners").doc(deviceId);

    // Use set with merge: true to handle both creation and update safely
    await minerRef.set(
      {
        isMining: true,
        isMiningPaused: false,
        lastActive: serverTimestamp(), // Update activity time
        lastUpdateTime: serverTimestamp(), // Reset balance calculation timer
        // Ensure createdAt is set only once using set with merge
        createdAt: serverTimestamp(), // Set on first creation
      },
      { merge: true } // Merge to avoid overwriting existing fields like balance
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(
      `[API/mining/start] Error starting mining for ${deviceId}:`,
      error
    );
    return res
      .status(500)
      .json({ success: false, error: "Internal Server Error" });
  }
}
