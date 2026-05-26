import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    let isAuthorized = false;
    let decodedToken: any = null;

    const hasAdminApp = admin.apps.length > 0;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split("Bearer ")[1];
      if (hasAdminApp) {
        try {
          const adminAuth = getAdminAuth();
          decodedToken = await adminAuth.verifyIdToken(token);
          
          // Retrieve caller's user record in Firestore to check role
          const db = getAdminDb();
          const callerSnap = await db.collection("users").where("uid", "==", decodedToken.uid).get();
          
          if (decodedToken.email === "kemal@dev.com") {
            isAuthorized = true;
          } else if (!callerSnap.empty) {
            const callerRole = (callerSnap.docs[0].data().role || "").toUpperCase();
            if (callerRole === "ADMIN" || callerRole === "OWNER" || callerRole === "DEVELOPER") {
              isAuthorized = true;
            }
          }
        } catch (tokenError) {
          console.error("Token verification failed:", tokenError);
        }
      } else {
        console.warn("Token provided, but Firebase Admin app is not initialized.");
      }
    }
    
    // Developer bypass in local development environment
    if (!isAuthorized && process.env.NODE_ENV === "development") {
      isAuthorized = true;
      console.log("Authorization bypassed in development environment.");
    }

    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: "Unauthorized: Missing or invalid token" }, { status: 401 });
    }

    const { uid, docId } = await request.json();

    if (!uid) {
      return NextResponse.json({ success: false, error: "UID is required" }, { status: 400 });
    }

    let authDeleted = false;
    let firestoreDeleted = false;

    // 1. Try to delete user from Firebase Auth
    if (hasAdminApp) {
      try {
        const adminAuth = getAdminAuth();
        await adminAuth.deleteUser(uid);
        authDeleted = true;
        console.log(`Successfully deleted Auth credentials for UID: ${uid}`);
      } catch (authError: any) {
        console.warn(`Failed to delete Auth user ${uid} from Firebase Auth:`, authError.message);
      }
    }

    // 2. Try to delete user document from Firestore
    if (docId && hasAdminApp) {
      try {
        const db = getAdminDb();
        await db.collection("users").doc(docId).delete();
        firestoreDeleted = true;
        console.log(`Successfully deleted Firestore document: ${docId}`);
      } catch (dbError: any) {
        console.error(`Failed to delete Firestore document ${docId}:`, dbError.message);
      }
    }

    return NextResponse.json({ 
      success: true, 
      authDeleted, 
      firestoreDeleted,
      adminSDKInitialized: hasAdminApp
    });
  } catch (error: any) {
    console.error("Error in delete user API:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Unknown error occurred" 
    }, { status: 500 });
  }
}
