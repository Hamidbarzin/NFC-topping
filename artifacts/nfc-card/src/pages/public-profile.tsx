import { useParams } from "wouter";
import { useGetPublicProfile, getGetPublicProfileQueryKey } from "@workspace/api-client-react";
import { Spinner } from "@/components/ui/spinner";
import { Phone, Mail, Globe, Instagram, MessageCircle } from "lucide-react";
import logo from "/topping-courier-logo.png";

export default function PublicProfile() {
  const { username } = useParams();

  const { data: profile, isLoading, error } = useGetPublicProfile(username!, {
    query: {
      enabled: !!username,
      queryKey: getGetPublicProfileQueryKey(username!),
      retry: false,
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: "#f0f2f8" }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6" style={{ background: "#f0f2f8" }}>
        <div className="text-center">
          <p className="text-xl font-bold" style={{ color: "#1A2D7C" }}>Profile not found</p>
          <p className="text-gray-500 mt-2 text-sm">This user does not exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const initials = profile.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "#f0f2f8" }}>
      <div className="flex-1 flex flex-col items-center justify-start pt-10 px-4 pb-16">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100">
            <div className="h-28" style={{ background: "linear-gradient(135deg, #111E52, #1A2D7C)" }} />
            <div className="px-6 pb-6">
              <div className="flex items-end gap-4 -mt-12 mb-4">
                {profile.logo ? (
                  <img
                    src={profile.logo}
                    alt={profile.name}
                    className="w-20 h-20 rounded-full border-4 border-white object-cover bg-gray-100 shadow-md"
                    data-testid="img-avatar"
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-full border-4 border-white text-white flex items-center justify-center text-xl font-extrabold shadow-md"
                    style={{ background: "#F5A500" }}
                    data-testid="img-avatar-initials"
                  >
                    {initials}
                  </div>
                )}
              </div>

              <h1 className="text-2xl font-extrabold" style={{ color: "#1A2D7C" }} data-testid="text-name">{profile.name}</h1>
              <p className="font-semibold mt-0.5 text-sm" style={{ color: "#F5A500" }} data-testid="text-business">{profile.businessName}</p>

              {profile.bio && (
                <p className="text-gray-500 text-sm mt-3 leading-relaxed" data-testid="text-bio">{profile.bio}</p>
              )}

              <div className="mt-6 space-y-3">
                <a href={`tel:${profile.phone}`} className="block">
                  <button
                    className="w-full h-12 rounded-xl font-bold text-base flex items-center justify-center gap-3 transition-all hover:opacity-90"
                    style={{ background: "#F5A500", color: "#fff" }}
                    data-testid="button-call"
                  >
                    <Phone className="w-5 h-5" />
                    Call {profile.phone}
                  </button>
                </a>

                {profile.whatsapp && (
                  <a
                    href={`https://wa.me/${profile.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <button
                      className="w-full h-12 rounded-xl font-bold text-base flex items-center justify-center gap-3 transition-all hover:opacity-90"
                      style={{ background: "#25D366", color: "#fff" }}
                      data-testid="button-whatsapp"
                    >
                      <MessageCircle className="w-5 h-5" />
                      WhatsApp
                    </button>
                  </a>
                )}

                <a href={`mailto:${profile.email}`} className="block">
                  <button
                    className="w-full h-12 rounded-xl font-semibold text-base flex items-center justify-center gap-3 transition-all border-2 hover:bg-blue-50"
                    style={{ borderColor: "#1A2D7C", color: "#1A2D7C", background: "#fff" }}
                    data-testid="button-email"
                  >
                    <Mail className="w-5 h-5" />
                    {profile.email}
                  </button>
                </a>

                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="block">
                    <button
                      className="w-full h-12 rounded-xl font-semibold text-base flex items-center justify-center gap-3 transition-all border-2 hover:bg-blue-50"
                      style={{ borderColor: "#1A2D7C", color: "#1A2D7C", background: "#fff" }}
                      data-testid="button-website"
                    >
                      <Globe className="w-5 h-5" />
                      Website
                    </button>
                  </a>
                )}

                {profile.instagram && (
                  <a href={`https://instagram.com/${profile.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="block">
                    <button
                      className="w-full h-12 rounded-xl font-semibold text-base flex items-center justify-center gap-3 transition-all border-2 hover:bg-pink-50"
                      style={{ borderColor: "#E1306C", color: "#E1306C", background: "#fff" }}
                      data-testid="button-instagram"
                    >
                      <Instagram className="w-5 h-5" />
                      {profile.instagram.startsWith("@") ? profile.instagram : `@${profile.instagram}`}
                    </button>
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-6" data-testid="text-powered-by">
            <img src={logo} alt="Topping Courier" className="h-8 w-auto opacity-70" />
          </div>
        </div>
      </div>
    </div>
  );
}
