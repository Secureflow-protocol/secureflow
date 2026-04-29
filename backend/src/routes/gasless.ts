/**
 * Gasless transaction endpoint.
 *
 * The frontend builds and signs the inner Soroban transaction (user pays
 * nothing — their wallet only provides auth / authentication).  This route
 * wraps it in a Stellar fee-bump transaction signed by the admin wallet so
 * that the admin account pays all network fees.
 *
 * Required env vars:
 *   ADMIN_SECRET_KEY          – secret key of GBL5ZXODI2UVOTTLNJGCJ2N52MO…
 *   STELLAR_RPC_URL           – Soroban RPC endpoint (default: testnet)
 *   STELLAR_NETWORK_PASSPHRASE – network passphrase (default: testnet)
 */

import { Router } from "express";
import {
  Keypair,
  TransactionBuilder,
  Networks,
} from "@stellar/stellar-sdk";
import { Server as RpcServer } from "@stellar/stellar-sdk/rpc";

export const gaslessRouter = Router();

const DEFAULT_RPC_URL = "https://soroban-testnet.stellar.org";
const DEFAULT_PASSPHRASE = Networks.TESTNET;

function getAdminKeypair(): Keypair {
  const secret = process.env.ADMIN_SECRET_KEY;
  if (!secret) {
    throw new Error(
      "ADMIN_SECRET_KEY is not configured — set it in backend/.env"
    );
  }
  return Keypair.fromSecret(secret);
}

function getRpcServer(): RpcServer {
  return new RpcServer(
    process.env.STELLAR_RPC_URL ?? DEFAULT_RPC_URL
  );
}

function getNetworkPassphrase(): string {
  return process.env.STELLAR_NETWORK_PASSPHRASE ?? DEFAULT_PASSPHRASE;
}

gaslessRouter.post("/apply", async (req, res) => {
  try {
    const { signedTxXdr } = req.body ?? {};

    if (!signedTxXdr || typeof signedTxXdr !== "string") {
      res.status(400).json({ error: "signedTxXdr is required" });
      return;
    }

    const adminKeypair = getAdminKeypair();
    const networkPassphrase = getNetworkPassphrase();
    const rpcServer = getRpcServer();

    // Parse the user-signed inner transaction
    const innerTx = TransactionBuilder.fromXDR(
      signedTxXdr,
      networkPassphrase
    ) as any;

    // The fee bump total fee must be >= the inner tx fee.
    // We set it to max(inner_fee * 2, 1_000_000 stroops = 0.1 XLM) to be safe
    // with Soroban resource fees embedded in the inner fee.
    const innerFee = parseInt(innerTx.fee ?? "100", 10);
    const bumpBaseFee = Math.max(innerFee, 500_000).toString();

    // Build fee-bump transaction: admin is the fee source, user's tx is inner
    const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
      adminKeypair.publicKey(),
      bumpBaseFee,
      innerTx,
      networkPassphrase
    );

    // Admin signs the fee-bump envelope
    feeBumpTx.sign(adminKeypair);

    // Submit to Soroban RPC
    const sendResponse = await rpcServer.sendTransaction(feeBumpTx as any);

    if (sendResponse.status === "ERROR") {
      const errMsg =
        (sendResponse as any).errorResult?.toString() ?? "Transaction failed";
      res.status(500).json({ error: errMsg });
      return;
    }

    if (sendResponse.status === "PENDING" && sendResponse.hash) {
      // Poll for confirmation (up to 30 seconds)
      let attempts = 0;
      let txStatus: any = sendResponse;

      while (attempts < 30 && txStatus.status === "PENDING") {
        await new Promise((r) => setTimeout(r, 1000));
        try {
          const result = await rpcServer.getTransaction(sendResponse.hash);
          txStatus = { ...txStatus, status: result.status };
          if (result.status === "SUCCESS") {
            res.json({ txHash: sendResponse.hash });
            return;
          }
          if (result.status === "FAILED") {
            res
              .status(500)
              .json({ error: "Transaction failed on-chain", txHash: sendResponse.hash });
            return;
          }
        } catch {
          /* keep polling */
        }
        attempts++;
      }

      // Timed out — return hash anyway so frontend can check
      res.json({ txHash: sendResponse.hash, pending: true });
      return;
    }

    res.json({ txHash: sendResponse.hash ?? "" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gasless transaction failed";
    console.error("[gasless]", msg);
    res.status(500).json({ error: msg });
  }
});
