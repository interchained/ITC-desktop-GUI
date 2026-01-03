# Quick Start Guide

## 1. Start your interchainedd node

```bash
# Make sure your interchained.conf has:
server=1
rpcuser=myuser
rpcpassword=mypassword
rpcport=8332

# Start the daemon
interchainedd -daemon
```

## 2. Install dependencies

```bash
pnpm install
```

## 3. Run the Electron wallet

```bash
pnpm dev:studio
```

## 4. Connect to your node

When the app launches:
- Enter Host: `127.0.0.1`
- Enter Port: `8332`
- Enter your RPC username
- Enter your RPC password
- Click "Connect"

## 5. Start using the wallet

- **Overview**: View your balance
- **Send**: Send ITC to an address
- **Receive**: Generate new addresses
- **Transactions**: View history
- **Settings**: Modify connection

That's it! Your wallet is now connected to your local node.

## Testing the RPC package standalone

```bash
cd packages/itc-rpc
```

Create a test file `test.ts`:

```typescript
import { InterchainedRPCClient } from "./src/index";

const client = new InterchainedRPCClient({
  host: "127.0.0.1",
  port: 8332,
  username: "myuser",
  password: "mypassword",
});

const info = await client.getBlockchainInfo();
console.log("Block height:", info.blocks);
console.log("Sync progress:", (info.verificationprogress * 100).toFixed(2) + "%");

const balance = await client.getBalance();
console.log("Balance:", balance, "ITC");
```

Run it:

```bash
tsx test.ts
```
