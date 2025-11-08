import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { getCurrentNetwork } from "@/lib/web3/stellar-config";
import type { WalletState } from "@/lib/web3/types";
import { useToast } from "@/hooks/use-toast";
import {
  Contract,
  rpc,
  Address,
  nativeToScVal,
  scValToNative,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import {
  wallet,
  connectWallet as connectWalletUtil,
  disconnectWallet as disconnectWalletUtil,
} from "@/util/wallet";
import { useWallet } from "@/hooks/useWallet";
import storage from "@/util/storage";
import { Client as SecureFlowClient } from "@/contracts/generated/src/index";

interface Web3ContextType {
  wallet: WalletState;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: (network: "testnet" | "mainnet" | "local") => Promise<void>;
  getContract: (contractId: string) => any;
  isOwner: boolean;
  network: ReturnType<typeof getCurrentNetwork>;
  refreshBalance: () => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export function Web3Provider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { signTransaction: walletSignTransaction } = useWallet();
  const [walletState, setWalletState] = useState<WalletState>({
    address: null,
    chainId: null,
    isConnected: false,
    balance: "0",
  });
  const [isOwner, setIsOwner] = useState(false);
  const network = getCurrentNetwork();

  // Lazy initialization of RPC server to avoid undefined errors
  const getRpcServer = useMemo(() => {
    if (!rpc || !rpc.Server) {
      console.error(
        "rpc.Server is not available. Please check @stellar/stellar-sdk installation."
      );
      return null;
    }
    return () => new rpc.Server(network.rpcUrl);
  }, [network.rpcUrl]);

  const createRpcServer = () => {
    if (!getRpcServer) {
      throw new Error(
        "rpc.Server is not available. Please check @stellar/stellar-sdk installation."
      );
    }
    return getRpcServer();
  };

  useEffect(() => {
    checkConnection();

    // Check connection periodically
    const interval = setInterval(() => {
      if (!walletState.isConnected) {
        checkConnection();
      }
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const checkConnection = async () => {
    try {
      const walletId = storage.getItem("walletId");
      const walletAddr = storage.getItem("walletAddress");

      if (walletId && walletAddr) {
        try {
          wallet.setWallet(walletId);
          const addressResult = await wallet.getAddress();
          const publicKey = addressResult.address;

          if (publicKey) {
            // Get balance from Horizon API (more reliable than RPC)
            try {
              const { Horizon } = await import("@stellar/stellar-sdk");
              const horizonUrl =
                network.horizonUrl || "https://horizon-testnet.stellar.org";
              const horizon = new Horizon.Server(horizonUrl);

              const account = await horizon
                .accounts()
                .accountId(publicKey)
                .call();
              const nativeBalance = account.balances.find(
                (b: any) => b.asset_type === "native"
              );

              setWalletState({
                address: publicKey,
                chainId: null, // Stellar doesn't use chain IDs
                isConnected: true,
                balance: nativeBalance
                  ? parseFloat(nativeBalance.balance).toFixed(4)
                  : "0",
              });

              await checkOwnerStatus(publicKey);
            } catch (error: any) {
              console.error("Error fetching balance:", error);
              // If account doesn't exist yet, still set connected
              setWalletState({
                address: publicKey,
                chainId: null,
                isConnected: true,
                balance: "0",
              });
              await checkOwnerStatus(publicKey);
            }
          }
        } catch (error) {
          // Wallet not connected
          console.log("Wallet not connected");
        }
      }
    } catch (error) {
      // Wallet not available or not connected
      console.log("Wallet not connected");
    }
  };

  const checkOwnerStatus = async (address: string) => {
    try {
      // Check if address matches known owner
      // This should be set from environment or contract
      const knownOwner = import.meta.env.VITE_OWNER_ADDRESS || "";
      setIsOwner(address === knownOwner);
    } catch (error) {
      setIsOwner(false);
    }
  };

  const connectWallet = async () => {
    try {
      // Use Stellar Wallets Kit to connect
      await connectWalletUtil();

      // Wait a bit for storage to update
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check connection
      const walletId = storage.getItem("walletId");
      const walletAddr = storage.getItem("walletAddress");

      if (walletId && walletAddr) {
        wallet.setWallet(walletId);
        const addressResult = await wallet.getAddress();
        const publicKey = addressResult.address;

        if (!publicKey) {
          toast({
            title: "Connection failed",
            description: "Could not get wallet address",
            variant: "destructive",
          });
          return;
        }

        // Get balance from Horizon API (more reliable than RPC)
        try {
          const { Horizon } = await import("@stellar/stellar-sdk");
          const horizonUrl =
            network.horizonUrl || "https://horizon-testnet.stellar.org";
          const horizon = new Horizon.Server(horizonUrl);

          const account = await horizon.accounts().accountId(publicKey).call();
          const nativeBalance = account.balances.find(
            (b: any) => b.asset_type === "native"
          );

          setWalletState({
            address: publicKey,
            chainId: null,
            isConnected: true,
            balance: nativeBalance
              ? parseFloat(nativeBalance.balance).toFixed(4)
              : "0",
          });

          await checkOwnerStatus(publicKey);

          toast({
            title: "Wallet connected",
            description: `Connected to ${publicKey.slice(
              0,
              6
            )}...${publicKey.slice(-4)}`,
          });
        } catch (error: any) {
          console.error("Error fetching balance:", error);
          // Account might not exist yet
          setWalletState({
            address: publicKey,
            chainId: null,
            isConnected: true,
            balance: "0",
          });
          await checkOwnerStatus(publicKey);

          toast({
            title: "Wallet connected",
            description: `Connected to ${publicKey.slice(
              0,
              6
            )}...${publicKey.slice(-4)}`,
          });
        }
      } else {
        toast({
          title: "Connection cancelled",
          description: "Please connect your wallet to continue",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Connection failed",
        description:
          error.message ||
          "Failed to connect wallet. Please install a Stellar wallet.",
        variant: "destructive",
      });
    }
  };

  const disconnectWallet = async () => {
    await disconnectWalletUtil();
    setWalletState({
      address: null,
      chainId: null,
      isConnected: false,
      balance: "0",
    });
    setIsOwner(false);
    toast({
      title: "Wallet disconnected",
      description: "Your wallet has been disconnected",
    });
  };

  const switchNetwork = async (
    targetNetwork: "testnet" | "mainnet" | "local"
  ) => {
    // Stellar networks are handled via environment variables
    // This is mainly for UI feedback
    toast({
      title: "Network switch",
      description: `Switching to ${targetNetwork}. Please update VITE_STELLAR_NETWORK in .env`,
    });
  };

  const getContract = (contractId: string) => {
    if (!contractId || contractId === "") {
      console.error(
        "Contract ID is required. Please set VITE_SECUREFLOW_CONTRACT_ID in your .env file"
      );
      console.error("Current contract ID:", contractId);
      return null;
    }

    // Use the generated contract client for type-safe contract interactions
    const client = new SecureFlowClient({
      contractId,
      networkPassphrase: network.networkPassphrase,
      rpcUrl: network.rpcUrl,
    });

    // Return a wrapper that provides both the generated client and a compatible interface
    return {
      // Generated client with all typed methods
      client,

      // Legacy call interface for backward compatibility
      async call(method: string, ...args: any[]) {
        try {
          // Use the generated client's methods for read operations
          if (method === "get_escrow" && args[0] !== undefined) {
            const assembledTx = await client.get_escrow({ escrow_id: args[0] });
            // The client automatically simulates, so we can access the result directly
            return assembledTx.result;
          }

          if (method === "get_user_escrows" && args[0] !== undefined) {
            const assembledTx = await client.get_user_escrows({
              user: args[0],
            });
            return assembledTx.result;
          }

          if (method === "get_reputation" && args[0] !== undefined) {
            const assembledTx = await client.get_reputation({ user: args[0] });
            return assembledTx.result;
          }

          if (method === "owner") {
            // The contract stores owner in instance storage with DataKey::Owner
            // For now, we'll use the environment variable with a fallback
            const DEFAULT_OWNER =
              "GC2AVGP5VDS27LR5LWTUPWZUJSPZXT6V7ZORJ5RKYJVHYXXANWTFXYLG";
            const ownerFromEnv =
              import.meta.env.VITE_OWNER_ADDRESS || DEFAULT_OWNER;
            return ownerFromEnv;
          }

          if (method === "next_escrow_id") {
            // The contract stores NextEscrowId in instance storage with DataKey::NextEscrowId
            // For now, return a default value (1 means no escrows created yet)
            // In production, this should be read from contract storage
            // TODO: Implement proper contract storage reading for NextEscrowId
            try {
              // Try to read from contract storage if possible
              // For now, return 1 as default (no escrows created)
              return 1;
            } catch (error) {
              console.warn(
                "Error getting next_escrow_id, returning default:",
                error
              );
              return 1;
            }
          }

          if (method === "paused") {
            // Check if contract is paused (this might need to be added to the contract)
            return false;
          }

          // Fallback for methods not in the map
          // Some methods like next_escrow_id don't exist as contract methods
          // They should be handled above, but if we get here, return a safe default
          if (method === "next_escrow_id") {
            return 1; // Default: no escrows created yet
          }

          console.warn(
            `Method ${method} not found in generated client, using fallback`
          );

          try {
            const contract = new Contract(contractId);
            const server = createRpcServer();

            const methodArgs = args.map((arg) => {
              if (typeof arg === "string") {
                try {
                  return Address.fromString(arg).toScVal();
                } catch {
                  return nativeToScVal(arg, { type: "string" });
                }
              } else if (typeof arg === "number") {
                return nativeToScVal(arg, { type: "i128" });
              } else if (typeof arg === "boolean") {
                return nativeToScVal(arg, { type: "bool" });
              }
              return nativeToScVal(arg);
            });

            const result = await server.simulateTransaction(
              contract.call(method, ...methodArgs)
            );

            if (result.errorResult) {
              throw new Error(result.errorResult.value().toString());
            }

            if (result.returnValue) {
              try {
                return scValToNative(result.returnValue);
              } catch {
                return result.returnValue;
              }
            }

            return result;
          } catch (fallbackError: any) {
            // If fallback also fails, return a safe default for known methods
            if (method === "next_escrow_id") {
              return 1;
            }
            console.error(`Error in fallback for ${method}:`, fallbackError);
            throw fallbackError;
          }
        } catch (error) {
          console.error(`Error calling ${method}:`, error);
          throw error;
        }
      },

      // Legacy send interface for backward compatibility
      async send(method: string, ...args: any[]) {
        try {
          console.log(`send() called with method: ${method}`, {
            isConnected: walletState.isConnected,
            address: walletState.address,
            args,
          });

          if (!walletState.isConnected || !walletState.address) {
            throw new Error("Wallet not connected");
          }

          console.log(`Sending transaction: ${method}`, { args });

          // Use the generated client's methods for sending transactions
          let assembledTx: any;

          if (method === "create_escrow" && args[0]) {
            console.log("Creating escrow with args:", args[0]);
            console.log("Calling client.create_escrow()...");
            try {
              // Convert null to undefined for Option types
              // The generated client expects Option<string> which uses undefined for None
              const createArgs = {
                ...args[0],
                beneficiary: args[0].beneficiary ?? undefined,
                token: args[0].token ?? undefined,
              };
              console.log(
                "Converted args for create_escrow (null -> undefined):",
                createArgs
              );
              assembledTx = await client.create_escrow(createArgs);
              console.log(
                "client.create_escrow() succeeded, assembledTx:",
                assembledTx
              );
            } catch (createError: any) {
              console.error("Error in client.create_escrow():", createError);
              throw createError;
            }
          } else if (method === "start_work" && args[0]) {
            assembledTx = await client.start_work(args[0]);
          } else if (method === "submit_milestone" && args[0]) {
            assembledTx = await client.submit_milestone(args[0]);
          } else if (method === "approve_milestone" && args[0]) {
            assembledTx = await client.approve_milestone(args[0]);
          } else if (method === "apply_to_job" && args[0]) {
            assembledTx = await client.apply_to_job(args[0]);
          } else if (method === "accept_freelancer" && args[0]) {
            assembledTx = await client.accept_freelancer(args[0]);
          } else if (method === "refund_escrow" && args[0]) {
            assembledTx = await client.refund_escrow(args[0]);
          } else if (method === "emergency_refund_after_deadline" && args[0]) {
            assembledTx = await client.emergency_refund_after_deadline(args[0]);
          } else if (method === "extend_deadline" && args[0]) {
            assembledTx = await client.extend_deadline(args[0]);
          } else if (method === "set_platform_fee_bp" && args[0]) {
            assembledTx = await client.set_platform_fee_bp(args[0]);
          } else if (method === "set_fee_collector" && args[0]) {
            assembledTx = await client.set_fee_collector(args[0]);
          } else if (method === "whitelist_token" && args[0]) {
            assembledTx = await client.whitelist_token(args[0]);
          } else if (method === "authorize_arbiter" && args[0]) {
            assembledTx = await client.authorize_arbiter(args[0]);
          } else {
            throw new Error(
              `Method ${method} not supported in generated client`
            );
          }

          console.log("Assembled transaction:", assembledTx);

          // Sign the transaction manually, then send via RPC
          const xdr = assembledTx.toXDR();
          console.log(
            "Transaction XDR created, requesting wallet signature..."
          );
          console.log("Wallet state:", {
            address: walletState.address,
            network: network.networkPassphrase,
          });

          try {
            // Use signTransaction from WalletProvider if available, otherwise fallback to wallet instance
            const signTx = walletSignTransaction || wallet.signTransaction;
            console.log("About to call signTransaction...", {
              hasWalletSignTransaction: !!walletSignTransaction,
              hasWalletSignTransactionMethod: !!wallet.signTransaction,
              signTxType: typeof signTx,
              address: walletState.address,
              networkPassphrase: network.networkPassphrase,
            });

            if (!signTx) {
              throw new Error("signTransaction method is not available");
            }

            // Sign the transaction - this will trigger the wallet popup
            console.log(
              "Calling signTransaction now - wallet popup should appear..."
            );
            const signResult = await signTx(xdr, {
              address: walletState.address,
              networkPassphrase: network.networkPassphrase,
            });

            console.log("Sign result received:", signResult);

            if (!signResult || !signResult.signedTxXdr) {
              throw new Error(
                "Transaction signing failed - no signed transaction received"
              );
            }

            // Parse the signed XDR back into a Transaction object
            console.log("Parsing signed XDR to Transaction object...");
            const signedTransaction = TransactionBuilder.fromXDR(
              signResult.signedTxXdr,
              network.networkPassphrase
            );

            // Send the signed transaction via RPC
            console.log("Sending signed transaction via RPC...");
            const server = createRpcServer();
            const sendResponse =
              await server.sendTransaction(signedTransaction);

            console.log("Transaction sent successfully:", sendResponse);

            if (sendResponse.errorResult) {
              throw new Error(
                `Transaction failed: ${sendResponse.errorResult.value()}`
              );
            }

            if (sendResponse.status === "ERROR") {
              throw new Error(
                `Transaction error: ${JSON.stringify(sendResponse)}`
              );
            }

            // Extract transaction hash from response
            const txHash = sendResponse.hash || sendResponse.id || "";
            console.log("Transaction hash:", txHash);
            return txHash;
          } catch (signError: any) {
            console.error("Error during transaction signing:", signError);
            if (
              signError.message?.includes("User rejected") ||
              signError.message?.includes("rejected")
            ) {
              throw new Error("Transaction was rejected by user");
            }
            throw signError;
          }
        } catch (error: any) {
          console.error(`Error sending ${method}:`, error);
          throw error;
        }
      },

      async owner() {
        // Return owner address if available
        return import.meta.env.VITE_OWNER_ADDRESS || "";
      },
    };
  };

  const refreshBalance = async () => {
    if (!walletState.isConnected || !walletState.address) {
      return;
    }

    try {
      const { Horizon } = await import("@stellar/stellar-sdk");
      const horizonUrl =
        network.horizonUrl || "https://horizon-testnet.stellar.org";
      const horizon = new Horizon.Server(horizonUrl);

      const account = await horizon
        .accounts()
        .accountId(walletState.address)
        .call();
      const nativeBalance = account.balances.find(
        (b: any) => b.asset_type === "native"
      );

      setWalletState((prev) => ({
        ...prev,
        balance: nativeBalance
          ? parseFloat(nativeBalance.balance).toFixed(4)
          : "0",
      }));
    } catch (error) {
      console.error("Error refreshing balance:", error);
    }
  };

  return (
    <Web3Context.Provider
      value={{
        wallet: walletState,
        connectWallet,
        disconnectWallet,
        switchNetwork,
        getContract,
        isOwner,
        network,
        refreshBalance,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return context;
}
