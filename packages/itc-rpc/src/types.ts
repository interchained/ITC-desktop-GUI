import { z } from "zod";

export interface RPCConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  wallet?: string;
}

export interface RPCRequest {
  jsonrpc: "1.0";
  id: string;
  method: string;
  params: unknown[];
}

export interface RPCResponse<T = unknown> {
  result: T | null;
  error: {
    code: number;
    message: string;
  } | null;
  id: string;
}

export const BlockchainInfoSchema = z.object({
  chain: z.string(),
  blocks: z.number(),
  headers: z.number(),
  bestblockhash: z.string(),
  difficulty: z.number(),
  mediantime: z.number(),
  verificationprogress: z.number(),
  initialblockdownload: z.boolean(),
  chainwork: z.string(),
  size_on_disk: z.number(),
  pruned: z.boolean(),
});

export type BlockchainInfo = z.infer<typeof BlockchainInfoSchema>;

export const NetworkInfoSchema = z.object({
  version: z.number(),
  subversion: z.string(),
  protocolversion: z.number(),
  localservices: z.string(),
  localrelay: z.boolean(),
  timeoffset: z.number(),
  networkactive: z.boolean(),
  connections: z.number(),
  networks: z.array(z.any()),
  relayfee: z.number(),
  incrementalfee: z.number(),
  localaddresses: z.array(z.any()),
  warnings: z.string(),
});

export type NetworkInfo = z.infer<typeof NetworkInfoSchema>;

export const WalletInfoSchema = z.object({
  walletname: z.string(),
  walletversion: z.number(),
  balance: z.number(),
  unconfirmed_balance: z.number(),
  immature_balance: z.number(),
  txcount: z.number(),
  keypoololdest: z.number(),
  keypoolsize: z.number(),
  keypoolsize_hd_internal: z.number().optional(),
  unlocked_until: z.number().optional(),
  paytxfee: z.number(),
  hdseedid: z.string().optional(),
  private_keys_enabled: z.boolean(),
  avoid_reuse: z.boolean(),
  scanning: z.union([z.boolean(), z.object({
    duration: z.number(),
    progress: z.number(),
  })]),
});

export type WalletInfo = z.infer<typeof WalletInfoSchema>;

export const BalancesSchema = z.object({
  mine: z.object({
    trusted: z.number(),
    untrusted_pending: z.number(),
    immature: z.number(),
  }),
  watchonly: z.object({
    trusted: z.number(),
    untrusted_pending: z.number(),
    immature: z.number(),
  }).optional(),
});

export type Balances = z.infer<typeof BalancesSchema>;

export const TransactionSchema = z.object({
  address: z.string().optional(),
  category: z.enum(["send", "receive", "generate", "immature", "orphan"]),
  amount: z.number(),
  label: z.string().optional(),
  vout: z.number().optional(),
  fee: z.number().optional(),
  confirmations: z.number(),
  blockhash: z.string().optional(),
  blockindex: z.number().optional(),
  blocktime: z.number().optional(),
  txid: z.string(),
  time: z.number(),
  timereceived: z.number(),
  comment: z.string().optional(),
  bip125_replaceable: z.enum(["yes", "no", "unknown"]).optional(),
  abandoned: z.boolean().optional(),
});

export type Transaction = z.infer<typeof TransactionSchema>;

export const WalletDirEntrySchema = z.object({
  name: z.string(),
  descriptor: z.boolean().optional(),
});

export type WalletDirEntry = z.infer<typeof WalletDirEntrySchema>;

export const WalletDirSchema = z.object({
  wallets: z.array(WalletDirEntrySchema),
});

export type WalletDir = z.infer<typeof WalletDirSchema>;

export const LoadWalletResultSchema = z.object({
  name: z.string(),
  warning: z.string().optional(),
});

export type LoadWalletResult = z.infer<typeof LoadWalletResultSchema>;

export const CreateWalletResultSchema = z.object({
  name: z.string(),
  warning: z.string().optional(),
});

export type CreateWalletResult = z.infer<typeof CreateWalletResultSchema>;

export const AddressGroupingEntrySchema = z.object({
  address: z.string(),
  amount: z.number(),
  label: z.string().optional(),
});

export type AddressGroupingEntry = z.infer<typeof AddressGroupingEntrySchema>;

export const ReceivedAddressSchema = z.object({
  involvesWatchonly: z.boolean().optional(),
  address: z.string(),
  account: z.string().optional(),
  amount: z.number(),
  confirmations: z.number(),
  label: z.string().optional(),
  txids: z.array(z.string()).optional(),
});

export type ReceivedAddress = z.infer<typeof ReceivedAddressSchema>;

export class RPCError extends Error {
  constructor(
    public code: number,
    message: string,
    public method: string
  ) {
    super(`RPC Error [${method}]: ${message} (code: ${code})`);
    this.name = "RPCError";
  }
}

export class RPCConnectionError extends Error {
  constructor(
    message: string,
    public cause?: unknown
  ) {
    super(`RPC Connection Error: ${message}`);
    this.name = "RPCConnectionError";
  }
}
