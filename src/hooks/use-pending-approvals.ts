import { useState, useEffect } from "react";
import { useWeb3 } from "@/contexts/web3-context";
import { CONTRACTS } from "@/lib/web3/config";

export function usePendingApprovals() {
  const { wallet, getContract } = useWeb3();
  const [hasPendingApprovals, setHasPendingApprovals] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!wallet.isConnected || !wallet.address) {
      setHasPendingApprovals(false);
      return;
    }

    checkPendingApprovals();
  }, [wallet.isConnected, wallet.address]);

  const checkPendingApprovals = async () => {
    setLoading(true);
    try {
      const contract = getContract(CONTRACTS.SECUREFLOW_ESCROW);
      if (!contract) {
        setHasPendingApprovals(false);
        return;
      }

      // Get total number of escrows
      const totalEscrows = await contract.call("next_escrow_id");
      const escrowCount = Number(totalEscrows);

      // Check if current wallet has any jobs with applications
      if (escrowCount > 1) {
        for (let i = 1; i < escrowCount; i++) {
          try {
            const escrowSummary = await contract.call("get_escrow", i);

            // Check if current user is the depositor (job creator)
            const isMyJob =
              wallet.address &&
              escrowSummary[0] &&
              escrowSummary[0].toLowerCase().trim() ===
                wallet.address.toLowerCase().trim();

            if (isMyJob) {
              // Check if this is an open job (no freelancer assigned yet)
              const isOpenJob =
                escrowSummary[1] ===
                "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

              if (isOpenJob) {
                // Check if there are applications for this job using contractService
                try {
                  const { contractService } = await import(
                    "@/lib/web3/contract-service"
                  );
                  const applications = await contractService.getApplications(i);

                  if (applications && applications.length > 0) {
                    setHasPendingApprovals(true);
                    setLoading(false);
                    return;
                  }
                } catch (error) {
                  // Skip if can't get applications
                  continue;
                }
              }
            }
          } catch (error) {
            // Skip escrows that don't exist
            continue;
          }
        }
      }

      setHasPendingApprovals(false);
    } catch (error) {
      setHasPendingApprovals(false);
    } finally {
      setLoading(false);
    }
  };

  return {
    hasPendingApprovals,
    loading,
    refreshApprovals: checkPendingApprovals,
  };
}
