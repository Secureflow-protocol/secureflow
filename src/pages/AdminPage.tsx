import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAdminStatus } from "@/hooks/use-admin-status";
import { useToast } from "@/hooks/use-toast";
import { CONTRACTS } from "@/lib/web3/config";
import {
  usePauseJobCreation,
  useUnpauseJobCreation,
  useAuthorizeArbiter,
} from "@/hooks/use-admin";
import { contractService } from "@/lib/web3/contract-service";
import { useWeb3 } from "@/contexts/web3-context";

// Unused imports removed: AdminHeader, AdminStats, ContractControls, AdminLoading
import { DisputeResolution } from "@/components/admin/dispute-resolution";
import { Lock, Shield, Play, Pause, AlertTriangle, User, Scale } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AdminPage() {
  const { wallet } = useWeb3();
  const {
    isAdmin,
    isOwner,
    isArbiter,
    loading: adminLoading,
  } = useAdminStatus();
  const { toast } = useToast();
  const pauseJobCreation = usePauseJobCreation();
  const unpauseJobCreation = useUnpauseJobCreation();
  const authorizeArbiterMutation = useAuthorizeArbiter();
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contractOwner, setContractOwner] = useState<string | null>(null);
  const [feeCollector, setFeeCollector] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionType, setActionType] = useState<
    "pause" | "unpause" | "authorizeArbiter" | null
  >(null);
  const [arbiterAddress, setArbiterAddress] = useState("");
  const [tokenToWhitelist, setTokenToWhitelist] = useState("");
  const [whitelistedTokenList, setWhitelistedTokenList] = useState<string[]>([]);
  const [withdrawToken, setWithdrawToken] = useState("");
  const [withdrawTo, setWithdrawTo] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [contractStats, setContractStats] = useState({
    platformFeeBP: 0,
    totalEscrows: 0,
    totalVolume: "0",
    authorizedArbiters: 0,
    whitelistedTokens: 0,
  });

  useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      checkPausedStatus();
      fetchContractOwner();
      fetchFeeCollector();
      fetchContractStats();
    }
  }, [wallet.isConnected, wallet.address]);

  const fetchContractOwner = async () => {
    try {
      // Get owner from Soroban instance storage
      const owner = await contractService.getOwner();
      setContractOwner(owner);
    } catch (error) {
      console.error("Error fetching contract owner:", error);
      // Fallback to env variable
      const ownerFromEnv = import.meta.env.VITE_OWNER_ADDRESS;
      if (ownerFromEnv) {
        setContractOwner(ownerFromEnv);
      }
    }
  };

  const fetchFeeCollector = async () => {
    try {
      const fc = await contractService.getFeeCollector();
      setFeeCollector(fc);
    } catch (error) {
      console.error("Error fetching fee collector:", error);
      setFeeCollector(null);
    }
  };

  const fetchContractStats = async () => {
    try {
      const [platformFeeBP, totalEscrows, arbiters, tokens] = await Promise.all([
        contractService.getPlatformFeeBP(),
        contractService.getTotalEscrows(),
        contractService.getAuthorizedArbiters(),
        contractService.getWhitelistedTokens(),
      ]);
      setWhitelistedTokenList(tokens);
      setContractStats({
        platformFeeBP,
        totalEscrows,
        totalVolume: "0",
        authorizedArbiters: arbiters.length,
        whitelistedTokens: tokens.length,
      });
    } catch (error) {
      // Set empty stats if contract calls fail
      setWhitelistedTokenList([]);
      setContractStats({
        platformFeeBP: 0,
        totalEscrows: 0,
        totalVolume: "0",
        authorizedArbiters: 0,
        whitelistedTokens: 0,
      });
    }
  };

  const short = (addr: string, left = 10, right = 8) =>
    addr.length > left + right ? `${addr.slice(0, left)}…${addr.slice(-right)}` : addr;

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: `${label} copied to clipboard` });
    } catch {
      toast({
        title: "Copy failed",
        description: "Clipboard permission denied",
        variant: "destructive",
      });
    }
  };

  const checkPausedStatus = async () => {
    setLoading(true);
    try {
      // Pass the wallet address to the contract service
      const paused = await contractService.isJobCreationPaused(
        wallet.address || undefined
      );
      setIsPaused(paused);
    } catch (error) {
      console.error("Error checking pause status:", error);
      // Fallback to false if contract call fails
      setIsPaused(false);
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (type: typeof actionType) => {
    setActionType(type);
    setDialogOpen(true);
  };

  const handleAction = async () => {
    if (actionLoading) return; // Prevent double clicks

    setActionLoading(true);
    try {
      if (!wallet.isConnected || !wallet.address) {
        throw new Error("Wallet not connected");
      }

      switch (actionType) {
        case "pause":
          // Check if contract is already paused
          const currentPausedStatusForPause =
            await contractService.isJobCreationPaused(
              wallet.address || undefined
            );

          if (currentPausedStatusForPause) {
            toast({
              title: "Contract Already Paused",
              description: "The contract is already in a paused state",
              variant: "destructive",
            });
            setDialogOpen(false);
            return;
          }

          // Check if user is owner
          if (contractOwner && wallet.address !== contractOwner) {
            throw new Error(
              `Only the contract owner (${contractOwner.slice(0, 8)}...) can pause the contract. Your wallet: ${wallet.address?.slice(0, 8)}...`
            );
          }

          // Use the new hook to pause
          const pauseTxHash = await pauseJobCreation.mutateAsync();
          console.log("Pause transaction hash:", pauseTxHash);
          // Reload page to refresh all data
          window.location.reload();
          break;

        case "unpause":
          // Check if contract is already unpaused
          const currentPausedStatus = await contractService.isJobCreationPaused(
            wallet.address || undefined
          );

          if (!currentPausedStatus) {
            toast({
              title: "Contract Already Unpaused",
              description: "The contract is already in an unpaused state",
              variant: "destructive",
            });
            setDialogOpen(false);
            return;
          }

          // Check if user is owner
          if (contractOwner && wallet.address !== contractOwner) {
            throw new Error(
              `Only the contract owner (${contractOwner.slice(0, 8)}...) can unpause the contract. Your wallet: ${wallet.address?.slice(0, 8)}...`
            );
          }

          // Use the new hook to unpause
          const unpauseTxHash = await unpauseJobCreation.mutateAsync();
          console.log("Unpause transaction hash:", unpauseTxHash);
          // Reload page to refresh all data
          window.location.reload();
          break;

        case "authorizeArbiter":
          if (!arbiterAddress || !arbiterAddress.trim()) {
            toast({
              title: "Invalid Address",
              description: "Please enter a valid arbiter address",
              variant: "destructive",
            });
            setDialogOpen(false);
            return;
          }

          // Use the mutation hook which already has toast notifications
          await authorizeArbiterMutation.mutateAsync(arbiterAddress.trim());
          setArbiterAddress("");
          // Reload page to refresh all data
          window.location.reload();
          break;
      }

      // Only close dialog if action completed successfully
      // (mutations handle their own success/error states)
      setDialogOpen(false);
    } catch (error: any) {
      console.error("Error executing action:", error);
      toast({
        title: "Action failed",
        description: error.message || "Failed to perform admin action",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getDialogContent = () => {
    switch (actionType) {
      case "pause":
        return {
          title: "Pause Contract",
          description:
            "This will pause all escrow operations. Users will not be able to create new escrows or interact with existing ones until the contract is unpaused.",
          icon: Pause,
          confirmText: "Pause Contract",
          variant: "destructive" as const,
        };
      case "unpause":
        return {
          title: "Unpause Contract",
          description:
            "This will resume all escrow operations. Users will be able to interact with escrows again.",
          icon: Play,
          confirmText: "Unpause Contract",
          variant: "default" as const,
        };
      case "authorizeArbiter":
        return {
          title: "Authorize Arbiter",
          description:
            "Authorize an arbiter address. Authorized arbiters can resolve disputes in escrows.",
          icon: Shield,
          confirmText: "Authorize Arbiter",
          variant: "default" as const,
        };
      default:
        return {
          title: "",
          description: "",
          icon: Shield,
          confirmText: "Confirm",
          variant: "default" as const,
        };
    }
  };

  if (!wallet.isConnected || !wallet.address) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-mesh">
        <Card className="glass border-primary/20 p-12 text-center max-w-md">
          <Lock className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Wallet Not Connected</h2>
          <p className="text-muted-foreground mb-6">
            Please connect your wallet to access admin controls
          </p>
        </Card>
      </div>
    );
  }

  // Show loading state while checking admin status
  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-mesh">
        <Card className="glass border-primary/20 p-12 text-center max-w-md">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4" />
          <h2 className="text-2xl font-bold mb-2">Checking Access...</h2>
          <p className="text-muted-foreground">Verifying admin permissions</p>
        </Card>
      </div>
    );
  }

  // Only show access denied after loading is complete
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-mesh">
        <Card className="glass border-destructive/20 p-12 text-center max-w-md">
          <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-destructive" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">
            You do not have permission to access this page. Only the contract
            owner or authorized arbiters can access admin controls.
          </p>
          <div className="mt-6 p-4 bg-muted/50 rounded-lg text-left space-y-2">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold">Your wallet:</span>
              <br />
              <span className="font-mono">{wallet.address}</span>
            </p>
            {contractOwner && (
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold">Contract owner:</span>
                <br />
                <span className="font-mono">{contractOwner}</span>
              </p>
            )}
            <p className="text-xs text-amber-600 mt-4">
              💡 <span className="font-semibold">Tip:</span> Make sure you're
              connected with the wallet that deployed the SecureFlow contract or
              an authorized arbiter.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4" />
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  const dialogContent = getDialogContent();
  const Icon = dialogContent.icon;

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-10 w-10 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold">Admin Controls</h1>
          </div>
          <p className="text-xl text-muted-foreground mb-8">
            Manage the SecureFlow escrow contract
          </p>

          {isPaused && (
            <Alert variant="destructive" className="mb-8">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Contract Paused</AlertTitle>
              <AlertDescription>
                All escrow operations are currently paused. Users cannot create
                or interact with escrows.
              </AlertDescription>
            </Alert>
          )}

          <Card className="glass border-primary/20 p-6 sm:p-7 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold">Contract Status</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">Current State:</span>
                  {isPaused ? (
                    <Badge variant="destructive" className="gap-2">
                      <Pause className="h-3 w-3" />
                      Paused
                    </Badge>
                  ) : (
                    <Badge variant="default" className="gap-2">
                      <Play className="h-3 w-3" />
                      Active
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">
                  Contract Address
                </p>
                <button
                  type="button"
                  onClick={() =>
                    void copy(CONTRACTS.SECUREFLOW_ESCROW, "Contract address")
                  }
                  className="font-mono text-sm text-muted-foreground hover:text-foreground transition-colors"
                  title="Click to copy"
                >
                  {short(CONTRACTS.SECUREFLOW_ESCROW, 14, 10)}
                </button>
              </div>
            </div>
          </Card>

          {/* Show role badge */}
          <Card className="glass border-primary/20 p-4 sm:p-5 mb-8">
            <div className="flex items-center gap-3">
              <Badge
                variant={isOwner ? "default" : "secondary"}
                className="gap-2"
              >
                {isOwner ? (
                  <>
                    <Shield className="h-3 w-3" />
                    Contract Owner
                  </>
                ) : (
                  <>
                    <Scale className="h-3 w-3" />
                    Authorized Arbiter
                  </>
                )}
              </Badge>
              {isArbiter && !isOwner && (
                <p className="text-sm text-muted-foreground">
                  You have access to dispute resolution only. Contact the
                  contract owner for full admin access.
                </p>
              )}
            </div>
          </Card>

          {/* Dispute Resolution - Available to both owners and arbiters */}
          <DisputeResolution onDisputeResolved={fetchContractStats} />

          {/* Owner-only sections */}
          {isOwner && (
            <>
              {/* Arbiter Authorization Section */}
              <Card className="glass border-primary/20 p-6 sm:p-7 mb-8">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">
                      Arbiter Management
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      Authorize arbiter addresses. Only authorized arbiters can
                      resolve disputes in escrows.
                    </p>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="arbiter-address">Arbiter Address</Label>
                        <Input
                          id="arbiter-address"
                          placeholder="G..."
                          value={arbiterAddress}
                          onChange={(e) => setArbiterAddress(e.target.value)}
                          className="font-mono"
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter a Stellar address (starts with G) to authorize
                          as an arbiter
                        </p>
                      </div>
                      <Button
                        onClick={() => openDialog("authorizeArbiter")}
                        variant="default"
                        className="w-full gap-2"
                        disabled={
                          actionLoading ||
                          authorizeArbiterMutation.isPending ||
                          !arbiterAddress.trim()
                        }
                      >
                        {actionLoading || authorizeArbiterMutation.isPending ? (
                          <>
                            <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Shield className="h-4 w-4" />
                            Authorize Arbiter
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card className="glass border-primary/20 p-6 sm:p-7">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                      {isPaused ? (
                        <Play className="h-6 w-6 text-primary" />
                      ) : (
                        <Pause className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">
                        {isPaused ? "Unpause Contract" : "Pause Contract"}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {isPaused
                          ? "Resume all escrow operations and allow users to interact with the contract"
                          : "Temporarily halt all escrow operations for maintenance or emergency situations"}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => openDialog(isPaused ? "unpause" : "pause")}
                    variant={isPaused ? "default" : "destructive"}
                    className="w-full gap-2"
                    disabled={
                      actionLoading ||
                      pauseJobCreation.isPending ||
                      unpauseJobCreation.isPending ||
                      loading
                    }
                  >
                    {actionLoading ||
                    pauseJobCreation.isPending ||
                    unpauseJobCreation.isPending ? (
                      <>
                        <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                        Processing...
                      </>
                    ) : isPaused ? (
                      <>
                        <Play className="h-4 w-4" />
                        Unpause Contract
                      </>
                    ) : (
                      <>
                        <Pause className="h-4 w-4" />
                        Pause Contract
                      </>
                    )}
                  </Button>
                </Card>

                <Card className="glass border-primary/20 p-6 sm:p-7">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                      <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">Token Whitelist</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Whitelist a Soroban token contract address (C...) for escrow payments.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="whitelistToken">Token Contract Address</Label>
                      <Input
                        id="whitelistToken"
                        value={tokenToWhitelist}
                        onChange={(e) => setTokenToWhitelist(e.target.value)}
                        placeholder="C..."
                        className="font-mono"
                      />
                    </div>
                    <Button
                      onClick={async () => {
                        if (!tokenToWhitelist.trim()) return;
                        setActionLoading(true);
                        try {
                          await contractService.whitelistToken(tokenToWhitelist.trim());
                          toast({
                            title: "Token whitelisted",
                            description: short(tokenToWhitelist.trim()),
                          });
                          setTokenToWhitelist("");
                          await fetchContractStats();
                        } catch (e: any) {
                          toast({
                            title: "Whitelist failed",
                            description: e?.message || "Transaction failed",
                            variant: "destructive",
                          });
                        } finally {
                          setActionLoading(false);
                        }
                      }}
                      disabled={actionLoading || !tokenToWhitelist.trim()}
                      className="w-full gap-2"
                    >
                      <Shield className="h-4 w-4" />
                      Whitelist Token
                    </Button>

                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground mb-2">
                        Currently whitelisted ({whitelistedTokenList.length})
                      </p>
                      <div className="space-y-2">
                        {whitelistedTokenList.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No whitelisted tokens found.</p>
                        ) : (
                          whitelistedTokenList.slice(0, 6).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => void copy(t, "Token address")}
                              className="w-full text-left font-mono text-sm bg-muted/50 p-3 rounded-lg hover:bg-muted/70 transition-colors"
                              title="Click to copy"
                            >
                              {short(t, 18, 14)}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              <Card className="glass border-primary/20 p-6 sm:p-7 mb-8">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10">
                    <Scale className="h-6 w-6 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">Withdraw Stuck Funds</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Emergency recovery if someone accidentally transfers tokens to the contract.
                      This can only withdraw the <span className="text-foreground font-medium">excess</span>{" "}
                      above what’s currently escrowed, so it cannot drain active escrows.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="withdraw-token">Token Contract (C...)</Label>
                    <Input
                      id="withdraw-token"
                      value={withdrawToken}
                      onChange={(e) => setWithdrawToken(e.target.value)}
                      placeholder="C..."
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="withdraw-to">Recipient (G...)</Label>
                    <Input
                      id="withdraw-to"
                      value={withdrawTo}
                      onChange={(e) => setWithdrawTo(e.target.value)}
                      placeholder="G..."
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="withdraw-amount">Amount (i128 stroops)</Label>
                    <Input
                      id="withdraw-amount"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="10000000"
                      className="font-mono"
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <Button
                    className="w-full gap-2"
                    variant="destructive"
                    disabled={
                      actionLoading ||
                      !withdrawToken.trim() ||
                      !withdrawTo.trim() ||
                      !withdrawAmount.trim()
                    }
                    onClick={async () => {
                      setActionLoading(true);
                      try {
                        await contractService.withdrawStuckFunds({
                          token: withdrawToken.trim(),
                          to: withdrawTo.trim(),
                          amount: withdrawAmount.trim(),
                        });
                        toast({
                          title: "Withdraw submitted",
                          description: "Transaction sent. Funds will transfer after confirmation.",
                        });
                        setWithdrawAmount("");
                      } catch (e: any) {
                        toast({
                          title: "Withdraw failed",
                          description: e?.message || "Transaction failed",
                          variant: "destructive",
                        });
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                  >
                    <Scale className="h-4 w-4" />
                    Withdraw Excess
                  </Button>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-muted-foreground">
                    <div className="bg-muted/30 border border-border/40 rounded-lg p-3">
                      <p className="font-medium text-foreground mb-1">Step 1</p>
                      <p>Paste the token contract (C...). For USDC testnet: use the whitelisted USDC contract.</p>
                    </div>
                    <div className="bg-muted/30 border border-border/40 rounded-lg p-3">
                      <p className="font-medium text-foreground mb-1">Step 2</p>
                      <p>Set the recipient (your treasury / owner wallet G...).</p>
                    </div>
                    <div className="bg-muted/30 border border-border/40 rounded-lg p-3">
                      <p className="font-medium text-foreground mb-1">Step 3</p>
                      <p>
                        Amount is base units. For 7-decimal tokens: <span className="font-mono">1.00</span>{" "}
                        = <span className="font-mono">10000000</span>.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </>
          )}

          {/* Contract Information - Available to both owners and arbiters */}
          <Card className="glass border-primary/20 p-6 sm:p-7">
            <h2 className="text-2xl font-bold mb-6">Contract Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-muted-foreground mb-2 block">
                  Owner Address
                </Label>
                <button
                  type="button"
                  onClick={() =>
                    void copy(contractOwner || wallet.address || "", "Owner address")
                  }
                  className="w-full text-left font-mono text-sm bg-muted/50 p-3 rounded-lg hover:bg-muted/70 transition-colors"
                  title="Click to copy"
                >
                  {short(contractOwner || wallet.address, 18, 14)}
                </button>
              </div>
              <div>
                <Label className="text-muted-foreground mb-2 block">
                  Connected Wallet
                </Label>
                <button
                  type="button"
                  onClick={() => void copy(wallet.address!, "Wallet address")}
                  className="w-full text-left font-mono text-sm bg-muted/50 p-3 rounded-lg hover:bg-muted/70 transition-colors"
                  title="Click to copy"
                >
                  {short(wallet.address!, 18, 14)}
                </button>
              </div>
              <div>
                <Label className="text-muted-foreground mb-2 block">
                  Contract Address
                </Label>
                <button
                  type="button"
                  onClick={() =>
                    void copy(CONTRACTS.SECUREFLOW_ESCROW, "Contract address")
                  }
                  className="w-full text-left font-mono text-sm bg-muted/50 p-3 rounded-lg hover:bg-muted/70 transition-colors"
                  title="Click to copy"
                >
                  {short(CONTRACTS.SECUREFLOW_ESCROW, 18, 14)}
                </button>
              </div>
              <div>
                <Label className="text-muted-foreground mb-2 block">
                  Network
                </Label>
                <p className="text-sm bg-muted/50 p-3 rounded-lg">
                  Stellar {(import.meta.env.VITE_STELLAR_NETWORK || "testnet").toString()}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground mb-2 block">
                  Platform Fee
                </Label>
                <p className="text-sm bg-muted/50 p-3 rounded-lg">
                  {(contractStats.platformFeeBP / 100).toFixed(2)}%{" "}
                  <span className="text-muted-foreground">
                    ({contractStats.platformFeeBP} bp)
                  </span>
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground mb-2 block">
                  Fee Collector
                </Label>
                {feeCollector ? (
                  <button
                    type="button"
                    onClick={() => void copy(feeCollector, "Fee collector")}
                    className="w-full text-left font-mono text-sm bg-muted/50 p-3 rounded-lg hover:bg-muted/70 transition-colors"
                    title="Click to copy"
                  >
                    {short(feeCollector, 18, 14)}
                  </button>
                ) : (
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">—</p>
                )}
              </div>
              <div>
                <Label className="text-muted-foreground mb-2 block">
                  Total Escrows
                </Label>
                <p className="text-sm bg-muted/50 p-3 rounded-lg">
                  {contractStats.totalEscrows}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground mb-2 block">
                  Authorized Arbiters
                </Label>
                <p className="text-sm bg-muted/50 p-3 rounded-lg">
                  {contractStats.authorizedArbiters}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground mb-2 block">
                  Whitelisted Tokens
                </Label>
                <p className="text-sm bg-muted/50 p-3 rounded-lg">
                  {contractStats.whitelistedTokens}
                </p>
              </div>
            </div>
          </Card>

          <Alert className="mt-8">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Admin Privileges</AlertTitle>
            <AlertDescription>
              These controls have significant impact on the contract and all
              users. Use them responsibly and only when necessary. All actions
              are recorded on the blockchain.
            </AlertDescription>
          </Alert>
        </motion.div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-full ${
                  dialogContent.variant === "destructive"
                    ? "bg-destructive/10"
                    : "bg-primary/10"
                }`}
              >
                <Icon
                  className={`h-6 w-6 ${
                    dialogContent.variant === "destructive"
                      ? "text-destructive"
                      : "text-primary"
                  }`}
                />
              </div>
              <DialogTitle className="text-2xl">
                {dialogContent.title}
              </DialogTitle>
            </div>
            <DialogDescription className="text-base leading-relaxed">
              {dialogContent.description}
            </DialogDescription>
          </DialogHeader>

          {actionType === "authorizeArbiter" && (
            <div className="space-y-4 my-4">
              <div className="space-y-2">
                <Label htmlFor="arbiter-address-dialog">Arbiter Address</Label>
                <Input
                  id="arbiter-address-dialog"
                  placeholder="G..."
                  value={arbiterAddress}
                  onChange={(e) => setArbiterAddress(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Enter a Stellar address (starts with G) to authorize as an
                  arbiter
                </p>
              </div>
            </div>
          )}

          <Alert
            variant={
              dialogContent.variant === "destructive"
                ? "destructive"
                : "default"
            }
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This action will be recorded on the blockchain and cannot be
              undone.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={
                actionLoading ||
                pauseJobCreation.isPending ||
                unpauseJobCreation.isPending
              }
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              variant={dialogContent.variant}
              disabled={
                actionLoading ||
                pauseJobCreation.isPending ||
                unpauseJobCreation.isPending ||
                authorizeArbiterMutation.isPending ||
                (actionType === "authorizeArbiter" && !arbiterAddress.trim())
              }
            >
              {actionLoading ||
              pauseJobCreation.isPending ||
              unpauseJobCreation.isPending ||
              authorizeArbiterMutation.isPending ? (
                <>
                  <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2" />
                  Processing...
                </>
              ) : (
                dialogContent.confirmText
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
