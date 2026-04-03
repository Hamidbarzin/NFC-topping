import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CreditCard, Zap, Share2, Truck, Clock, Shield } from "lucide-react";
import logo from "/topping-courier-logo.png";

export default function Home() {
  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "#f8f9fc" }}>
      <header style={{ background: "#1A2D7C" }} className="px-6 py-3 flex justify-between items-center shadow-lg">
        <img src={logo} alt="Topping Courier" className="h-12 w-auto" />
        <Link href="/login">
          <Button size="sm" style={{ background: "#F5A500", color: "#fff", border: "none" }} className="font-semibold hover:opacity-90">
            Sign In
          </Button>
        </Link>
      </header>

      <div style={{ background: "linear-gradient(135deg, #111E52 0%, #1A2D7C 60%, #22389E 100%)" }} className="py-20 px-6 text-center text-white">
        <div className="max-w-3xl mx-auto">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold mb-6"
            style={{ background: "rgba(245,165,0,0.15)", color: "#F5A500", border: "1px solid rgba(245,165,0,0.3)" }}
          >
            <Zap className="w-4 h-4" />
            Smart NFC Digital Business Card
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            Your Business Card,{" "}
            <span style={{ color: "#F5A500" }}>One Tap Away.</span>
          </h1>

          <p className="text-lg md:text-xl mb-10 max-w-xl mx-auto leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
            Share your contact details, social links, and business info instantly. Powered by Topping Courier — built for couriers, drivers, and small businesses.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <button
              onClick={() => alert("Tap your NFC card on your phone to begin activation.")}
              className="flex-1 h-12 rounded-lg font-bold text-base transition-all hover:opacity-90 shadow-lg"
              style={{ background: "#F5A500", color: "#fff" }}
            >
              Tap Card to Activate
            </button>
            <Link href="/login" className="flex-1">
              <button
                className="w-full h-12 rounded-lg font-bold text-base transition-all hover:bg-white hover:text-[#1A2D7C]"
                style={{ border: "2px solid rgba(255,255,255,0.5)", color: "#fff", background: "transparent" }}
              >
                Login to Dashboard
              </button>
            </Link>
          </div>
        </div>
      </div>

      <div className="py-16 px-6 max-w-5xl mx-auto w-full">
        <p className="text-center text-sm font-semibold uppercase tracking-widest mb-10" style={{ color: "#F5A500" }}>
          Why Choose Topping Courier NFC Cards
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "#FFF3CC" }}>
              <CreditCard className="w-6 h-6" style={{ color: "#F5A500" }} />
            </div>
            <h3 className="font-bold text-lg mb-2" style={{ color: "#1A2D7C" }}>Premium NFC Cards</h3>
            <p className="text-gray-500 text-sm leading-relaxed">Crisp, professional cards that tap into any modern smartphone — no app needed.</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "#FFF3CC" }}>
              <Zap className="w-6 h-6" style={{ color: "#F5A500" }} />
            </div>
            <h3 className="font-bold text-lg mb-2" style={{ color: "#1A2D7C" }}>Instant Sharing</h3>
            <p className="text-gray-500 text-sm leading-relaxed">One tap shares your full profile — phone, email, WhatsApp, website, and more.</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "#FFF3CC" }}>
              <Share2 className="w-6 h-6" style={{ color: "#F5A500" }} />
            </div>
            <h3 className="font-bold text-lg mb-2" style={{ color: "#1A2D7C" }}>Always Up-to-Date</h3>
            <p className="text-gray-500 text-sm leading-relaxed">Change your details anytime from the dashboard — your card updates instantly.</p>
          </div>
        </div>
      </div>

      <div style={{ background: "#1A2D7C" }} className="py-14 px-6 text-center text-white">
        <h2 className="text-2xl font-extrabold mb-2">Includes <span style={{ color: "#F5A500" }}>$40 Credit</span></h2>
        <p style={{ color: "rgba(255,255,255,0.7)" }} className="mb-6 text-sm">Every card activation comes with $40 Topping Courier credit to get you started.</p>
        <button
          onClick={() => alert("Tap your NFC card on your phone to begin activation.")}
          className="px-8 h-12 rounded-lg font-bold text-base transition-all hover:opacity-90"
          style={{ background: "#F5A500", color: "#fff" }}
        >
          Activate Your Card
        </button>
      </div>

      <footer style={{ background: "#111E52" }} className="py-8 flex flex-col items-center gap-3">
        <img src={logo} alt="Topping Courier" className="h-10 w-auto opacity-90" />
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>© {new Date().getFullYear()} Topping Courier. All rights reserved.</p>
      </footer>
    </div>
  );
}
