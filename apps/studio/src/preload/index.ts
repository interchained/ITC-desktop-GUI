import { contextBridge, ipcRenderer } from "electron";
import type { RPCConfig, BlockchainInfo, NetworkInfo, WalletInfo, Balances, Transaction } from "@interchained/rpc";

interface PSBTTransaction {
  id: string;
  psbt: string;
  description?: string;
  createdAt: number;
  status: "draft" | "signed" | "broadcast";
  recipientAddress: string;
  amount: number;
  fee: number;
  txid?: string;
}

export interface ElectronAPI {
  rpc: {
    testConnection: (config: RPCConfig) => Promise<{ success: boolean; error?: string }>;
    saveCredentials: (config: RPCConfig) => Promise<{ success: boolean; error?: string }>;
    getBlockchainInfo: () => Promise<BlockchainInfo>;
    getNetworkInfo: () => Promise<NetworkInfo>;
    getWalletInfo: () => Promise<WalletInfo>;
    getBalances: () => Promise<Balances>;
    getBalance: () => Promise<number>;
    getNewAddress: (label?: string, addressType?: string) => Promise<string>;
    listTransactions: (label?: string, count?: number, skip?: number) => Promise<Transaction[]>;
    sendToAddress: (address: string, amount: number, comment?: string) => Promise<string>;
    createWallet: (walletName: string, config?: RPCConfig) => Promise<{ name: string; warning?: string }>;
    loadWallet: (walletName: string, config?: RPCConfig) => Promise<{ name: string; warning?: string }>;
    listWallets: (config?: RPCConfig) => Promise<string[]>;
    listWalletDir: (config?: RPCConfig) => Promise<{ wallets: { name: string; descriptor?: boolean }[] }>;
    listAddressGroupings: () => Promise<{ address: string; amount: number; label?: string }[]>;
    listReceivedByAddress: () => Promise<{ address: string; amount: number; label?: string; confirmations: number; involvesWatchonly?: boolean }[]>;
    listUnspent: () => Promise<{ address: string; amount: number; confirmations: number }[]>;
    createPSBT: (data: { recipientAddress: string; amount: number; fee: number; description?: string }) => Promise<PSBTTransaction>;
    getPSBT: (id: string) => Promise<PSBTTransaction>;
    listPSBT: () => Promise<PSBTTransaction[]>;
    signPSBT: (id: string) => Promise<PSBTTransaction>;
    broadcastPSBT: (id: string) => Promise<PSBTTransaction>;
    removePSBT: (id: string) => Promise<{ success: boolean }>;
  };
}

const electronAPI: ElectronAPI = {
  rpc: {
    testConnection: (config) => ipcRenderer.invoke("rpc:test-connection", config),
    saveCredentials: (config) => ipcRenderer.invoke("rpc:save-credentials", config),
    getBlockchainInfo: () => ipcRenderer.invoke("rpc:get-blockchain-info"),
    getNetworkInfo: () => ipcRenderer.invoke("rpc:get-network-info"),
    getWalletInfo: () => ipcRenderer.invoke("rpc:get-wallet-info"),
    getBalances: () => ipcRenderer.invoke("rpc:get-balances"),
    getBalance: () => ipcRenderer.invoke("rpc:get-balance"),
    getNewAddress: (label, addressType) => ipcRenderer.invoke("rpc:get-new-address", label, addressType),
    listTransactions: (label, count, skip) => ipcRenderer.invoke("rpc:list-transactions", label, count, skip),
    sendToAddress: (address, amount, comment) => ipcRenderer.invoke("rpc:send-to-address", address, amount, comment),
    createWallet: (walletName: string, config?: RPCConfig) => ipcRenderer.invoke("rpc:create-wallet", walletName, config),
    loadWallet: (walletName: string, config?: RPCConfig) => ipcRenderer.invoke("rpc:load-wallet", walletName, config),
    listWallets: (config?: RPCConfig) => ipcRenderer.invoke("rpc:list-wallets", config),
    listWalletDir: (config?: RPCConfig) => ipcRenderer.invoke("rpc:list-wallet-dir", config),
    listAddressGroupings: () => ipcRenderer.invoke("rpc:list-addresses"),
    listReceivedByAddress: () => ipcRenderer.invoke("rpc:list-received-by-address"),
    listUnspent: () => ipcRenderer.invoke("rpc:list-unspent"),
    createPSBT: (data) => ipcRenderer.invoke("rpc:create-psbt", data),
    getPSBT: (id) => ipcRenderer.invoke("rpc:get-psbt", id),
    listPSBT: () => ipcRenderer.invoke("rpc:list-psbt"),
    signPSBT: (id) => ipcRenderer.invoke("rpc:sign-psbt", id),
    broadcastPSBT: (id) => ipcRenderer.invoke("rpc:broadcast-psbt", id),
    removePSBT: (id) => ipcRenderer.invoke("rpc:remove-psbt", id),
  },
};

console.log("[Preload] Script executing, contextBridge available:", typeof contextBridge !== "undefined");

try {
  contextBridge.exposeInMainWorld("electronAPI", electronAPI);
  console.log("[Preload] Successfully exposed electronAPI to main world");
} catch (error) {
  console.error("[Preload] Failed to expose electronAPI:", error);
}
