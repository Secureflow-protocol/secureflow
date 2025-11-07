import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { getCurrentNetwork, CONTRACTS } from "@/lib/web3/stellar-config";
import type { WalletState } from "@/lib/web3/types";
import { useToast } from "@/hooks/use-toast";
import {
  Contract,
  rpc,
  Address,
  nativeToScVal,
  scValToNative,
  xdr,
  TransactionBuilder,
  Operation,
  Networks,
} from "@stellar/stellar-sdk";
import {
  wallet,
  connectWallet as connectWalletUtil,
  disconnectWallet as disconnectWalletUtil,
} from "@/util/wallet";
import storage from "@/util/storage";

interface Web3ContextType {
  wallet: WalletState;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: (network: "testnet" | "mainnet" | "local") => Promise<void>;
  getContract: (contractId: string) => any;
  isOwner: boolean;
  network: ReturnType<typeof getCurrentNetwork>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export function Web3Provider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
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
            // Get balance from RPC
            try {
              const server = createRpcServer();
              const account = await server.getAccount(publicKey);
              const balance = account.balances.find(
                (b: any) => b.asset_type === "native"
              );

              setWalletState({
                address: publicKey,
                chainId: null, // Stellar doesn't use chain IDs
                isConnected: true,
                balance: balance ? parseFloat(balance.balance).toFixed(4) : "0",
              });

              await checkOwnerStatus(publicKey);
            } catch (error) {
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

        // Get balance
        try {
          const server = createRpcServer();
          const account = await server.getAccount(publicKey);
          const balance = account.balances.find(
            (b: any) => b.asset_type === "native"
          );

          setWalletState({
            address: publicKey,
            chainId: null,
            isConnected: true,
            balance: balance ? parseFloat(balance.balance).toFixed(4) : "0",
          });

          await checkOwnerStatus(publicKey);

          toast({
            title: "Wallet connected",
            description: `Connected to ${publicKey.slice(
              0,
              6
            )}...${publicKey.slice(-4)}`,
          });
        } catch (error) {
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
    if (!contractId) {
      console.error("Contract ID is required");
      return null;
    }

    const contract = new Contract(contractId);
    const server = createRpcServer();

    return {
      async call(method: string, ...args: any[]) {
        try {
          // Convert arguments to ScVal
          const methodArgs = args.map((arg) => {
            if (typeof arg === "string") {
              // Check if it's an address
              try {
                return Address.fromString(arg).toScVal();
              } catch {
                // It's a string, not an address
                return nativeToScVal(arg, { type: "string" });
              }
            } else if (typeof arg === "number") {
              return nativeToScVal(arg, { type: "i128" });
            } else if (typeof arg === "boolean") {
              return nativeToScVal(arg, { type: "bool" });
            }
            return nativeToScVal(arg);
          });

          // Simulate the call
          const result = await server.simulateTransaction(
            contract.call(method, ...methodArgs)
          );

          if (result.errorResult) {
            throw new Error(result.errorResult.value().toString());
          }

          // Convert result back to native format
          if (result.returnValue) {
            try {
              return scValToNative(result.returnValue);
            } catch {
              return result.returnValue;
            }
          }

          return result;
        } catch (error) {
          console.error(`Error calling ${method}:`, error);
          throw error;
        }
      },
      async send(method: string, ...args: any[]) {
        try {
          if (!walletState.isConnected || !walletState.address) {
            throw new Error("Wallet not connected");
          }

          // Convert arguments to ScVal
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

          // Get source account
          const sourceAccount = await server.getAccount(walletState.address);

          // Create contract invocation operation
          const operation = contract.call(method, ...methodArgs);

          // Build transaction
          const transaction = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: network.networkPassphrase,
          })
            .addOperation(operation)
            .setTimeout(30)
            .build();

          // Prepare transaction (simulate and get resource fees)
          const prepared = await server.prepareTransaction(transaction);

          // Sign with Stellar Wallets Kit
          const signResult = await wallet.signTransaction(prepared.toXDR(), {
            address: walletState.address,
            networkPassphrase: network.networkPassphrase,
          });

          if (!signResult.signedTxXdr) {
            throw new Error("Transaction signing failed");
          }

          const signed = signResult.signedTxXdr;

          // Parse signed transaction
          const signedTx = TransactionBuilder.fromXDR(
            signed,
            network.networkPassphrase
          );

          // Submit transaction
          const response = await server.sendTransaction(signedTx);

          if (response.errorResult) {
            throw new Error(response.errorResult.value().toString());
          }

          // Wait for transaction to complete
          let txResponse = await server.getTransaction(response.hash);
          let attempts = 0;
          while (txResponse.status === "NOT_FOUND" && attempts < 10) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            txResponse = await server.getTransaction(response.hash);
            attempts++;
          }

          return response.hash;
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
