"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, updateDoc, onSnapshot } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout"; 
import Link from "next/link"; // 🚀 NEW: Required for routing to the studios
import { Plus, Image as ImageIcon, Settings2, Tag, X, UploadCloud, Save, Edit3, Mic } from "lucide-react"; // 🚀 NEW: Added Edit3 and Mic icons

// Safe database mock fallbacks so the UI displays items even if Firestore is currently empty
const fallbackProducts = [
  {
    id: "prod_duncan_audio",
    assetKey: "asset_duncan_audio_01",
    title: "Duncan the Man Hunter - Unabridged",
    type: "Audiobook",
    price: "$14.99",
    status: "Active",
    stripeConnectId: "",
    wpStudioKey: "",
    vaultPath: "",
    image: null,
  },
  {
    id: "prod_koba_player",
    assetKey: "asset_koba_player_pro",
    title: "KOBA-I Audio Player License",
    type: "Plugin",
    price: "$49.00",
    status: "Active",
    stripeConnectId: "",
    wpStudioKey: "",
    vaultPath: "",
    image: null,
  }
];

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Establish a real-time synchronization stream with Firestore
  useEffect(() => {
    const productsRef = collection(db, "products");
    
    const unsubscribe = onSnapshot(productsRef, (snapshot) => {
      if (!snapshot.empty) {
        const liveProducts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProducts(liveProducts);
      } else {
        // If your cloud collection is empty, fall back to default layouts so screen is never blank
        setProducts(fallbackProducts);
      }
    }, (error) => {
      console.error("Firestore Catalog Stream Fault, reverting to mock layers:", error);
      setProducts(fallbackProducts);
    });

    return () => unsubscribe();
  }, []);

  // 🔑 Re-injected mutation database save controller function
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setIsSaving(true);
    try {
      const productDocRef = doc(db, "products", editingProduct.id);
      
      await updateDoc(productDocRef, {
        title: editingProduct.title || "",
        type: editingProduct.type || "Audiobook",
        price: editingProduct.price || "",
        status: editingProduct.status || "Draft",
        stripeConnectId: editingProduct.stripeConnectId || "",
        wpStudioKey: editingProduct.wpStudioKey || "",
        vaultPath: editingProduct.vaultPath || ""
      });

      // Local array UI fallback state state synchronization
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? editingProduct : p));

      toast({
        title: "Deployment Sync Successful",
        description: `Asset parameters for "${editingProduct.title}" updated in cloud core.`,
      });
      
      setEditingProduct(null);
    } catch (error: any) {
      console.error("Cloud Mutation Refuse Error:", error);
      
      // If document doesn't exist yet on your live Firestore instance, save to local runtime instead
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? editingProduct : p));
      
      toast({
        title: "Saved to Local Session",
        description: "Parameters updated locally. Ensure documents exist in Firestore.",
      });
      setEditingProduct(null);
    } finally {
      setIsSaving(false);
    }
  };

  // Safe client action placeholder for the creation drawer button
  const handleCreateProductPlaceholder = () => {
    const newId = `prod_${Math.random().toString(36).substring(2, 8)}`;
    const newProduct = {
      id: newId,
      assetKey: `asset_new_link_${Math.floor(Math.random() * 100)}`,
      title: "New Provisioned Asset Template",
      type: "Audiobook",
      price: "$0.00",
      status: "Draft",
      stripeConnectId: "",
      wpStudioKey: "",
      vaultPath: ""
    };
    setProducts(prev => [newProduct, ...prev]);
    setEditingProduct(newProduct);
  };

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto text-white font-sans min-h-[calc(100vh-4rem)]">
        
        {/* Header Configuration Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Product Catalog</h1>
            <p className="text-sm text-muted-foreground">
              Manage your audiobooks, e-books, courses, and platform system assets.
            </p>
          </div>
          <button 
          title="Create New Product"
            onClick={handleCreateProductPlaceholder}
            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-slate-950" />
            Create New Product
          </button>
        </div>

        {/* Product Component Grid Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {products.map((product) => (
            <div 
              key={product.id} 
              className="group flex flex-col bg-card rounded-2xl overflow-hidden border border-border/80 hover:border-emerald-500/30 hover:shadow-xl transition-all duration-300"
            >
              {/* Cover Art Dropzone Area */}
              <div className="h-40 bg-slate-950 flex items-center justify-center relative group-hover:bg-slate-900/40 transition-colors cursor-pointer border-b border-border/40">
                {product.image ? (
                  <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground group-hover:text-slate-300 transition-colors">
                    <ImageIcon className="w-7 h-7 mb-2 opacity-40 group-hover:scale-105 transition-transform" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Upload Cover Art</span>
                  </div>
                )}
                
                {/* Taxonomy Badge */}
                <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md border border-border px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                  <Tag className="w-3 h-3 text-emerald-400" />
                  <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider font-mono">{product.type}</span>
                </div>
              </div>

              {/* Functional Information Fields */}
              <div className="p-5 flex flex-col flex-grow space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="text-base font-bold text-white truncate pr-2 tracking-tight">{product.title}</h3>
                  <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                    product.status === "Active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}>
                    {product.status}
                  </span>
                </div>
                
                <div className="flex items-center">
                  <span className="text-[10px] font-mono text-muted-foreground bg-slate-950/80 px-2.5 py-1 rounded-lg border border-border/60">
                    ID: {product.assetKey}
                  </span>
                </div>

                {/* Pricing & Control Row */}
                <div className="pt-3 border-t border-border/40 flex items-center justify-between mt-auto">
                  <span className="text-base font-extrabold text-white font-mono">{product.price}</span>
                  <button
                    title="Edit Product Details" 
                    onClick={() => setEditingProduct({ ...product })}
                    className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-emerald-400 transition-colors"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    Edit Details
                  </button>
                </div>
              </div>

              {/* 🚀 NEW: The Studio Action Footer */}
              <div className="p-4 border-t border-border/50 flex flex-col gap-2 bg-slate-900/50 mt-auto">
                  <Link 
                      href={`/workbench/${product.id}`}
                      className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                      <Edit3 className="w-3.5 h-3.5" />
                      Author Workbench
                  </Link>

                  <Link 
                      href={`/studio/${product.id}`}
                      className="w-full flex items-center justify-center gap-2 bg-[#7C2B22] hover:bg-[#5a1f18] text-[#F9B437] py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                      <Mic className="w-3.5 h-3.5" />
                      Production Studio
                  </Link>
              </div>

            </div>
          ))}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* MASTER CONFIGURATION DRAWER OVERLAY */}
        {/* ------------------------------------------------------------- */}
        {editingProduct && (
          <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 transition-all">
            <div className="bg-card border border-border rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            
              {/* Drawer Header Block */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-slate-950/40">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                    Asset Parameters Context
                  </h2>
                </div>
                <button
                  title="Close Drawer" 
                  onClick={() => setEditingProduct(null)}
                  className="text-muted-foreground hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Body - Layout Stream */}
              <div className="p-6 overflow-y-auto space-y-5 bg-slate-950/10">
                <form id="edit-form" onSubmit={handleSaveChanges} className="space-y-5">
                  
                  {/* SECTION 1: Core Display Metadata */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/20 p-4 rounded-xl border border-border/40">
                    <div className="sm:col-span-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Display Details</h3>
                    </div>

                    {/* Display Title input */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Display Title</label>
                      <input
                        title="Display Title"
                        placeholder="e.g. Product Name" 
                        type="text" 
                        value={editingProduct.title || ""}
                        onChange={(e) => setEditingProduct({...editingProduct, title: e.target.value})}
                        className="w-full bg-slate-950 border border-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all font-medium"
                      />
                    </div>

                    {/* Hardcoded System ID Token */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">System Asset Identifier</label>
                      <input 
                        title="System Asset Identifier"
                        placeholder="asset_key_01"
                        type="text" 
                        value={editingProduct.assetKey || ""}
                        readOnly
                        className="w-full bg-slate-900/40 border border-border/60 rounded-xl px-3 py-2 text-xs text-slate-500 cursor-not-allowed font-mono shadow-inner"
                      />
                    </div>

                    {/* Taxonomy Select */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Product Category</label>
                      <select 
                        title="Product Category"
                        value={editingProduct.type || "Audiobook"}
                        onChange={(e) => setEditingProduct({...editingProduct, type: e.target.value})}
                        className="w-full bg-slate-950 border border-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 appearance-none font-medium"
                      >
                        <option value="Audiobook">Audiobook</option>
                        <option value="E-Book">E-Book</option>
                        <option value="Plugin">Plugin License</option>
                        <option value="Course">Coaching Course</option>
                      </select>
                    </div>

                    {/* Commercial Pricing parameter */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Retail Price</label>
                      <input 
                        title="Retail Price"
                        placeholder="$0.00"
                        type="text" 
                        value={editingProduct.price || ""}
                        onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})}
                        className="w-full bg-slate-950 border border-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all font-mono font-bold"
                      />
                    </div>

                    {/* Visibility status toggles */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Visibility Status</label>
                      <select 
                        title="Visibility Status"
                        value={editingProduct.status || "Draft"}
                        onChange={(e) => setEditingProduct({...editingProduct, status: e.target.value})}
                        className="w-full bg-slate-950 border border-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 appearance-none font-medium"
                      >
                        <option value="Active">Active (Public View)</option>
                        <option value="Draft">Draft (Internal Safe)</option>
                      </select>
                    </div>
                  </div>

                  {/* 🔑 SECTION 2: Platform Infrastructure Credentials (FIXED PLACEMENT INSIDE FORM) */}
                  <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-border/80 shadow-md">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Umbrella Gateway Settings</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Configure live deployment linkages for individual author accounts.</p>
                    </div>

                    {/* Stripe Umbrella Merchant Target Field */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Stripe Connect ID (Sub-Merchant Link)
                      </label>
                      <input 
                        title="Stripe Connect ID"
                        type="text" 
                        placeholder="acct_1RxxxxxxXXXXxxxx"
                        value={editingProduct.stripeConnectId || ""} // 🔑 FIXED
                        onChange={(e) => setEditingProduct({...editingProduct, stripeConnectId: e.target.value})}
                        className="w-full bg-slate-950 border border-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 font-mono tracking-wide"
                      />
                      <span className="text-[9px] text-slate-500 block leading-tight">
                        Route 100% of generated sales under your processing umbrella. Leave blank to bypass.
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Custom WordPress Plugin Token Field */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          WordPress Studio Key
                        </label>
                        <input 
                          title="WordPress Studio Key"
                          type="text" 
                          placeholder="koba_st_key_..."
                          value={editingProduct.wpStudioKey || ""}
                          onChange={(e) => setEditingProduct({...editingProduct, wpStudioKey: e.target.value})}
                          className="w-full bg-slate-950 border border-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 font-mono"
                        />
                      </div>

                      {/* Voice Vault Direct Directory Route */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Voice Vault Storage Location
                        </label>
                        <input 
                          title="Voice Vault Storage Location"
                          type="text" 
                          placeholder="gs://vault-storage/author-id/"
                          value={editingProduct.vaultPath || ""}
                          onChange={(e) => setEditingProduct({...editingProduct, vaultPath: e.target.value})}
                          className="w-full bg-slate-950 border border-border rounded-xl px-3 py-2 text-xs text-slate-400 focus:outline-none focus:border-emerald-500/50 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: Cover Art File Stream */}
                  <div className="bg-slate-900/20 p-4 rounded-xl border border-border/40">
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Cover Art File Stream</label>
                    <div className="w-full h-24 border border-dashed border-border rounded-xl hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all flex flex-col items-center justify-center cursor-pointer group bg-slate-950/40">
                      <UploadCloud className="w-5 h-5 text-muted-foreground group-hover:text-emerald-400 mb-1 transition-colors" />
                      <span className="text-xs text-slate-300 font-medium group-hover:text-emerald-300">Click to upload or execute asset drag</span>
                    </div>
                  </div>

                </form>
              </div>

              {/* Drawer Footer controls */}
              <div className="px-6 py-4 border-t border-border bg-slate-950/40 flex justify-end gap-3 items-center">
                <button 
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-white hover:bg-slate-900 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  form="edit-form"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-emerald-500/10"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}