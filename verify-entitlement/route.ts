// app/api/verify-entitlement/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { userEmail, assetKey, requestingDomain } = await request.json();

    if (!userEmail || !assetKey) {
      return NextResponse.json({ authenticated: false, error: "Missing required identification keys." }, { status: 400 });
    }

    // 🔥 Dynamic runtime import with default export mapping
    const firebaseAdmin = require("firebase-admin");
    const admin = firebaseAdmin.default || firebaseAdmin;

    // 🔑 THE FIX: Deep safety check before ever touching .length
    if (!admin || !admin.apps || !admin.apps.length) {
      try {
        const keyPath = path.resolve(process.cwd(), "secrets/firebase-service-account.json");
        
        if (fs.existsSync(keyPath)) {
          const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
          
          admin.initializeApp({
            credential: admin.credential ? admin.credential.cert(serviceAccount) : {
              getAccessToken: () => Promise.resolve({ access_token: "", expires_in: 0 }),
              cert: serviceAccount
            },
            projectId: serviceAccount.project_id,
            storageBucket: "jubilee-command-center---dev.appspot.com"
          });
          console.log("🚀 Firebase core bound successfully via direct object mapping!");
        } else {
          admin.initializeApp({
            projectId: "jubilee-command-center---dev"
          });
        }
      } catch (error: any) {
        console.warn("⚠️ Firebase Admin initialization logic fallback triggered.");
      }
    }

    // 🔑 THE FIX: Deep safety check for database assignment
    const db = admin && admin.apps && admin.apps.length ? admin.firestore() : null;

    if (!db) {
      return NextResponse.json({ authenticated: false, error: "Database engine offline." }, { status: 503 });
    }

    const entitlementsRef = db.collection("entitlements");
    const snapshot = await entitlementsRef
      .where("userEmail", "==", userEmail.toLowerCase())
      .where("assetKey", "==", assetKey)
      .where("status", "==", "active")
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ authenticated: false, owned: false, message: "No valid active entitlement." }, { status: 200 });
    }

    const entitlementData = snapshot.docs[0].data();

    // Cryptographic Signed URL Generation
    const bucket = admin.storage().bucket("jubilee-command-center---dev.appspot.com");
    const secureFile = bucket.file(`vault/audiobooks/${assetKey}.mp3`);

    let streamUrl = null;
    try {
      const [generatedUrl] = await secureFile.getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + 2 * 60 * 60 * 1000,
      });
      streamUrl = generatedUrl;
    } catch (signatureError) {
      console.error("Failed to generate cryptographic key:", signatureError);
    }

    return NextResponse.json({
      authenticated: true,
      owned: true,
      unlockedAt: entitlementData.purchasedAt,
      invoiceUrl: entitlementData.stripeSessionId,
      assetType: entitlementData.type || "Audiobook",
      streamUrl: streamUrl,
      message: "Access Authorization Granted. Cryptographic key generated.",
    }, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      }
    });

  } catch (error: any) {
    console.error("❌ Entitlement verification crash sequence:", error);
    return NextResponse.json({ authenticated: false, error: "Internal server verification breakdown." }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}