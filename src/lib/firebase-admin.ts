import * as admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    let rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "{}";
    // Handle cases where the env value might be wrapped in quotes
    rawKey = rawKey.trim();
    if ((rawKey.startsWith("'") && rawKey.endsWith("'")) || (rawKey.startsWith('"') && rawKey.endsWith('"'))) {
      rawKey = rawKey.slice(1, -1);
    }
    const serviceAccount = JSON.parse(rawKey);
    
    // Fix for private key newlines in env variables
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error("Firebase admin initialization error", error);
  }
}

export const getAdminDb = () => admin.firestore();
export const getAdminMessaging = () => admin.messaging();
export const getAdminAuth = () => admin.auth();
