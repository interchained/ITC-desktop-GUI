import { InterchainedRPCClient } from "../packages/itc-rpc/src/index";

const config = {
  host: process.env.RPC_HOST || "127.0.0.1",
  port: parseInt(process.env.RPC_PORT || "8332"),
  username: process.env.RPC_USER || "",
  password: process.env.RPC_PASS || "",
};

async function testRPC() {
  console.log("Interchained RPC Client Test\n");
  console.log("Connecting to:", `${config.host}:${config.port}\n`);

  if (!config.username || !config.password) {
    console.error("Error: RPC_USER and RPC_PASS environment variables required");
    console.log("\nUsage:");
    console.log("  RPC_USER=youruser RPC_PASS=yourpass tsx scripts/test-rpc.ts");
    process.exit(1);
  }

  const client = new InterchainedRPCClient(config);

  try {
    console.log("Testing connection...");
    const connected = await client.testConnection();
    if (!connected) {
      console.error("✗ Connection failed");
      process.exit(1);
    }
    console.log("✓ Connection successful\n");

    console.log("Fetching blockchain info...");
    const blockchain = await client.getBlockchainInfo();
    console.log("✓ Chain:", blockchain.chain);
    console.log("  Blocks:", blockchain.blocks);
    console.log("  Headers:", blockchain.headers);
    console.log("  Sync:", (blockchain.verificationprogress * 100).toFixed(2) + "%");
    console.log("  IBD:", blockchain.initialblockdownload);
    console.log();

    console.log("Fetching network info...");
    const network = await client.getNetworkInfo();
    console.log("✓ Version:", network.version);
    console.log("  Subversion:", network.subversion);
    console.log("  Connections:", network.connections);
    console.log();

    console.log("Fetching wallet info...");
    const wallet = await client.getWalletInfo();
    console.log("✓ Wallet:", wallet.walletname);
    console.log("  Balance:", wallet.balance, "ITC");
    console.log("  Tx Count:", wallet.txcount);
    console.log("  Private Keys:", wallet.private_keys_enabled ? "Yes" : "No");
    console.log();

    console.log("Fetching detailed balances...");
    const balances = await client.getBalances();
    console.log("✓ Trusted:", balances.mine.trusted, "ITC");
    console.log("  Pending:", balances.mine.untrusted_pending, "ITC");
    console.log("  Immature:", balances.mine.immature, "ITC");
    console.log();

    console.log("Fetching recent transactions...");
    const txs = await client.listTransactions(undefined, 5);
    console.log(`✓ Found ${txs.length} recent transactions`);
    txs.forEach((tx, i) => {
      console.log(`  ${i + 1}. ${tx.category} ${tx.amount} ITC`);
      console.log(`     TXID: ${tx.txid.substring(0, 16)}...`);
      console.log(`     Confirmations: ${tx.confirmations}`);
    });
    console.log();

    console.log("All tests passed! ✓");
  } catch (error: any) {
    console.error("\n✗ Error:", error.message);
    if (error.code) {
      console.error("  Code:", error.code);
    }
    process.exit(1);
  }
}

testRPC();
