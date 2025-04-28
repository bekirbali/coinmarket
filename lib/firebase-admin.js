import * as admin from "firebase-admin";

// Ensure the service account JSON is correctly parsed from the environment variable
const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!serviceAccountString) {
  throw new Error(
    "Firebase service account key not found in environment variables."
  );
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountString);
} catch (e) {
  console.error("Error parsing Firebase service account JSON:", e);
  throw new Error("Could not parse Firebase service account JSON.");
}

// Initialize Firebase Admin SDK only if it hasn't been initialized yet
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin SDK Initialized");
  } catch (error) {
    console.error("Firebase Admin SDK initialization error:", error.stack);
    throw new Error("Could not initialize Firebase Admin SDK.");
  }
}

export const db = admin.firestore();
export const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;
