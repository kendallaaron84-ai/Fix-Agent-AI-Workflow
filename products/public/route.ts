// app/api/products/public/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const authorSlug = searchParams.get("author") || "global";
    // Grab the reader email passed down from the localized WordPress state
    const readerEmail = searchParams.get("email") ? searchParams.get("email")!.trim().toLowerCase() : "";

    // 1. Fetch Active Products for the designated Author
    const productsRef = collection(db, "products");
    
    // 🌟 Clean raw source code updates (No Webpack wrappers)
    let q = query(productsRef, where("status", "==", "active"));
    
    if (authorSlug !== "global") {
      q = query(productsRef, where("authorSlug", "==", authorSlug), where("status", "==", "active"));
    }

    const querySnapshot = await getDocs(q);
    const productsList: any[] = [];
    querySnapshot.forEach((doc) => {
      productsList.push({ id: doc.id, ...doc.data() });
    });

    // 2. Fetch Reader Entitlements dynamically if an email exists
    const entitlementsList: string[] = [];
    if (readerEmail) {
      const entitlementsRef = collection(db, "entitlements");
      const entQuery = query(
        entitlementsRef, 
        where("userEmail", "==", readerEmail), 
        where("status", "==", "active")
      );
      const entSnapshot = await getDocs(entQuery);
      entSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.assetKey) {
          entitlementsList.push(data.assetKey);
        }
      });
    }

    // 3. Return a unified payload that matches your frontend requirements perfectly
    return NextResponse.json({
      success: true,
      products: productsList,
      entitlements: entitlementsList // 🔑 Matches result.entitlements array check exactly!
    }, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS"
      }
    });

  } catch (error: any) {
    console.error("❌ Public Products Retrieval Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}