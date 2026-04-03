import { useState } from "react";
import { useGetMe, useAdminGetStats, useAdminListUsers, useAdminListCards, useAdminCreateCard, getGetMeQueryKey, getAdminGetStatsQueryKey, getAdminListUsersQueryKey, getAdminListCardsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Users, CreditCard, BarChart2, Plus, ShieldAlert } from "lucide-react";
import { useLocation } from "wouter";

export default function Admin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newCardCode, setNewCardCode] = useState("");

  const { data: me } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const { data: stats, isLoading: statsLoading } = useAdminGetStats({ query: { queryKey: getAdminGetStatsQueryKey() } });
  const { data: users, isLoading: usersLoading } = useAdminListUsers({ query: { queryKey: getAdminListUsersQueryKey() } });
  const { data: cards, isLoading: cardsLoading } = useAdminListCards({ query: { queryKey: getAdminListCardsQueryKey() } });

  const createCard = useAdminCreateCard();

  if (me && !me.isAdmin) {
    setLocation("/dashboard");
    return null;
  }

  const handleCreateCard = () => {
    if (!newCardCode.trim()) return;
    createCard.mutate(
      { data: { cardCode: newCardCode.trim() } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getAdminGetStatsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getAdminListCardsQueryKey() });
          setNewCardCode("");
          toast({ title: "Card created", description: `Card ${newCardCode.trim()} is ready.` });
        },
        onError: (err: unknown) => {
          const msg = (err as { data?: { error?: string } })?.data?.error ?? "Failed to create card.";
          toast({ title: "Error", description: msg, variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="space-y-6" data-testid="admin-content">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center">
          <ShieldAlert className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-gray-500 text-sm">Manage users and NFC cards</p>
        </div>
      </div>

      {statsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border rounded-xl p-4" data-testid="stat-total-users">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1">
              <Users className="w-4 h-4" />
              Total Users
            </div>
            <div className="text-3xl font-bold">{stats?.totalUsers ?? 0}</div>
          </div>
          <div className="bg-white border rounded-xl p-4" data-testid="stat-total-cards">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1">
              <CreditCard className="w-4 h-4" />
              Total Cards
            </div>
            <div className="text-3xl font-bold">{stats?.totalCards ?? 0}</div>
          </div>
          <div className="bg-white border rounded-xl p-4" data-testid="stat-active-cards">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1">
              <CreditCard className="w-4 h-4 text-green-500" />
              Active
            </div>
            <div className="text-3xl font-bold">{stats?.activeCards ?? 0}</div>
          </div>
          <div className="bg-white border rounded-xl p-4" data-testid="stat-credits">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1">
              <BarChart2 className="w-4 h-4" />
              Credits Issued
            </div>
            <div className="text-3xl font-bold">${stats?.totalCreditsIssued ?? 0}</div>
          </div>
        </div>
      )}

      <div className="bg-white border rounded-xl p-5">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create New Card
        </h2>
        <div className="flex gap-3">
          <Input
            placeholder="e.g. C1006"
            value={newCardCode}
            onChange={e => setNewCardCode(e.target.value)}
            className="max-w-xs"
            data-testid="input-new-card-code"
          />
          <Button
            onClick={handleCreateCard}
            disabled={createCard.isPending || !newCardCode.trim()}
            data-testid="button-create-card"
          >
            {createCard.isPending ? "Creating..." : "Create Card"}
          </Button>
        </div>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users ({users?.length ?? 0})
          </h2>
        </div>
        <div className="overflow-x-auto">
          {usersLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <table className="w-full text-sm" data-testid="table-users">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Username</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users?.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50" data-testid={`row-user-${user.id}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <div className="text-gray-500 text-xs">{user.businessName}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{user.email}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">@{user.username}</td>
                    <td className="px-4 py-3">
                      <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2 py-1 rounded">
                        ${user.totalCredit - user.usedCredit} left
                      </span>
                    </td>
                  </tr>
                ))}
                {(!users || users.length === 0) && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No users yet</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Cards ({cards?.length ?? 0})
          </h2>
        </div>
        <div className="overflow-x-auto">
          {cardsLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <table className="w-full text-sm" data-testid="table-cards">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Card Code</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">User ID</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {cards?.map(card => (
                  <tr key={card.id} className="hover:bg-gray-50" data-testid={`row-card-${card.id}`}>
                    <td className="px-4 py-3 font-mono font-medium text-gray-900">{card.cardCode}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${card.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                        {card.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                      {card.userId ?? "—"}
                    </td>
                  </tr>
                ))}
                {(!cards || cards.length === 0) && (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No cards yet</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
