// Stellar Contract Client Wrapper
// This provides a compatible interface for contract interactions

import {
  Contract,
  rpc,
  Address,
  nativeToScVal,
  scValToNative,
} from "@stellar/stellar-sdk";
import { getCurrentNetwork, CONTRACTS } from "./stellar-config";

export interface StellarContractClient {
  call(method: string, ...args: any[]): Promise<any>;
  send(method: string, ...args: any[]): Promise<string>;
}

export class StellarContract {
  private contract: Contract;
  private rpcServer: rpc.Server;
  private network: ReturnType<typeof getCurrentNetwork>;

  constructor(contractId: string) {
    this.network = getCurrentNetwork();
    this.rpcServer = new rpc.Server(this.network.rpcUrl);
    this.contract = new Contract(contractId);
  }

  async call(method: string, ...args: any[]): Promise<any> {
    try {
      const methodArgs = args.map((arg) => {
        // Convert arguments to Stellar ScVal format
        if (typeof arg === "string") {
          return Address.fromString(arg).toScVal();
        } else if (typeof arg === "number") {
          return nativeToScVal(arg, { type: "i128" });
        } else if (typeof arg === "boolean") {
          return nativeToScVal(arg, { type: "bool" });
        }
        return nativeToScVal(arg);
      });

      const result = await this.contract.call(method, ...methodArgs);

      // Convert result back to native format
      if (result) {
        try {
          return scValToNative(result);
        } catch {
          return result;
        }
      }
      return result;
    } catch (error) {
      console.error(`Error calling ${method}:`, error);
      throw error;
    }
  }

  async send(method: string, ...args: any[]): Promise<string> {
    try {
      // For Stellar, we need to build and sign the transaction
      // This will be handled by the wallet context
      const methodArgs = args.map((arg) => {
        if (typeof arg === "string") {
          return Address.fromString(arg).toScVal();
        } else if (typeof arg === "number") {
          return nativeToScVal(arg, { type: "i128" });
        } else if (typeof arg === "boolean") {
          return nativeToScVal(arg, { type: "bool" });
        }
        return nativeToScVal(arg);
      });

      // This will be implemented in the context with wallet signing
      throw new Error("Send method requires wallet context");
    } catch (error) {
      console.error(`Error sending ${method}:`, error);
      throw error;
    }
  }
}

export function createStellarContract(
  contractId: string
): StellarContractClient {
  const contract = new StellarContract(contractId);

  return {
    async call(method: string, ...args: any[]) {
      return contract.call(method, ...args);
    },
    async send(method: string, ...args: any[]) {
      return contract.send(method, ...args);
    },
  };
}
