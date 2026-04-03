import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useGetCard, getGetCardQueryKey } from "@workspace/api-client-react";
import { Spinner } from "@/components/ui/spinner";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function CardScan() {
  const { code } = useParams();
  const [, setLocation] = useLocation();

  const { data: card, isLoading, error } = useGetCard(code!, {
    query: {
      enabled: !!code,
      queryKey: getGetCardQueryKey(code!),
      retry: false
    }
  });

  useEffect(() => {
    if (card) {
      if (card.status === "new") {
        setLocation(`/activate/${code}`);
      } else if (card.status === "active") {
        setLocation(`/activate/${code}?already=true`);
      }
    }
  }, [card, code, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-gray-50 p-6">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-500 font-medium">Reading card...</p>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-gray-50 p-6">
        <Alert variant="destructive" className="max-w-md w-full">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Card not found</AlertTitle>
          <AlertDescription>
            This card appears to be invalid or does not exist. Please contact support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-gray-50 p-6">
      <Spinner size="lg" />
      <p className="mt-4 text-gray-500 font-medium">Redirecting...</p>
    </div>
  );
}
