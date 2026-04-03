import { useParams } from "wouter";
import { useGetPublicProfile, getGetPublicProfileQueryKey } from "@workspace/api-client-react";
import { Spinner } from "@/components/ui/spinner";
import { Phone, Mail, Globe, Instagram, MessageCircle, User } from "lucide-react";
import logo from "/topping-courier-logo.png";
import { Button } from "@/components/ui/button";

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
      <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <p className="text-xl font-semibold text-gray-900">Profile not found</p>
          <p className="text-gray-500 mt-2">This user does not exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const initials = profile.name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-gray-50">
      <div className="flex-1 flex flex-col items-center justify-start pt-12 px-4 pb-20">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="bg-black h-24" />
            <div className="px-6 pb-6">
              <div className="flex items-end gap-4 -mt-10 mb-4">
                {profile.logo ? (
                  <img
                    src={profile.logo}
                    alt={profile.name}
                    className="w-20 h-20 rounded-full border-4 border-white object-cover bg-gray-100"
                    data-testid="img-avatar"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full border-4 border-white bg-gray-800 text-white flex items-center justify-center text-xl font-bold" data-testid="img-avatar-initials">
                    {initials}
                  </div>
                )}
              </div>

              <h1 className="text-2xl font-bold text-gray-900" data-testid="text-name">{profile.name}</h1>
              <p className="text-gray-600 font-medium mt-0.5" data-testid="text-business">{profile.businessName}</p>

              {profile.bio && (
                <p className="text-gray-500 text-sm mt-3 leading-relaxed" data-testid="text-bio">{profile.bio}</p>
              )}

              <div className="mt-6 space-y-3">
                <a href={`tel:${profile.phone}`} className="block">
                  <Button className="w-full h-12 gap-3 text-base" data-testid="button-call">
                    <Phone className="w-5 h-5" />
                    Call {profile.phone}
                  </Button>
                </a>

                {profile.whatsapp && (
                  <a
                    href={`https://wa.me/${profile.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button variant="outline" className="w-full h-12 gap-3 text-base border-green-500 text-green-600 hover:bg-green-50" data-testid="button-whatsapp">
                      <MessageCircle className="w-5 h-5" />
                      WhatsApp
                    </Button>
                  </a>
                )}

                <a href={`mailto:${profile.email}`} className="block">
                  <Button variant="outline" className="w-full h-12 gap-3 text-base" data-testid="button-email">
                    <Mail className="w-5 h-5" />
                    {profile.email}
                  </Button>
                </a>

                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="block">
                    <Button variant="outline" className="w-full h-12 gap-3 text-base" data-testid="button-website">
                      <Globe className="w-5 h-5" />
                      Website
                    </Button>
                  </a>
                )}

                {profile.instagram && (
                  <a href={`https://instagram.com/${profile.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="block">
                    <Button variant="outline" className="w-full h-12 gap-3 text-base" data-testid="button-instagram">
                      <Instagram className="w-5 h-5" />
                      {profile.instagram.startsWith("@") ? profile.instagram : `@${profile.instagram}`}
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-6" data-testid="text-powered-by">
            <img src={logo} alt="Topping Courier" className="h-8 w-auto opacity-60" />
          </div>
        </div>
      </div>
    </div>
  );
}
