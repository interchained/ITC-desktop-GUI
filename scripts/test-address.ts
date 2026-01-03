import * as ITC from "interchainedjs-lib";

const addr = "itc1qznuuqgyxhhzpu8dyr5h034kyvtfwx67wmykemy";

console.log("=== Testing PSBT creation with proper binary hash ===");

try {
  const psbt = new ITC.Psbt();
  console.log("Created Psbt");

  psbt.addInput({
    hash: Buffer.alloc(32, 0), // 32 zero bytes, not hex string
    index: 0,
    sequence: 0xfffffffe,
  });
  console.log("Added input");

  const satoshis = BigInt(100000000);
  const outputScript = ITC.address.toOutputScript(addr);
  console.log("Got output script");

  psbt.addOutput({
    script: outputScript as any,
    value: satoshis,
  });
  console.log("Added output");

  const psbtBase64 = psbt.toBase64();
  console.log("PSBT Base64 created successfully!");
  console.log("PSBT length:", psbtBase64.length);
  console.log("SUCCESS!");
} catch (e) {
  console.log("Error:", (e as Error).message);
  console.log("Full error:", e);
}
