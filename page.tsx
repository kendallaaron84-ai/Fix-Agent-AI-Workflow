"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Logo } from "@/components/elements/logo";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function SignInPage() {
  const router = useRouter();  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
    // 🔑 DEV OVERRIDE: Instant Admin Bypass
  const handleLocalBypass = async () => {
    setLoading(true);
    try {
      const apiResponse = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
      });

      if (!apiResponse.ok) {
        throw new Error("Server rejected identity exchange token verification.");
      }

      toast({
        title: "Session Verified",
        description: "Welcome to the KOBA-I Audio Control Studio.",
      });

      // 🚀 THE REDIRECT ROUTER PUSH: Move from signin page into the core workspace
      router.push("/");
    } catch (err) {
      toast({ title: "Bypass Failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Validation Error",
        description: "Please fill out all fields before authenticating.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Authenticate with client SDK credentials
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // 2. Extract the short-lived verification token
      const token = await userCredential.user.getIdToken();

      // 🔑 3. Exchange it with your server API for a true Session Cookie
      const apiResponse = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
      });

      if (!apiResponse.ok) {
        throw new Error("Server rejected identity exchange token verification.");
      }
      
      toast({
        title: "Session Verified",
        description: "Welcome to the KOBA-I Audio Control Studio.",
      });

      // 4. Clear client cache frameworks and route into workspace cleanly
      router.push("/nexus-engine");
      router.refresh(); 
    } catch (error: any) {
      console.error("Authentication failed:", error);
      toast({
        title: "Authentication Failed",
        description: error.message || "An unexpected error occurred during sign-in.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 p-8 bg-card rounded-2xl border border-border shadow-xl">
        
        <div className="flex flex-col items-center space-y-2 text-center">
          <Logo size="lg" vertical={true} />
          <h2 className="mt-4 text-xl font-semibold tracking-tight text-white">
            Secure Studio Portal
          </h2>
          <p className="text-xs text-muted-foreground">
            Authorized Audio Operators Only
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4 rounded-md">
            <div className="space-y-2">
              <Label htmlFor="email-address">Email Address</Label>
              <Input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="operator@koba-i.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="bg-background text-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Security Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="bg-background text-white"
              />
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full font-medium transition-all"
            >
              {loading ? "Decrypting Session Token..." : "Authenticate Session"}
            </Button>

            <div className="space-y-2 mt-4">

            {process.env.NODE_ENV === "development" && (
              <Button
                type="button"
                variant="outline"
                onClick={handleLocalBypass}
                className="w-full border-orange-500 text-orange-500 hover:bg-orange-500/10"
              >
                ⚡ Local Developer Bypass
              </Button>
            )}
          </div>
          </div>
        </form>

      </div>
    </div>
  );
}