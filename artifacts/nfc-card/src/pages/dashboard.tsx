import { useGetMe, useGetCredits, getGetMeQueryKey, getGetCreditsQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CreditCard, Settings, ExternalLink, DollarSign, User } from "lucide-react";

export default function Dashboard() {
  const { data: user, isLoading: userLoading } = useGetMe({
    query: { queryKey: getGetMeQueryKey() }
  });
  const { data: credits, isLoading: creditsLoading } = useGetCredits({
    query: { queryKey: getGetCreditsQueryKey() }
  });

  if (userLoading || creditsLoading) {
    return (
      <div className="space-y-4" data-testid="dashboard-loading">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard-content">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {user?.name?.split(" ")[0]}
        </h1>
        <p className="text-gray-500 text-sm mt-1">{user?.businessName}</p>
      </div>

      <div className="bg-black text-white rounded-xl p-6">
        <div className="flex items-center gap-3 mb-1">
          <DollarSign className="w-5 h-5" />
          <span className="text-sm font-medium text-gray-300">Available Credit</span>
        </div>
        <div className="text-4xl font-bold mt-1" data-testid="text-credit-balance">
          ${credits?.available ?? 0}
        </div>
        <div className="flex gap-6 mt-4 text-sm text-gray-400">
          <span>Total: ${credits?.total ?? 0}</span>
          <span>Used: ${credits?.used ?? 0}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href={`/u/${user?.username}`}>
          <div className="bg-white border rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer" data-testid="card-view-profile">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
              <ExternalLink className="w-5 h-5 text-gray-700" />
            </div>
            <h3 className="font-semibold text-gray-900">View My Card</h3>
            <p className="text-sm text-gray-500 mt-1">See how your public profile looks</p>
          </div>
        </Link>

        <Link href="/edit-profile">
          <div className="bg-white border rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer" data-testid="card-edit-profile">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
              <Settings className="w-5 h-5 text-gray-700" />
            </div>
            <h3 className="font-semibold text-gray-900">Edit Profile</h3>
            <p className="text-sm text-gray-500 mt-1">Update your contact info and links</p>
          </div>
        </Link>
      </div>

      <div className="bg-white border rounded-xl p-5">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User className="w-4 h-4" />
          Account Info
        </h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Name</span>
            <span className="font-medium text-gray-900" data-testid="text-user-name">{user?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span className="font-medium text-gray-900" data-testid="text-user-email">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Username</span>
            <span className="font-medium text-gray-900" data-testid="text-username">@{user?.username}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Phone</span>
            <span className="font-medium text-gray-900" data-testid="text-phone">{user?.phone}</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border border-dashed rounded-xl p-4 text-center">
        <p className="text-sm text-gray-500">Share your card</p>
        <p className="font-mono text-sm font-medium mt-1 text-gray-900 break-all" data-testid="text-card-url">
          {window.location.origin}/u/{user?.username}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          data-testid="button-copy-link"
          onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/u/${user?.username}`);
          }}
        >
          Copy Link
        </Button>
      </div>
    </div>
  );
}
