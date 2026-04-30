"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const PROFILE_UI_EVENT = "topping-profile-ui-update";

function emitProfileUiUpdate(detail: {
  banner_color?: string | null;
  logo_url?: string | null;
}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PROFILE_UI_EVENT, { detail }));
}

type EditableProfile = {
  id: string | number;
  banner_color?: string | null;
  bannerColor?: string | null;
  logo_url?: string | null;
  logoUrl?: string | null;
};

function bannerColorOf(p: EditableProfile): string {
  return (p.banner_color ?? p.bannerColor ?? "#0f2027").trim() || "#0f2027";
}

function Spinner() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 animate-spin text-white"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647Z"
      />
    </svg>
  );
}

export default function ProfileEditBar({
  profile,
  isOwner,
}: {
  profile: EditableProfile;
  isOwner: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [bannerColor, setBannerColor] = useState(bannerColorOf(profile));
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(false);
  const toastTimer = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showSaved = useCallback(() => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(true);
    toastTimer.current = window.setTimeout(() => setToast(false), 2000);
  }, []);

  void isOwner;

  async function persistBannerColor(next: string) {
    setBannerColor(next);
    emitProfileUiUpdate({ banner_color: next });

    const { error } = await supabase
      .from("profiles")
      .update({ banner_color: next })
      .eq("id", profile.id);

    if (error) {
      setBannerColor(bannerColorOf(profile));
      emitProfileUiUpdate({ banner_color: bannerColorOf(profile) });
      return;
    }
    showSaved();
  }

  async function onLogoSelected(file: File) {
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const safeExt = ext.replace(/[^a-z0-9]/g, "") || "png";
    const path = `${profile.id}/${Date.now()}.${safeExt}`;

    setBusy(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("logos").getPublicUrl(path);
      const publicUrl = data.publicUrl;

      const { error: dbError } = await supabase
        .from("profiles")
        .update({ logo_url: publicUrl })
        .eq("id", profile.id);

      if (dbError) throw dbError;

      emitProfileUiUpdate({ logo_url: publicUrl });
      showSaved();
    } catch {
      // upload or DB failed — UI left unchanged
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <>
      {toast ? (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-lg">
          Saved!
        </div>
      ) : null}

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-md items-center gap-4">
          <label className="flex min-w-0 flex-1 items-center gap-3">
            <span className="shrink-0 text-xs font-semibold text-neutral-700">Banner color</span>
            <input
              type="color"
              value={bannerColor}
              onChange={(e) => void persistBannerColor(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded-md border border-neutral-200 bg-white p-1"
              aria-label="Banner color"
            />
          </label>

          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void onLogoSelected(file);
              }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-black disabled:opacity-60"
            >
              {busy ? <Spinner /> : null}
              Logo upload
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
