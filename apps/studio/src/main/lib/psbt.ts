import * as ITC from "interchainedjs-lib";

export interface PSBTData {
  id: string;
  psbt: string;
  description?: string;
  createdAt: number;
  status: "draft" | "signed" | "broadcast";
  recipientAddress: string;
  amount: number;
  fee: number;
  txid?: string;
  inputs?: Array<{ txid: string; vout: number }>;
}

/**
 * Create a PSBT from wallet UTXOs
 * In a real implementation, you would:
 * 1. Get UTXOs from the wallet via RPC
 * 2. Select UTXOs to cover the amount + fee
 * 3. Create the PSBT with proper inputs and outputs
 */
export function createPSBT(data: {
  recipientAddress: string;
  amount: number;
  fee: number;
  description?: string;
  changeAddress: string;
}): PSBTData {
  try {
    const psbt = new ITC.Psbt();
    
    // Add a dummy input with proper binary hash (32 bytes, not hex string)
    psbt.addInput({
      hash: Buffer.alloc(32, 0), // 32 zero bytes, not hex string
      index: 0,
      sequence: 0xfffffffe,
    });
    
    // Add output to recipient (convert ITC to satoshis)
    const satoshis = BigInt(Math.floor(data.amount * 100000000));
    
    // Convert address to output script
    const outputScript = ITC.address.toOutputScript(data.recipientAddress);
    psbt.addOutput({
      script: outputScript as any,
      value: satoshis,
    });
    
    // Add change output (if needed)
    const totalInputSats = satoshis + BigInt(Math.floor(data.fee));
    if (totalInputSats > satoshis) {
      const changeSats = totalInputSats - satoshis - BigInt(Math.floor(data.fee));
      if (changeSats > 0n) {
        try {
          const changeScript = ITC.address.toOutputScript(data.changeAddress);
          psbt.addOutput({
            script: changeScript as any,
            value: changeSats,
          });
        } catch (changeError) {
          console.warn('Failed to create change output:', changeError);
        }
      }
    }
    
    const psbtBase64 = psbt.toBase64();
    
    return {
      id: `psbt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      psbt: psbtBase64,
      description: data.description,
      createdAt: Date.now(),
      status: "draft",
      recipientAddress: data.recipientAddress,
      amount: data.amount,
      fee: data.fee,
    };
  } catch (error) {
    throw new Error(`Failed to create PSBT: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Sign a PSBT with wallet keys
 * In a real implementation, you would:
 * 1. Get the private keys from wallet.dumpprivkey() or via HW wallet
 * 2. Sign each input with the appropriate key
 * 3. Finalize the PSBT
 */
export function signPSBT(psbtBase64: string, walletKeyProvider?: (pubkey: Buffer) => Buffer): { psbt: string; status: "signed" } {
  try {
    const psbt = ITC.Psbt.fromBase64(psbtBase64);
    
    // In a real implementation:
    // You would iterate through inputs and sign with wallet keys
    // psbt.signInput(inputIndex, keyPair);
    // psbt.finalizeInput(inputIndex);
    
    // For demo, we just mark it as signed
    // In production, you'd actually sign the inputs
    
    return {
      psbt: psbt.toBase64(),
      status: "signed",
    };
  } catch (error) {
    throw new Error(`Failed to sign PSBT: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Finalize a PSBT and extract the transaction
 */
export function finalizePSBT(psbtBase64: string): string {
  try {
    const psbt = ITC.Psbt.fromBase64(psbtBase64);
    
    // Attempt to finalize all inputs
    // In a real implementation, this would verify all inputs are signed
    psbt.finalizeAllInputs();
    
    // Extract the raw transaction
    const tx = psbt.extractTransaction();
    return tx.toHex();
  } catch (error) {
    throw new Error(`Failed to finalize PSBT: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get transaction ID from a finalized transaction
 */
export function getTxId(txHex: string): string {
  try {
    const tx = ITC.Transaction.fromHex(txHex);
    return tx.getId();
  } catch (error) {
    throw new Error(`Failed to get TXID: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Validate a recipient address
 */
export function validateAddress(address: string): boolean {
  try {
    if (!address || typeof address !== 'string') {
      return false;
    }
    
    const trimmedAddress = address.trim();
    
    // Validate common Bitcoin/Interchained address formats:
    // Bech32: itc1, bc1, tb1 (mainnet/testnet segwit)
    // Legacy: 1, 3 (P2PKH, P2SH)
    // Segwit: itcq, itcp (other variants)
    // Any alphanumeric address should work as basic validation
    if (trimmedAddress.length < 26 || trimmedAddress.length > 62) {
      return false;
    }
    
    // Basic check: must contain only valid base58/bech32 characters
    if (!/^[a-zA-Z0-9]+$/.test(trimmedAddress)) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Address validation error:', error);
    return false;
  }
}

/**
 * Validate a PSBT
 */
export function validatePSBT(psbtBase64: string): { valid: boolean; error?: string } {
  try {
    const psbt = ITC.Psbt.fromBase64(psbtBase64);
    
    // Basic validation checks
    if (psbt.inputCount === 0) {
      return { valid: false, error: "PSBT has no inputs" };
    }
    // Use getOutputs() method instead of outputCount property
    const outputs = psbt.txOutputs;
    if (!outputs || outputs.length === 0) {
      return { valid: false, error: "PSBT has no outputs" };
    }
    
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid PSBT: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
