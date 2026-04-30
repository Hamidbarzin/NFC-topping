import type { Profile } from "@workspace/api-client-react";
import { NfcPremiumPublicView } from "@/components/nfc-premium-public-view";

type Props = {
  profile: Profile;
  safeCreditBalance: number;
  isCreditExpired: boolean;
  onSaveContact: () => void;
  onShare: () => void | Promise<void>;
};

export function ClientAccessLivePreview({
  profile,
  safeCreditBalance,
  isCreditExpired,
  onSaveContact,
  onShare,
}: Props) {
  return (
    <div>
      <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
        Live preview
      </p>
      <p className="mb-3 text-center text-xs text-neutral-500">
        Matches your public page — same layout as <span className="font-medium text-neutral-700">/u/{profile.slug}</span>
      </p>
      <div className="mx-auto max-h-[min(780px,82vh)] overflow-y-auto overflow-x-hidden rounded-[28px] border border-neutral-200/80 bg-neutral-100/40 shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
        <NfcPremiumPublicView
          embedded
          profile={profile}
          safeCreditBalance={safeCreditBalance}
          isCreditExpired={isCreditExpired}
          onSaveContact={onSaveContact}
          onShare={onShare}
        />
      </div>
    </div>
  );
}
