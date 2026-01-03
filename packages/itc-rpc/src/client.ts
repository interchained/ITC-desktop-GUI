import {
  RPCConfig,
  RPCRequest,
  RPCResponse,
  RPCError,
  RPCConnectionError,
  BlockchainInfo,
  BlockchainInfoSchema,
  NetworkInfo,
  NetworkInfoSchema,
  WalletInfo,
  WalletInfoSchema,
  Balances,
  BalancesSchema,
  Transaction,
  TransactionSchema,
  WalletDir,
  WalletDirSchema,
  LoadWalletResult,
  LoadWalletResultSchema,
  CreateWalletResult,
  CreateWalletResultSchema,
  AddressGroupingEntry,
  ReceivedAddress,
  ReceivedAddressSchema,
} from "./types";
import { z } from "zod";

export class InterchainedRPCClient {
  private config: RPCConfig;
  private requestId = 0;

  constructor(config: RPCConfig) {
    this.config = config;
  }

  private getEndpoint(): string {
    const base = `http://${this.config.host}:${this.config.port}`;
    return this.config.wallet ? `${base}/wallet/${this.config.wallet}` : base;
  }

  private getAuthHeader(): string {
    const credentials = `${this.config.username}:${this.config.password}`;
    return `Basic ${Buffer.from(credentials).toString("base64")}`;
  }

  private async call<T>(method: string, params: unknown[] = []): Promise<T> {
    const id = (++this.requestId).toString();
    const request: RPCRequest = {
      jsonrpc: "1.0",
      id,
      method,
      params,
    };

    try {
      const response = await fetch(this.getEndpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.getAuthHeader(),
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        // Try to parse RPC-style error body for better diagnostics
        try {
          const bodyText = await response.text();
          try {
            const parsed: RPCResponse<unknown> = JSON.parse(bodyText);
            if (parsed?.error) {
              throw new RPCError(parsed.error.code, parsed.error.message, method);
            }
          } catch {
            // not JSON or unexpected shape; fall through
          }
          throw new RPCConnectionError(
            `HTTP ${response.status}: ${response.statusText} body=${bodyText.slice(0, 200)}`
          );
        } catch (e) {
          throw new RPCConnectionError(
            `HTTP ${response.status}: ${response.statusText}`,
            e
          );
        }
      }

      const data: RPCResponse<T> = await response.json();

      if (data.error) {
        throw new RPCError(data.error.code, data.error.message, method);
      }

      if (data.result === null && method !== "sendtoaddress") {
        throw new RPCError(-1, "Unexpected null result", method);
      }

      return data.result as T;
    } catch (error) {
      if (error instanceof RPCError || error instanceof RPCConnectionError) {
        throw error;
      }
      throw new RPCConnectionError(
        `Failed to connect to ${this.getEndpoint()}`,
        error
      );
    }
  }

  async getBlockchainInfo(): Promise<BlockchainInfo> {
    const result = await this.call("getblockchaininfo");
    return BlockchainInfoSchema.parse(result);
  }

  async getNetworkInfo(): Promise<NetworkInfo> {
    const result = await this.call("getnetworkinfo");
    return NetworkInfoSchema.parse(result);
  }

  async getWalletInfo(): Promise<WalletInfo> {
    const result = await this.call("getwalletinfo");
    return WalletInfoSchema.parse(result);
  }

  async getBalances(): Promise<Balances> {
    const result = await this.call("getbalances");
    return BalancesSchema.parse(result);
  }

  async getBalance(): Promise<number> {
    return await this.call<number>("getbalance");
  }

  async getNewAddress(label?: string, addressType?: string): Promise<string> {
    const params: unknown[] = [];
    if (label !== undefined) params.push(label);
    if (addressType !== undefined) params.push(addressType);
    return await this.call<string>("getnewaddress", params);
  }

  async listTransactions(
    label?: string,
    count: number = 10,
    skip: number = 0,
    includeWatchonly: boolean = false
  ): Promise<Transaction[]> {
    const params: unknown[] = [label || "*", count, skip, includeWatchonly];
    const result = await this.call<unknown[]>("listtransactions", params);
    return result.map((tx) => TransactionSchema.parse(tx));
  }

  async listReceivedByAddress(includeEmpty = true, includeWatchonly = true): Promise<ReceivedAddress[]> {
    const params: unknown[] = [0, includeEmpty, includeWatchonly];
    const result = await this.call<unknown[]>("listreceivedbyaddress", params);
    return result.map((entry) => ReceivedAddressSchema.parse(entry));
  }

  async listAddressGroupings(): Promise<AddressGroupingEntry[]> {
    const raw = await this.call<any[]>("listaddressgroupings");
    // raw is array of group arrays [[ [address, amount, label?], ... ], ...]
    const flattened: AddressGroupingEntry[] = [];
    for (const group of raw || []) {
      if (Array.isArray(group)) {
        for (const entry of group) {
          if (Array.isArray(entry) && typeof entry[0] === "string") {
            const [address, amount, label] = entry;
            flattened.push({ address, amount: Number(amount), label });
          }
        }
      }
    }
    return flattened;
  }

  async createWallet(walletName: string): Promise<CreateWalletResult> {
    const result = await this.call("createwallet", [walletName]);
    return CreateWalletResultSchema.parse(result);
  }

  async loadWallet(walletName: string): Promise<LoadWalletResult> {
    const result = await this.call("loadwallet", [walletName]);
    return LoadWalletResultSchema.parse(result);
  }

  async listWallets(): Promise<string[]> {
    const result = await this.call<unknown[]>("listwallets");
    return z.array(z.string()).parse(result);
  }

  async listWalletDir(): Promise<WalletDir> {
    const result = await this.call("listwalletdir");
    return WalletDirSchema.parse(result);
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.getBlockchainInfo();
      return true;
    } catch {
      return false;
    }
  }
}
