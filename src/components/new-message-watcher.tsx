import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useWeb3 } from "@/contexts/web3-context";
import { useToast } from "@/hooks/use-toast";
import { getUnreadMessageCount, isApiConfigured } from "@/lib/api";

const POLL_INTERVAL_MS = 20_000;

/**
 * Invisible component that polls for unread messages every 20 s.
 * When the count rises it fires a toast with a "View" action.
 * Mount once inside AppLayout so it's always active.
 */
export function NewMessageWatcher() {
  const { wallet } = useWeb3();
  const { toast } = useToast();
  const navigate = useNavigate();
  const prevCount = useRef<number | null>(null);

  useEffect(() => {
    if (!wallet.address || !isApiConfigured()) return;

    const check = async () => {
      try {
        const count = await getUnreadMessageCount(wallet.address!);
        if (prevCount.current !== null && count > prevCount.current) {
          const delta = count - prevCount.current;
          toast({
            title: delta === 1 ? "New message" : `${delta} new messages`,
            description: "You have unread messages waiting for you.",
            action: (
              <button
                onClick={() => navigate("/messages")}
                className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                View
              </button>
            ) as any,
          });
        }
        prevCount.current = count;
      } catch {
        /* non-critical */
      }
    };

    void check();
    const id = setInterval(() => void check(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [wallet.address, toast, navigate]);

  return null;
}
