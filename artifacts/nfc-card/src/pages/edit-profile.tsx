import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useGetMe,
  useGetProfile,
  useUpdateProfile,
  getGetMeQueryKey,
  getGetProfileQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const editProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
  phone: z.string().min(7, "Please enter a valid phone"),
  website: z.string().url("Please enter a valid URL").or(z.literal("")).optional(),
  instagram: z.string().optional(),
  whatsapp: z.string().optional(),
  bio: z.string().max(280, "Bio must be under 280 characters").optional(),
  logo: z.string().url("Please enter a valid image URL").or(z.literal("")).optional(),
});

type EditProfileForm = z.infer<typeof editProfileSchema>;

export default function EditProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading: userLoading } = useGetMe({
    query: { queryKey: getGetMeQueryKey() }
  });
  const { data: profile, isLoading: profileLoading } = useGetProfile({
    query: { queryKey: getGetProfileQueryKey() }
  });

  const updateProfile = useUpdateProfile();

  const form = useForm<EditProfileForm>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      name: "",
      businessName: "",
      phone: "",
      website: "",
      instagram: "",
      whatsapp: "",
      bio: "",
      logo: "",
    },
  });

  useEffect(() => {
    if (user && profile) {
      form.reset({
        name: user.name || "",
        businessName: user.businessName || "",
        phone: user.phone || "",
        website: profile.website || "",
        instagram: profile.instagram || "",
        whatsapp: profile.whatsapp || "",
        bio: profile.bio || "",
        logo: profile.logo || "",
      });
    }
  }, [user, profile, form]);

  if (userLoading || profileLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const onSubmit = (data: EditProfileForm) => {
    updateProfile.mutate(
      {
        data: {
          name: data.name,
          businessName: data.businessName,
          phone: data.phone,
          website: data.website || null,
          instagram: data.instagram || null,
          whatsapp: data.whatsapp || null,
          bio: data.bio || null,
          logo: data.logo || null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
          toast({ title: "Profile updated", description: "Your changes have been saved." });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="max-w-lg" data-testid="edit-profile-content">
      <h1 className="text-2xl font-bold mb-1">Edit Profile</h1>
      <p className="text-gray-500 text-sm mb-6">Your changes are instantly reflected on your public card.</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-white border rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Basic Information</h2>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Smith" data-testid="input-name" {...field} />
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
                  <FormLabel>Business Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Smith Logistics" data-testid="input-business-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 234 567 8900" data-testid="input-phone" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="A short description about you or your business..."
                      className="resize-none"
                      rows={3}
                      data-testid="input-bio"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="bg-white border rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Links & Social</h2>

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com" data-testid="input-website" {...field} />
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
                    <Input placeholder="@yourhandle" data-testid="input-instagram" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="whatsapp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 234 567 8900" data-testid="input-whatsapp" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="logo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile Photo URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/photo.jpg" data-testid="input-logo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base"
            disabled={updateProfile.isPending}
            data-testid="button-save-profile"
          >
            {updateProfile.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
