import { useState, useEffect, useCallback } from "react";
import { useWeb3 } from "@/contexts/web3-context";
import { CONTRACTS } from "@/lib/web3/config";

export function useJobCreatorStatus() {
  const { wallet, getContract } = useWeb3();
  const [isJobCreator, setIsJobCreator] = useState(false);
  const [loading, setLoading] = useState(true); // Start with true to show loading initially

  const checkJobCreatorStatus = useCallback(async () => {
    if (!wallet.isConnected || !wallet.address) {
      console.log(
        "⏸️ Job creator check skipped - wallet not connected or no address"
      );
      setIsJobCreator(false);
      setLoading(false);
      return;
    }

    console.log(
      `🔍 Checking job creator status for address: ${wallet.address}`
    );
    setLoading(true);
    try {
      const contract = getContract(CONTRACTS.SECUREFLOW_ESCROW);
      if (!contract) {
        setIsJobCreator(false);
        setLoading(false);
        return;
      }

      // Get total number of escrows
      const totalEscrows = await contract.call("next_escrow_id");
      const escrowCount = Number(totalEscrows);

      // Check if current wallet has created any escrows
      if (escrowCount > 1) {
        for (let i = 1; i < escrowCount; i++) {
          try {
            const escrowSummary = await contract.call("get_escrow", i);

            // Skip if escrow doesn't exist (Option::None)
            if (
              !escrowSummary ||
              escrowSummary === null ||
              escrowSummary === undefined
            ) {
              console.log(`⏭️ Escrow ${i} does not exist (Option::None)`);
              continue;
            }

            // Debug: Log the escrowSummary structure
            console.log(`📦 Escrow ${i} summary:`, escrowSummary);
            console.log(
              `📦 Escrow ${i} type:`,
              typeof escrowSummary,
              Array.isArray(escrowSummary)
            );
            console.log(
              `📦 Escrow ${i} keys:`,
              escrowSummary ? Object.keys(escrowSummary) : "null"
            );

            // Handle both array and object formats
            // If it's an Option<EscrowData> object, it might have a .depositor field
            // If it's an array, depositor is at index [0]
            let depositorAddress: string | null = null;

            if (Array.isArray(escrowSummary)) {
              // Array format: [depositor, beneficiary, ...]
              depositorAddress = escrowSummary[0];
            } else if (escrowSummary && typeof escrowSummary === "object") {
              // Object format: check for depositor field
              if (escrowSummary.depositor) {
                depositorAddress = escrowSummary.depositor;
              } else if (escrowSummary.creator) {
                // Some places use 'creator' instead of 'depositor'
                depositorAddress = escrowSummary.creator;
              } else if (escrowSummary.payer) {
                // Some places use 'payer' instead of 'depositor'
                depositorAddress = escrowSummary.payer;
              } else if (
                escrowSummary._value &&
                escrowSummary._value.depositor
              ) {
                // Option<EscrowData> format - unwrap the Option
                depositorAddress = escrowSummary._value.depositor;
              } else if (escrowSummary._value && escrowSummary._value.creator) {
                depositorAddress = escrowSummary._value.creator;
              }
            }

            console.log(`📦 Escrow ${i} depositor:`, depositorAddress);
            console.log(`📦 Wallet address:`, wallet.address);

            // Check if current user is the depositor (job creator)
            const isMyJob =
              wallet.address &&
              depositorAddress &&
              depositorAddress.toLowerCase().trim() ===
                wallet.address.toLowerCase().trim();

            if (isMyJob) {
              console.log(`✅ User is job creator - found job ${i}`);
              setIsJobCreator(true);
              setLoading(false);
              return;
            }
          } catch (error) {
            console.error(`Error checking escrow ${i}:`, error);
            // Skip escrows that don't exist
            continue;
          }
        }
      }

      setIsJobCreator(false);
      console.log("❌ User is not a job creator - no matching escrows found");
    } catch (error) {
      console.error("Error checking job creator status:", error);
      setIsJobCreator(false);
    } finally {
      setLoading(false);
    }
  }, [wallet.isConnected, wallet.address, getContract]);

  useEffect(() => {
    checkJobCreatorStatus();
  }, [checkJobCreatorStatus]);

  return { isJobCreator, loading };
}
