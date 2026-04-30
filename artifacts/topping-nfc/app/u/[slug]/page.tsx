import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublicProfileBySlug } from "@/lib/profiles/get-public-profile-by-slug";
import TapRecorder from "@/components/TapRecorder";
import ProfilePublicView, {
  type PublicProfileViewModel,
} from "@/components/ProfilePublicView";
import ProfileEditBar from "@/components/ProfileEditBar";

type PageProps = {
  params: { slug: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const profile = await getPublicProfileBySlug(params.slug);

  if (!profile) {
    return {
      title: "Profile | Topping NFC",
      description: "Topping NFC business card profile.",
    };
  }

  const name =
    (profile as { business_name?: string | null; businessName?: string | null }).business_name ??
    (profile as { businessName?: string | null }).businessName ??
    "Business";

  return {
    title: `${name} | Topping NFC`,
    description: `Connect with ${name} on Topping NFC.`,
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const profile = await getPublicProfileBySlug(params.slug);

  if (!profile) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const ownerId = (profile as { owner_id?: string | null }).owner_id;
  const isOwner = !!session?.user?.id && !!ownerId && session.user.id === ownerId;

  return (
    <>
      <TapRecorder slug={params.slug} />
      <ProfilePublicView profile={profile as unknown as PublicProfileViewModel} />
      {isOwner ? (
        <ProfileEditBar profile={profile as unknown as PublicProfileViewModel} isOwner={isOwner} />
      ) : null}
    </>
  );
}
