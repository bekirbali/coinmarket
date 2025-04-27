import { db, serverTimestamp } from "../../lib/firebase-admin";

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
    await minerRef.update({
      lastActive: serverTimestamp(),
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    // Log the detailed error on the server
    console.error(
      `[API/heartbeat] Error updating lastActive for ${deviceId}:`,
      error
    );

    // Check if the error is because the document doesn't exist (optional, update creates if not merged)
    // Firestore update() fails if the document doesn't exist. We might want set() with merge:true
    // or simply let the /api/mining/status call handle creation.
    // For heartbeat, maybe it's okay if it fails when the doc doesn't exist yet.

    return res
      .status(500)
      .json({ success: false, error: "Internal Server Error" });
  }
}
