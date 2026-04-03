import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CreditCard, Zap, Share2 } from "lucide-react";
import logo from "/topping-courier-logo.png";

export default function Home() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-white">
      <header className="px-6 py-4 flex justify-between items-center border-b">
        <img src={logo} alt="Topping Courier" className="h-12 w-auto" />
        <Link href="/login">
          <Button variant="outline" size="sm">Sign In</Button>
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-3xl mx-auto">
        <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mb-8 mx-auto">
          <Zap className="w-8 h-8" />
        </div>
        
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
          The Last Business Card You'll Ever Need.
        </h1>
        
        <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-xl mx-auto leading-relaxed">
          Share your contact details, social links, and business info with a single tap. Designed for couriers, freelancers, and small businesses.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md">
          <Button size="lg" className="w-full text-base h-12" onClick={() => alert("Tap your card on your NFC enabled phone to begin.")}>
            Tap Card to Activate
          </Button>
          <Link href="/login" className="w-full">
            <Button variant="outline" size="lg" className="w-full text-base h-12">
              Login to Dashboard
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 text-left w-full">
          <div>
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
              <CreditCard className="w-5 h-5 text-black" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Premium Cards</h3>
            <p className="text-gray-600 text-sm">Crisp, professional NFC cards that leave a lasting impression.</p>
          </div>
          <div>
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-5 h-5 text-black" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Instant Sharing</h3>
            <p className="text-gray-600 text-sm">No app required. Just tap on any modern smartphone to share your profile.</p>
          </div>
          <div>
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
              <Share2 className="w-5 h-5 text-black" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Always Updated</h3>
            <p className="text-gray-600 text-sm">Change your details anytime from the dashboard. Your card instantly updates.</p>
          </div>
        </div>
      </main>
      
      <footer className="border-t py-8 flex justify-center items-center">
        <img src={logo} alt="Topping Courier" className="h-8 w-auto opacity-70" />
      </footer>
    </div>
  );
}
