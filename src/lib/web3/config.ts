// Re-export Stellar config for compatibility
export {
  CONTRACTS,
  getCurrentNetwork,
  STELLAR_NETWORKS,
} from "./stellar-config";

// Stellar doesn't use addresses like Ethereum, but we keep this for compatibility
export const GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF =
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

// Legacy exports for backward compatibility (deprecated - use stellar-config instead)
export const BASE_MAINNET = {
  chainId: null,
  chainName: "Stellar Mainnet",
  nativeCurrency: {
    name: "Lumen",
    symbol: "XLM",
    decimals: 7,
  },
  rpcUrls: ["https://soroban-mainnet.stellar.org:443"],
  blockExplorerUrls: ["https://stellar.expert/explorer/public"],
};

export const BASE_TESTNET = {
  chainId: null,
  chainName: "Stellar Testnet",
  nativeCurrency: {
    name: "Lumen",
    symbol: "XLM",
    decimals: 7,
  },
  rpcUrls: ["https://soroban-testnet.stellar.org:443"],
  blockExplorerUrls: ["https://stellar.expert/explorer/testnet"],
};
