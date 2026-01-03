import { app, ipcMain, safeStorage } from "electron";
import path from "node:path";
import { InterchainedRPCClient, RPCConfig } from "@interchained/rpc";
import { appendLog } from "./log";
import { createPSBT, signPSBT, validateAddress, validatePSBT } from "./lib/psbt";

let rpcClient: InterchainedRPCClient | null = null;
let encryptedCredentials: Buffer | null = null;
const logFile = path.join(app.getPath("userData"), "logs", "rpc.log");

function ensureClient() {
  if (!rpcClient) {
    throw new Error("RPC client not initialized");
  }
  return rpcClient;
}

async function runRpc<T>(method: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    appendLog(
      logFile,
      `${method} error code=${error?.code ?? ""} msg=${error?.message ?? error}`
    );
    throw error;
  }
}

export function setupRPCBridge() {
  ipcMain.handle("rpc:test-connection", async (_, config: RPCConfig) => {
    try {
      const testClient = new InterchainedRPCClient(config);
      const result = await testClient.testConnection();
      return { success: result };
    } catch (error: any) {
      appendLog(
        logFile,
        `test-connection error code=${error?.code ?? ""} msg=${error?.message ?? error}`
      );
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("rpc:save-credentials", async (_, config: RPCConfig) => {
    try {
      if (safeStorage.isEncryptionAvailable()) {
        encryptedCredentials = safeStorage.encryptString(
          JSON.stringify({
            username: config.username,
            password: config.password,
          })
        );
      }

      rpcClient = new InterchainedRPCClient(config);
      return { success: true };
    } catch (error: any) {
      appendLog(
        logFile,
        `save-credentials error code=${error?.code ?? ""} msg=${error?.message ?? error}`
      );
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("rpc:get-blockchain-info", async () => {
    return runRpc("getblockchaininfo", () => ensureClient().getBlockchainInfo());
  });

  ipcMain.handle("rpc:get-network-info", async () => {
    return runRpc("getnetworkinfo", () => ensureClient().getNetworkInfo());
  });

  ipcMain.handle("rpc:get-wallet-info", async () => {
    return runRpc("getwalletinfo", () => ensureClient().getWalletInfo());
  });

  ipcMain.handle("rpc:get-balances", async () => {
    return runRpc("getbalances", () => ensureClient().getBalances());
  });

  ipcMain.handle("rpc:get-balance", async () => {
    return runRpc("getbalance", () => ensureClient().getBalance());
  });

  ipcMain.handle("rpc:get-new-address", async (_, label?: string, addressType?: string) => {
    return runRpc("getnewaddress", () => ensureClient().getNewAddress(label, addressType));
  });

  ipcMain.handle("rpc:list-transactions", async (_, label?: string, count?: number, skip?: number) => {
    return runRpc("listtransactions", async () => {
      const client = ensureClient();
      // When label is not provided, fetch all transactions (use "*" for all labels)
      // Use a large count to ensure we get all transactions
      const txCount = count ?? 250;
      const txSkip = skip ?? 0;
      const result = await client.listTransactions(label, txCount, txSkip);
      appendLog(
        logFile,
        `listtransactions called - label=${label || "*"}, count=${txCount}, skip=${txSkip}, returned=${result.length} transactions`
      );
      return result;
    });
  });

  ipcMain.handle("rpc:create-wallet", async (_, walletName: string, config?: RPCConfig) => {
    if (!rpcClient && config) {
      rpcClient = new InterchainedRPCClient(config);
    }
    return runRpc("createwallet", () => ensureClient().createWallet(walletName));
  });

  ipcMain.handle("rpc:load-wallet", async (_, walletName: string, config?: RPCConfig) => {
    if (!rpcClient && config) {
      rpcClient = new InterchainedRPCClient(config);
    }
    return runRpc("loadwallet", () => ensureClient().loadWallet(walletName));
  });

  ipcMain.handle("rpc:list-wallets", async (_, config?: RPCConfig) => {
    if (!rpcClient && config) {
      rpcClient = new InterchainedRPCClient(config);
    }
    return runRpc("listwallets", () => ensureClient().listWallets());
  });

  ipcMain.handle("rpc:list-addresses", async () => {
    return runRpc("listaddressgroupings", () => ensureClient().listAddressGroupings());
  });

  ipcMain.handle("rpc:list-received-by-address", async () => {
    return runRpc("listreceivedbyaddress", () => ensureClient().listReceivedByAddress());
  });

  ipcMain.handle("rpc:list-unspent", async () => {
    return runRpc("listunspent", async () => {
      const result = await (ensureClient() as any).call("listunspent", []);
      return result;
    });
  });

  // PSBT (Partially Signed Interchained Transaction) handlers with interchainedjs-lib
  const psbtStorage = new Map<string, any>();

  ipcMain.handle("rpc:create-psbt", async (_, data: {
    recipientAddress: string;
    amount: number;
    fee: number;
    description?: string;
  }) => {
    return runRpc("createpsbt", async () => {
      // Validate recipient address
      if (!validateAddress(data.recipientAddress)) {
        throw new Error(`Invalid recipient address: ${data.recipientAddress}`);
      }

      if (data.amount <= 0) {
        throw new Error("Amount must be greater than 0");
      }

      if (data.fee < 0) {
        throw new Error("Fee cannot be negative");
      }

      // In a real implementation, you would get the change address from the wallet
      const changeAddress = data.recipientAddress; // Placeholder

      // Create PSBT using interchainedjs-lib
      const psbt = createPSBT({
        recipientAddress: data.recipientAddress,
        amount: data.amount,
        fee: data.fee,
        description: data.description,
        changeAddress,
      });

      // Validate the created PSBT
      const validation = validatePSBT(psbt.psbt);
      if (!validation.valid) {
        throw new Error(validation.error || "Invalid PSBT created");
      }

      psbtStorage.set(psbt.id, psbt);
      appendLog(
        path.join(app.getPath("userData"), "logs", "rpc.log"),
        `Created PSBT ${psbt.id} for ${data.amount} ITC to ${data.recipientAddress}`
      );

      return psbt;
    });
  });

  ipcMain.handle("rpc:get-psbt", async (_, id: string) => {
    return runRpc("getpsbt", async () => {
      const psbt = psbtStorage.get(id);
      if (!psbt) {
        throw new Error(`PSBT with id ${id} not found`);
      }
      return psbt;
    });
  });

  ipcMain.handle("rpc:list-psbt", async () => {
    return runRpc("listpsbt", async () => {
      return Array.from(psbtStorage.values()).sort(
        (a, b) => b.createdAt - a.createdAt
      );
    });
  });

  ipcMain.handle("rpc:sign-psbt", async (_, id: string) => {
    return runRpc("signpsbt", async () => {
      const psbt = psbtStorage.get(id);
      if (!psbt) {
        throw new Error(`PSBT with id ${id} not found`);
      }

      if (psbt.status !== "draft") {
        throw new Error(`Cannot sign PSBT with status: ${psbt.status}`);
      }

      const client = ensureClient();
      
      // Sign PSBT using walletprocesspsbt RPC call
      const result = await (client as any).call("walletprocesspsbt", [psbt.psbt]);
      const signedPsbt = result.psbt;

      const updatedPsbt = {
        ...psbt,
        psbt: signedPsbt,
        status: "signed" as const,
      };

      psbtStorage.set(id, updatedPsbt);
      appendLog(
        path.join(app.getPath("userData"), "logs", "rpc.log"),
        `Signed PSBT ${id}`
      );

      return updatedPsbt;
    });
  });

  ipcMain.handle("rpc:broadcast-psbt", async (_, id: string) => {
    return runRpc("broadcastpsbt", async () => {
      const psbt = psbtStorage.get(id);
      if (!psbt) {
        throw new Error(`PSBT with id ${id} not found`);
      }

      if (psbt.status !== "signed") {
        throw new Error("PSBT must be signed before broadcasting");
      }

      const client = ensureClient();
      const logPath = path.join(app.getPath("userData"), "logs", "rpc.log");
      
      try {
        appendLog(logPath, `[broadcast-psbt] Attempting to broadcast PSBT ${id}`);
        
        // Parse and validate fee - must be an integer satoshi amount
        const feeAmount = parseFloat(String(psbt.fee));
        const feeSats = Math.ceil(feeAmount); // Round up to nearest satoshi
        
        if (feeSats <= 0) {
          throw new Error(`Fee must be greater than 0 satoshis. Received: ${psbt.fee}`);
        }
        
        appendLog(logPath, `[broadcast-psbt] Amount: ${psbt.amount} ITC, Fee: ${feeSats} sat, Recipient: ${psbt.recipientAddress}`);
        
        // Get list of UTXOs from wallet
        appendLog(logPath, `[broadcast-psbt] Fetching UTXOs from wallet...`);
        const utxos = await (client as any).call("listunspent", []);
        appendLog(logPath, `[broadcast-psbt] Found ${utxos.length} UTXOs`);
        
        if (!utxos || utxos.length === 0) {
          throw new Error("No UTXOs available in wallet. Please ensure wallet has funds.");
        }
        
        // Calculate required amount (ITC to satoshis)
        const amountSats = Math.floor(parseFloat(String(psbt.amount)) * 100000000);
        const requiredSats = BigInt(amountSats) + BigInt(feeSats);
        let totalInputSats = 0n;
        const inputs: Array<{ txid: string; vout: number }> = [];
        
        // Select UTXOs to cover the amount + fee
        for (const utxo of utxos) {
          if (totalInputSats >= requiredSats) break;
          inputs.push({ txid: utxo.txid, vout: utxo.vout });
          totalInputSats += BigInt(Math.floor(utxo.amount * 100000000));
        }
        
        if (totalInputSats < requiredSats) {
          const availableITC = Number(totalInputSats) / 100000000;
          const requiredITC = Number(requiredSats) / 100000000;
          throw new Error(`Insufficient funds. Have ${availableITC} ITC, need ${requiredITC} ITC`);
        }
        
        appendLog(logPath, `[broadcast-psbt] Selected ${inputs.length} inputs with total ${totalInputSats} satoshis`);
        
        // Create raw transaction
        const outputAmount = psbt.amount;
        const changeSats = Number(totalInputSats - requiredSats);
        const changeAmount = changeSats / 100000000;
        
        const outputs: Record<string, number> = {
          [psbt.recipientAddress]: outputAmount,
        };
        
        // Add change output if there's change
        if (changeSats > 0) {
          // Get a change address from the wallet
          const changeAddr = await (client as any).call("getrawchangeaddress", []);
          outputs[changeAddr] = changeAmount;
          appendLog(logPath, `[broadcast-psbt] Adding change output: ${changeAmount} ITC (${changeSats} sats) to ${changeAddr}`);
        }
        
        appendLog(logPath, `[broadcast-psbt] Creating raw transaction with outputs: ${JSON.stringify(outputs)}`);
        const txHex = await (client as any).call("createrawtransaction", [
          inputs,
          outputs,
        ]);
        
        appendLog(logPath, `[broadcast-psbt] Created transaction hex (length: ${txHex.length})`);
        
        // Validate the transaction before signing
        appendLog(logPath, `[broadcast-psbt] Validating raw transaction...`);
        const decodeResult = await (client as any).call("decoderawtransaction", [txHex]);
        appendLog(logPath, `[broadcast-psbt] Transaction validation passed. Inputs: ${decodeResult.vin?.length}, Outputs: ${decodeResult.vout?.length}`);
        
        // Sign the transaction
        appendLog(logPath, `[broadcast-psbt] Signing transaction...`);
        const signResult = await (client as any).call("signrawtransactionwithwallet", [txHex]);
        
        if (!signResult.complete) {
          appendLog(logPath, `[broadcast-psbt] Warning: Transaction not completely signed. Errors: ${JSON.stringify(signResult.errors)}`);
          throw new Error("Failed to sign transaction completely. Some inputs could not be signed.");
        }
        
        const signedTxHex = signResult.hex;
        appendLog(logPath, `[broadcast-psbt] Transaction signed successfully (length: ${signedTxHex.length})`);
        
        // Validate the signed transaction before broadcasting
        appendLog(logPath, `[broadcast-psbt] Validating signed transaction...`);
        const signedDecodeResult = await (client as any).call("decoderawtransaction", [signedTxHex]);
        appendLog(logPath, `[broadcast-psbt] Signed transaction validation passed`);
        
        // Test RPC connection before broadcast
        appendLog(logPath, `[broadcast-psbt] Testing RPC connection before broadcast...`);
        const testInfo = await (client as any).call("getblockchaininfo", []);
        appendLog(logPath, `[broadcast-psbt] RPC connection OK. Current block: ${testInfo.blocks}`);
        
        // Broadcast the transaction
        appendLog(logPath, `[broadcast-psbt] Attempting to broadcast transaction...`);
        const txid = await (client as any).call("sendrawtransaction", [signedTxHex]);
        
        appendLog(logPath, `[broadcast-psbt] Successfully broadcast transaction with TXID: ${txid}`);

        const broadcastPsbt = {
          ...psbt,
          status: "broadcast" as const,
          txid,
        };

        psbtStorage.set(id, broadcastPsbt);

        return broadcastPsbt;
      } catch (rpcError: any) {
        appendLog(logPath, `[broadcast-psbt] Error - code: ${rpcError?.code ?? 'unknown'}`);
        appendLog(logPath, `[broadcast-psbt] Error - message: ${rpcError?.message ?? String(rpcError)}`);
        
        const errorMsg = `Broadcast RPC error: code=${rpcError?.code ?? ''} msg=${rpcError?.message || String(rpcError)}`;
        throw new Error(errorMsg);
      }
    });
  });

  ipcMain.handle("rpc:remove-psbt", async (_, id: string) => {
    return runRpc("removepsbt", async () => {
      const deleted = psbtStorage.delete(id);
      if (!deleted) {
        throw new Error(`PSBT with id ${id} not found`);
      }

      appendLog(
        path.join(app.getPath("userData"), "logs", "rpc.log"),
        `Removed PSBT ${id}`
      );

      return { success: true };
    });
  });
}
