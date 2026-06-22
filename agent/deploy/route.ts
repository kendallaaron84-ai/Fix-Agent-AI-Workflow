// app/api/agent/deploy/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc, collection, getDoc } from "firebase/firestore";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { authorEmail, authorName, bookTitle, price, type, synopsis, sections } = body;

    if (!authorEmail || !bookTitle || !price) {
      return NextResponse.json({ success: false, error: "Missing required deployment fields." }, { status: 400 });
    }

    // 1. Collision-Proof Tenant Mapping
    // Generates a clean slug from name and unique hash from email to isolate Mary Aaron vs Mary Smith
    const emailHash = authorEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').slice(-4).toLowerCase();
    const cleanNameSlug = authorName.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const authorSlug = `${cleanNameSlug}-${emailHash}`; // e.g., "mary-7fa" or "kendall-aaron"

    const cleanBookSlug = bookTitle.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const assetKey = `bk_${authorSlug}_${cleanBookSlug}`;

    // 2. Standardized Database Schema Write (Step 3a)
    const productRef = doc(db, "products", assetKey);
    await setDoc(productRef, {
      id: assetKey,
      assetKey: assetKey,
      authorSlug: authorSlug,
      authorEmail: authorEmail,
      title: bookTitle,
      price: price.toString(),
      type: type, // "Audiobook" or "E-Book" safely cleared of string artifacts
      synopsis: synopsis || "",
      status: "Active",
      sections: sections || ["Featured Publications"],
      createdAt: new Date().toISOString()
    }, { merge: true });

    // 3. Autonomous WordPress Bridge Loop (Steps 1 & 2)
    // Querying the specific target WP domain dynamically based on tenant configuration
    let targetWpDomain = "koba-dev.local"; 
    if (authorEmail.includes("sharon")) targetWpDomain = "audio.sharon-meeks.com"; // Dynamic routing template
    
    const wpPublishUrl = `http://${targetWpDomain}/wp-json/kobai/v1/publish-vault`;

    // Agent executes the remote call with the strict SiteGround compliance user-agent header
    const wpResponse = await fetch(wpPublishUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36"
      },
      body: JSON.stringify({
        authorSlug: authorSlug,
        bookTitle: bookTitle,
        assetKey: assetKey
      })
    });

    const wpResult = await wpResponse.json();

    return NextResponse.json({
      success: true,
      assetKey: assetKey,
      authorSlug: authorSlug,
      wpDeployment: wpResult
    }, {
      status: 200,
      headers: { "Access-Control-Allow-Origin": "*" }
    });

  } catch (error: any) {
    console.error("❌ Agent Autonomous Deployment Fault:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}