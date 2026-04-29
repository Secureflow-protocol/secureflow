/**
 * Wallet Kit Configuration
 * Centralized wallet kit setup
 */

import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
} from "@creit.tech/stellar-wallets-kit";
import { getCurrentNetwork } from "./stellar-config";

const network = getCurrentNetwork();
const walletNetwork = network.networkPassphrase.includes("Test")
  ? WalletNetwork.TESTNET
  : network.networkPassphrase.includes("Public")
    ? WalletNetwork.PUBLIC
    : WalletNetwork.TESTNET;

export const kit: StellarWalletsKit = new StellarWalletsKit({
  network: walletNetwork,
  modules: allowAllModules(),
});
