import { useEffect, useState, type ChangeEvent } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import {
  useCreateProfile,
  useUpdateProfile,
  useGetProfileAnalytics,
  useGetProfileCreditLedger,
  useAdjustProfileCredit,
  useListProfiles,
  getListProfilesQueryKey,
  getGetProfileAnalyticsQueryKey,
  getGetProfileCreditLedgerQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import type { PricingItem } from "@workspace/api-client-react";
import { normalizeUserUrl } from "@/lib/url-normalize";

const formSchema = z.object({
  slug: z.string().min(2, "Slug must be at least 2 characters").regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  businessName: z.string().min(1, "Business name is required"),
  jobTitle: z.string().optional(),
  shortBio: z.string().optional(),
  businessDescription: z.string().optional(),
  category: z.string().optional(),
  phone: z.string().optional(),
  externalContactUrl: z.string().optional(),
  bookingUrl: z.string().optional(),
  instagram: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  galleryUrlsText: z.string().optional(),
  totalDeliveries: z.coerce.number().int().min(0).optional(),
  totalClients: z.coerce.number().int().min(0).optional(),
  ratingStr: z.string().optional(),
  orderUrl: z.string().optional(),
  pricingItemsJson: z.string().optional(),
  profilePhotoUrl: z.string().optional(),
  logoUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
  bannerColor: z.string().min(1),
  plan: z.enum(["basic", "pro", "business"]),
  expiresAt: z.string().optional(),
  ownerEmail: z.string().optional(),
  ownerName: z.string().optional(),
  /** Activation welcome $ — empty = platform default ($45); 0 = no gift; only before customer activates. */
  activationGiftPresetStr: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function activationGiftFromPreset(
  raw: string | undefined,
  mode: "create" | "editUnclaimed",
): { activationGiftAmount: number | null } | Record<string, never> {
  const s = raw?.trim() ?? "";
  if (mode === "create") {
    if (s === "") return {};
    const n = Number(s);
    if (!Number.isFinite(n) || n < 0) return {};
    return { activationGiftAmount: n };
  }
  if (s === "") return { activationGiftAmount: null };
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return {};
  return { activationGiftAmount: n };
}

export default function CardForm() {
  const params = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const isEdit = !!params.id;
  const profileId = params.id ? parseInt(params.id, 10) : undefined;
  const { toast } = useToast();
  const [uploadingField, setUploadingField] = useState<
    "profilePhotoUrl" | "logoUrl" | "bannerUrl" | null
  >(null);
  const [creditDelta, setCreditDelta] = useState("");
  const [creditReason, setCreditReason] = useState("");

  const { data: profiles } = useListProfiles(
    {},
    { query: { enabled: isEdit, queryKey: getListProfilesQueryKey({}) } }
  );
  const profile = profiles?.find((p) => p.id === profileId);

  const { data: analytics } = useGetProfileAnalytics(
    profileId!,
    { days: 30 },
    { query: { enabled: isEdit && !!profileId, queryKey: getGetProfileAnalyticsQueryKey(profileId!, { days: 30 }) } }
  );

  const { data: creditLedger } = useGetProfileCreditLedger(profileId!, {
    query: {
      enabled: isEdit && !!profileId && profile?.isClaimed === true,
      queryKey: profileId ? getGetProfileCreditLedgerQueryKey(profileId) : ["credit-ledger", "disabled"],
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      slug: "",
      businessName: "",
      jobTitle: "",
      shortBio: "",
      businessDescription: "",
      category: "",
      phone: "",
      externalContactUrl: "",
      bookingUrl: "",
      instagram: "",
      address: "",
      city: "",
      galleryUrlsText: "",
      totalDeliveries: 0,
      totalClients: 0,
      ratingStr: "",
      orderUrl: "",
      pricingItemsJson: "[]",
      profilePhotoUrl: "",
      logoUrl: "",
      bannerUrl: "",
      bannerColor: "#1a1a2e",
      plan: "basic",
      expiresAt: "",
      ownerEmail: "",
      ownerName: "",
      activationGiftPresetStr: "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        slug: profile.slug,
        businessName: profile.businessName,
        jobTitle: profile.jobTitle ?? "",
        shortBio: profile.shortBio ?? "",
        businessDescription: profile.businessDescription ?? "",
        category: profile.category ?? "",
        phone: profile.phone ?? "",
        externalContactUrl: profile.externalContactUrl ?? "",
        bookingUrl: profile.bookingUrl ?? "",
        instagram: profile.instagram ?? "",
        address: profile.address ?? "",
        city: profile.city ?? "",
        galleryUrlsText: (profile.galleryUrls ?? []).join("\n"),
        totalDeliveries: profile.totalDeliveries ?? 0,
        totalClients: profile.totalClients ?? 0,
        ratingStr: profile.rating != null ? String(profile.rating) : "",
        orderUrl: profile.orderUrl ?? "",
        pricingItemsJson: JSON.stringify(profile.pricingItems ?? [], null, 2),
        profilePhotoUrl: profile.profilePhotoUrl ?? "",
        logoUrl: profile.logoUrl ?? "",
        bannerUrl: profile.bannerUrl ?? "",
        bannerColor: profile.bannerColor,
        plan: profile.plan as "basic" | "pro" | "business",
        expiresAt: profile.expiresAt
          ? new Date(profile.expiresAt).toISOString().slice(0, 10)
          : "",
        ownerEmail: profile.ownerEmail ?? "",
        ownerName: profile.ownerName ?? "",
        activationGiftPresetStr:
          profile.activationGiftAmount != null && profile.activationGiftAmount !== ""
            ? String(profile.activationGiftAmount)
            : "",
      });
    }
  }, [profile]);

  const createProfile = useCreateProfile({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProfilesQueryKey() });
        setLocation("/admin/cards");
      },
      onError: (err: unknown) => {
        const message =
          err instanceof Error
            ? err.message
            : "Could not create card. Check API server and database connection.";
        toast({
          title: "Create failed",
          description: message,
          variant: "destructive",
        });
      },
    },
  });

  const adjustCredit = useAdjustProfileCredit({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProfilesQueryKey() });
        if (profileId) {
          queryClient.invalidateQueries({
            queryKey: getGetProfileCreditLedgerQueryKey(profileId),
          });
        }
        setCreditDelta("");
        setCreditReason("");
        toast({ title: "Wallet updated" });
      },
      onError: (err: unknown) => {
        toast({
          title: "Adjustment failed",
          description: err instanceof Error ? err.message : "Request failed",
          variant: "destructive",
        });
      },
    },
  });

  const updateProfile = useUpdateProfile({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProfilesQueryKey() });
        setLocation("/admin/cards");
      },
      onError: (err: unknown) => {
        const message =
          err instanceof Error
            ? err.message
            : "Could not update card. Check API server and database connection.";
        toast({
          title: "Update failed",
          description: message,
          variant: "destructive",
        });
      },
    },
  });

  const onSubmit = (values: FormValues) => {
    const { galleryUrlsText, ratingStr, activationGiftPresetStr, pricingItemsJson, ...rest } =
      values;
    const galleryUrls = galleryUrlsText?.trim()
      ? galleryUrlsText
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
      : undefined;
    const ratingParsed = ratingStr?.trim()
      ? Number(ratingStr.trim())
      : undefined;
    const rating =
      ratingParsed !== undefined && Number.isFinite(ratingParsed)
        ? Math.min(5, Math.max(0, ratingParsed))
        : undefined;

    const giftPayload =
      !isEdit
        ? activationGiftFromPreset(activationGiftPresetStr, "create")
        : profile && profile.isClaimed !== true
          ? activationGiftFromPreset(activationGiftPresetStr, "editUnclaimed")
          : {};

    let pricingItems: PricingItem[] | undefined;
    if (pricingItemsJson?.trim()) {
      try {
        const parsed = JSON.parse(pricingItemsJson) as unknown;
        if (!Array.isArray(parsed)) throw new Error("Pricing must be a JSON array.");
        pricingItems = parsed as PricingItem[];
      } catch {
        toast({
          title: "Invalid pricing JSON",
          description: "Use a JSON array of objects with name, price, currency, etc.",
          variant: "destructive",
        });
        return;
      }
    }

    const ext = values.externalContactUrl?.trim();
    const book = values.bookingUrl?.trim();

    const data = {
      ...rest,
      ...giftPayload,
      jobTitle: values.jobTitle || undefined,
      shortBio: values.shortBio || undefined,
      businessDescription: values.businessDescription || undefined,
      category: values.category || undefined,
      phone: values.phone || undefined,
      externalContactUrl: ext ? normalizeUserUrl(ext) ?? undefined : undefined,
      bookingUrl: book ? normalizeUserUrl(book) ?? undefined : undefined,
      instagram: values.instagram || undefined,
      address: values.address || undefined,
      city: values.city || undefined,
      galleryUrls,
      totalDeliveries: values.totalDeliveries,
      totalClients: values.totalClients,
      rating,
      orderUrl: values.orderUrl || undefined,
      ...(pricingItems !== undefined ? { pricingItems } : {}),
      profilePhotoUrl: values.profilePhotoUrl || undefined,
      logoUrl: values.logoUrl || undefined,
      bannerUrl: values.bannerUrl || undefined,
      expiresAt: values.expiresAt || undefined,
      ownerEmail: values.ownerEmail || undefined,
      ownerName: values.ownerName || undefined,
    };

    if (isEdit && profileId) {
      updateProfile.mutate({ id: profileId, data });
    } else {
      createProfile.mutate({ data });
    }
  };

  const isPending = createProfile.isPending || updateProfile.isPending;

  function applyCreditAdjust() {
    if (!profileId) return;
    const delta = Number(creditDelta);
    if (!Number.isFinite(delta) || delta === 0) {
      toast({
        title: "Invalid amount",
        description: "Enter a non-zero number (positive to add, negative to subtract).",
        variant: "destructive",
      });
      return;
    }
    adjustCredit.mutate({
      id: profileId,
      data: {
        amount: delta,
        reason: creditReason.trim() || undefined,
      },
    });
  }

  async function uploadImage(file: File, type: "profile" | "logo" | "banner") {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/upload?type=${type}`, {
      method: "POST",
      body: formData,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || typeof body.url !== "string") {
      throw new Error(
        typeof body.error === "string" ? body.error : "Image upload failed",
      );
    }
    return body.url as string;
  }

  async function handleImageUpload(
    e: ChangeEvent<HTMLInputElement>,
    field: "profilePhotoUrl" | "logoUrl" | "bannerUrl",
    type: "profile" | "logo" | "banner",
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid image",
        description: "Please choose an image file.",
        variant: "destructive",
      });
      return;
    }
    try {
      setUploadingField(field);
      const url = await uploadImage(file, type);
      form.setValue(field, url, { shouldDirty: true });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Image upload failed.",
        variant: "destructive",
      });
    } finally {
      setUploadingField(null);
      e.currentTarget.value = "";
    }
  }

  return (
    <div className="max-w-2xl space-y-6 text-slate-100" data-testid="card-form">
      <div className="flex items-center gap-3">
        <Link href="/admin/cards">
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-300 hover:bg-white/10 hover:text-white"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="bg-gradient-to-r from-cyan-200 to-violet-200 bg-clip-text text-3xl font-bold text-transparent">
            {isEdit ? "Edit Card" : "New Card"}
          </h1>
          <p className="text-sm text-slate-300">
            {isEdit ? "Update card profile information" : "Create a new NFC business card profile"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 [&_input]:border-white/15 [&_input]:bg-white/5 [&_input]:text-slate-100 [&_input]:placeholder:text-slate-500 [&_label]:text-slate-300"
        >
          {/* Business Info */}
          <Card className="border-white/10 bg-white/5 shadow-xl backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-100">Business Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL Slug *</FormLabel>
                      <FormControl>
                        <Input placeholder="my-business" {...field} disabled={isEdit} data-testid="input-slug" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="My Business" {...field} data-testid="input-business-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>Upload Profile Photo</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handleImageUpload(e, "profilePhotoUrl", "profile")}
                    className="border-white/15 bg-white/5 text-slate-100 file:border-0 file:bg-white/10 file:text-slate-100"
                  />
                  {uploadingField === "profilePhotoUrl" ? (
                    <p className="text-xs text-cyan-300">Uploading...</p>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <Label>Upload Logo</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handleImageUpload(e, "logoUrl", "logo")}
                    className="border-white/15 bg-white/5 text-slate-100 file:border-0 file:bg-white/10 file:text-slate-100"
                  />
                  {uploadingField === "logoUrl" ? (
                    <p className="text-xs text-cyan-300">Uploading...</p>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <Label>Upload Banner</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handleImageUpload(e, "bannerUrl", "banner")}
                    className="border-white/15 bg-white/5 text-slate-100 file:border-0 file:bg-white/10 file:text-slate-100"
                  />
                  {uploadingField === "bannerUrl" ? (
                    <p className="text-xs text-cyan-300">Uploading...</p>
                  ) : null}
                </div>
              </div>

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input placeholder="Restaurant, Cafe, Clinic..." {...field} data-testid="input-category" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Realtor, Logistics Manager, Hair Stylist..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+1-416-555-0100" {...field} data-testid="input-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="externalContactUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>External contact URL</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://…"
                          {...field}
                          data-testid="input-external-contact-url"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bookingUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Booking / online profile URL</FormLabel>
                      <FormControl>
                        <Input type="url" placeholder="https://…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="instagram"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram Handle</FormLabel>
                      <FormControl>
                        <Input placeholder="mybusiness" {...field} data-testid="input-instagram" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="orderUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website / order URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://order.mybusiness.ca" {...field} data-testid="input-order-url" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pricingItemsJson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pricing (JSON array)</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={8}
                        placeholder={`[\n  {\n    "name": "Standard",\n    "description": "…",\n    "price": "99",\n    "currency": "CAD",\n    "note": null,\n    "linkUrl": null\n  }\n]`}
                        className="border-white/15 bg-white/5 font-mono text-sm text-slate-100 placeholder:text-slate-500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St, Toronto, ON" {...field} data-testid="input-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="Toronto" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="galleryUrlsText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gallery image URLs</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder={"One image URL per line\nhttps://..."}
                        className="border-white/15 bg-white/5 text-slate-100 placeholder:text-slate-500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="totalDeliveries"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total deliveries</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="totalClients"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total clients</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ratingStr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rating (0–5)</FormLabel>
                      <FormControl>
                        <Input placeholder="4.9" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://cdn.example.com/logo.png" {...field} data-testid="input-logo-url" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="profilePhotoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profile Photo URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://cdn.example.com/profile.jpg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bannerUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Banner URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://cdn.example.com/banner.jpg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="shortBio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Short Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="A short introduction shown near the top of the profile."
                        className="border-white/15 bg-white/5 text-slate-100 placeholder:text-slate-500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="businessDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Description</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={5}
                        placeholder="Detailed profile description for the public card page."
                        className="border-white/15 bg-white/5 text-slate-100 placeholder:text-slate-500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bannerColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Banner Color</FormLabel>
                    <FormControl>
                      <div className="flex gap-3 items-center">
                        <input
                          type="color"
                          {...field}
                          className="h-10 w-10 cursor-pointer rounded border border-white/20 bg-transparent"
                          data-testid="input-banner-color"
                        />
                        <Input
                          value={field.value}
                          onChange={field.onChange}
                          className="w-32 border-white/15 bg-white/5 text-slate-100"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Plan & Subscription */}
          <Card className="border-white/10 bg-white/5 shadow-xl backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-100">Plan & Subscription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="plan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger
                            className="border-white/15 bg-white/5 text-slate-100"
                            data-testid="select-plan"
                          >
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="basic">Basic — $10/mo</SelectItem>
                          <SelectItem value="pro">Pro — $20/mo</SelectItem>
                          <SelectItem value="business">Business — $30/mo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expiresAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-expires-at" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="ownerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Jane Doe" {...field} data-testid="input-owner-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ownerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner Email</FormLabel>
                      <FormControl>
                        <Input placeholder="jane@business.ca" {...field} data-testid="input-owner-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {isEdit && profile?.isClaimed === true ? (
            <Card className="border-white/10 bg-white/5 shadow-xl backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-slate-100">
                  Wallet / gift credit
                </CardTitle>
                <p className="text-xs text-slate-400">
                  بعد از فعال‌سازی مشتری، موجودی را اینجا کم یا زیاد کنید؛ مبلغ مصرف‌شده از تاریخچهٔ تراکنش‌ها محاسبه می‌شود.
                </p>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-200">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Current balance
                    </p>
                    <p className="text-lg font-semibold text-cyan-200">
                      ${Number(profile.creditBalance ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Credit expires
                    </p>
                    <p className="text-slate-100">
                      {profile.creditExpiresAt
                        ? new Date(profile.creditExpiresAt).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                </div>
                {creditLedger ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Total credited (lifetime)
                      </p>
                      <p className="font-medium text-emerald-200">${creditLedger.totalCredited}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Total used (debits)
                      </p>
                      <p className="font-medium text-amber-200">${creditLedger.totalDebited}</p>
                    </div>
                  </div>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-slate-300">Adjust (+ add / − subtract)</Label>
                    <Input
                      value={creditDelta}
                      onChange={(e) => setCreditDelta(e.target.value)}
                      placeholder="e.g. -40 or 25"
                      className="border-white/15 bg-white/5 text-slate-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-300">Reason (optional)</Label>
                    <Input
                      value={creditReason}
                      onChange={(e) => setCreditReason(e.target.value)}
                      placeholder="Promo correction, refund…"
                      className="border-white/15 bg-white/5 text-slate-100"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="bg-white/10 text-slate-100 hover:bg-white/15"
                  disabled={adjustCredit.isPending}
                  onClick={() => applyCreditAdjust()}
                >
                  {adjustCredit.isPending ? "Applying…" : "Apply wallet adjustment"}
                </Button>
                {creditLedger && creditLedger.transactions.length > 0 ? (
                  <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-2 text-xs">
                    <p className="mb-1 font-semibold text-slate-400">Recent ledger</p>
                    {creditLedger.transactions.slice(0, 25).map((tx) => (
                      <div
                        key={tx.id}
                        className="flex justify-between gap-2 border-b border-white/5 py-1 text-slate-300 last:border-0"
                      >
                        <span>
                          <span
                            className={
                              tx.type === "credit" ? "text-emerald-400" : "text-amber-400"
                            }
                          >
                            {tx.type === "credit" ? "+" : "−"}
                            ${tx.amount}
                          </span>{" "}
                          <span className="text-slate-500">{tx.reason}</span>
                        </span>
                        <span className="shrink-0 text-slate-500">
                          {new Date(tx.createdAt).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {(!isEdit || profile?.isClaimed !== true) && (
            <Card className="border-white/10 bg-white/5 shadow-xl backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-slate-100">
                  Activation gift (before customer activates)
                </CardTitle>
                <p className="text-xs text-slate-400">
                  خالی = پیش‌فرض سیستم (~۴۵ دلار) هنگام فعال‌سازی؛ ۰ = بدون هدیه؛ عدد دلخواه = همان مبلغ هدیه.
                </p>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="activationGiftPresetStr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Welcome credit amount (CAD)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          inputMode="decimal"
                          placeholder="empty = default, 0 = none, 50 = $50"
                          className="border-white/15 bg-white/5 text-slate-100 placeholder:text-slate-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            <Link href="/admin/cards">
              <Button
                type="button"
                variant="outline"
                className="border-white/20 bg-white/5 text-slate-100 hover:bg-white/10"
                data-testid="button-cancel"
              >
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-[0_10px_28px_rgba(59,130,246,0.35)] transition-transform hover:scale-[1.02]"
              data-testid="button-submit"
            >
              {isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Card"}
            </Button>
          </div>
        </form>
      </Form>

      {/* Analytics (edit mode only) */}
      {isEdit && analytics && (
        <Card className="border-white/10 bg-white/5 shadow-xl backdrop-blur-xl" data-testid="card-analytics">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-100">
              Tap Analytics (Last 30 days) — {analytics.totalTaps} total taps
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.tapsByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={analytics.tapsByDay}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-slate-300">No taps in the last 30 days</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
