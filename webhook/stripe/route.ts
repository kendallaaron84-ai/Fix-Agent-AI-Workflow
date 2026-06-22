// app/api/webhook/stripe/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export async function POST(request: Request) {
  const payload = await request.text();
  const sig = request.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    if (!sig) throw new Error("Missing stripe-signature header");
    
    event = stripe.webhooks.constructEvent(
      payload,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`❌ Webhook Signature Verification Failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the successful transaction event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    
    const userEmail = session.customer_details?.email || session.metadata?.user_email;
    const assetKey = session.metadata?.koba_asset_key;
    const productType = session.metadata?.koba_product_type || "Audiobook";
    const originDomain = session.metadata?.origin_domain || "koba-dev.local";
    const userPhone = session.customer_details?.phone || ""; 

    if (!userEmail || !assetKey) {
      console.error("❌ Webhook missing critical user identification or asset keys.");
      return NextResponse.json({ received: true, error: "Missing identity metadata." });
    }

    try {
      // 🛠️ FIREBASE ADMIN SDK BOUNDING (Matches verify route resilience)
      const firebaseAdmin = require("firebase-admin");
      const admin = firebaseAdmin.default || firebaseAdmin;

      if (!admin.apps || !admin.apps.length) {
        const keyPath = path.resolve(process.cwd(), "secrets/firebase-service-account.json");
        if (fs.existsSync(keyPath)) {
          const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id,
          });
        } else {
          admin.initializeApp({ projectId: "jubilee-command-center---dev" });
        }
      }

      const db = admin.firestore();
      const entitlementsRef = db.collection("entitlements");
      
      await entitlementsRef.add({
        assetKey: assetKey,
        id: `ent_${Math.random().toString(36).substring(2, 11)}`,
        purchasedAt: new Date().toISOString(),
        status: "active",
        stripeConnectId: session.stripe_account || "",
        stripeSessionId: session.id, 
        type: productType,
        userEmail: userEmail.toLowerCase().trim(),
        userPhone: userPhone.trim(), 
        userId: ""
      });

      console.log(`🎉 Entitlement securely activated for ${userEmail} (${assetKey})`);

    } catch (dbError: any) {
      console.error("❌ Failed to write active entitlement to Firestore:", dbError.message);
      return NextResponse.json({ error: "Database transaction failure." }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}