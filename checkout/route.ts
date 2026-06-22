// app/api/checkout/route.ts
import { NextResponse } from "next/server";
// Ensure you have the stripe library installed: pnpm add stripe
import Stripe from "stripe";

export const dynamic = "force-dynamic";

// Initialize Stripe with your secret key from your environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-04-10", 
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { assetId, title, price, product_type, stripeConnectId, origin_domain } = body;

    if (!assetId || !title || !price) {
      return NextResponse.json({ success: false, error: "Missing required product data." }, { status: 400 });
    }

    // Convert string price (e.g., "$14.99") to Stripe's integer format (1499 cents)
    const cleanPrice = parseFloat(price.replace(/[^0-9.]/g, ''));
    const unitAmount = Math.round(cleanPrice * 100);

    // Build the Stripe Checkout Session
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      mode: "payment",
      // Stripe will automatically prompt the user for their email on the checkout page
      customer_creation: "always", 
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: title,
              description: `Format: ${product_type}`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      // Success and Cancel URLs redirect back to your WordPress site
      success_url: `http://${origin_domain}/bookshelf/?status=success&asset=${assetId}`,
      cancel_url: `http://${origin_domain}/bookshelf/?status=canceled`,
      
      // 🔑 CRITICAL: We embed the asset data invisibly. 
      // When the webhook fires, it reads this metadata to grant Firebase access!
      metadata: {
        assetKey: assetId,
        productType: product_type,
        originDomain: origin_domain,
      },
    };

    // If using Stripe Connect for split payments with authors
    if (stripeConnectId) {
      sessionConfig.payment_intent_data = {
        transfer_data: {
          destination: stripeConnectId,
        },
      };
    }

    const session = await stripe.checkout.sessions.create({
      phone_number_collection: {
        enabled: true, // 📞 Forces Stripe to collect their mobile number during payment
      },
      line_items: [...],
      mode: 'payment',
      success_url: '...',
      cancel_url: '...',
    });

    return NextResponse.json(
      { success: true, url: session.url },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  } catch (error: any) {
    console.error("❌ Stripe Checkout Session Fault:", error.message);
    return NextResponse.json({ success: false, error: "Payment gateway timeout." }, { status: 500 });
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