# Interchained Desktop Wallet

A secure, local desktop wallet for Interchained (ITC) cryptocurrency built with Electron.

## Why This Wallet Exists

The Interchained Desktop Wallet is designed as a **secure access layer** to the
Interchained ecosystem — not just a transaction tool.

Contact @interchained on TG I vibe coded this GUI entirely with AiAS (Ai Assist Secure) 
App Builder using Claude (Haiku,Opus && Sonnet) && GPT-5.2 (codex max && 5.2-pro) under advisory by GPT-5.2-thinking

It prioritizes:
- Local control
- Bitcoin Core–style security assumptions
- Clear separation between UI and key custody
- A future path toward AI-assisted interaction (AiAS)

This wallet is intentionally conservative by default, with extensibility built in.

## What you can do
- Manage ITC and wITC
- Send / receive transactions
- Bake for yield
- Bridge cross-chain
- Interact with the ecosystem using AI guidance (AiAS)

## Related Projects
- aiassist.net
- earn.interchained.org
- elarawallet.com

## Status
Production-ready, actively developed.

## 📚 Documentation Navigation

- **[QUICKSTART.md](./QUICKSTART.md)** - Get up and running in 5 minutes
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Developer onboarding and workflow
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design and technical details
- **[DIAGRAMS.md](./DIAGRAMS.md)** - Visual architecture diagrams
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production builds and distribution
- **[SECURITY.md](./SECURITY.md)** - Security audit checklist
- **[STATUS.md](./STATUS.md)** - Current project status and roadmap

## 🚀 Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Start your interchainedd node
interchainedd -daemon

# 3. Run the Electron wallet
pnpm dev:studio

# 4. Enter your RPC credentials and connect
```

See [QUICKSTART.md](./QUICKSTART.md) for detailed instructions.

## Architecture

**Monorepo structure** with shared components and dual runtime targets:

```
├── packages/
│   └── itc-rpc/          # Bitcoin Core 0.21.0 compatible RPC client
│       ├── src/
│       │   ├── client.ts # JSON-RPC implementation
│       │   ├── types.ts  # Type definitions & Zod schemas
│       │   └── index.ts
│       └── package.json
├── apps/
│   └── studio/           # Electron desktop application
│       ├── src/
│       │   ├── main/     # Electron main processfv
│       │   ├── preload/  # Secure IPC bridge
│       │   └── renderer/ # React UI
│       └── package.json
```

## Security Model - Mode A (Node-Managed Wallet)

**Critical Security Features:**

- **No private keys in app** - All keys managed by interchainedd node
- **Credentials encrypted** - RPC auth stored in Electron's safeStorage (system keychain)
- **Context isolation** - Renderer process cannot access Node.js APIs directly
- **Validated IPC** - All RPC calls go through secure preload bridge
- **HTTP Basic Auth** - Standard Bitcoin Core authentication

## Prerequisites

### 1. Running interchainedd Node

You must have a local `interchainedd` node running with:

- **RPC server enabled**
- **Wallet loaded**
- **Authentication configured**

Example `interchained.conf`:

```conf
server=1
rpcuser=your_rpc_username
rpcpassword=your_secure_password
rpcport=8332
rpcbind=127.0.0.1
rpcallowip=127.0.0.1
```

### 2. Development Tools

- **Node.js 22+**
- **pnpm** (package manager)

## Installation

```bash
# Install dependencies
pnpm install

# Build shared packages
cd packages/itc-rpc && pnpm build
```

## Running the Applications

### Electron Desktop App (Recommended)

```bash
# From root
pnpm dev:studio

# Or from apps/studio
cd apps/studio
pnpm dev
```

The Electron app will:
1. Launch with a connection screen
2. Prompt for RPC credentials
3. Test connection to your node
4. Store credentials securely
5. Load the wallet interface


## Supported Platforms

This wallet is local RPC **Electron-only by design**.

A browser-based wallet is intentionally not provided due to security constraints
around RPC access, credential storage, and local node interaction.


## Using the Wallet

### Initial Setup

1. **Launch the app** - You'll see the settings screen
2. **Enter RPC details:**
   - Host: `127.0.0.1`
   - Port: `8332` (default Bitcoin/ITC port)
   - Username: Your `rpcuser`
   - Password: Your `rpcpassword`
   - Wallet: (optional, leave empty for default wallet)
3. **Click Connect** - App will test the connection

### Wallet Features

#### Overview Tab
- View total balance (trusted, pending, immature)
- See wallet info (tx count, keypool, sync status)
- Monitor blockchain sync progress

#### Send Tab
- Enter recipient address
- Specify amount in ITC
- Add optional description
- Choose transaction priority
- Send with confirmation

#### Receive Tab
- Generate new receiving addresses
- Label addresses for organization
- View QR codes (placeholder)
- Copy addresses to clipboard

#### Transactions Tab
- View transaction history
- See confirmations, amounts, dates
- Filter by type (send/receive/generate)

#### Settings Tab
- Modify RPC connection settings
- Test new connections
- View current configuration

## RPC Methods Used

All methods are **Bitcoin Core 0.21.0 compatible**:

| Method | Purpose | Used In |
|--------|---------|---------|
| `getblockchaininfo` | Sync status, block height | Overview |
| `getnetworkinfo` | Network connections | Overview |
| `getwalletinfo` | Wallet metadata | Overview |
| `getbalances` | Detailed balance breakdown | Overview |
| `getbalance` | Total balance | Overview |
| `getnewaddress` | Generate receiving address | Receive |
| `listtransactions` | Transaction history | Activity |
| `sendtoaddress` | Send ITC | Send |

## Project Structure

### `packages/itc-rpc`

Type-safe RPC client with:
- Zod schema validation
- Error handling (RPCError, RPCConnectionError)
- Bitcoin Core method signatures
- HTTP Basic Auth

### `apps/studio/src/main`

Electron main process:
- `index.ts` - App lifecycle, window management
- `rpc-bridge.ts` - IPC handlers, credential encryption

### `apps/studio/src/preload`

Secure IPC bridge:
- Exposes `window.electronAPI.rpc` to renderer
- No direct Node.js access for renderer

### `apps/studio/src/renderer`

React UI components:
- `wallet/wallet.tsx` - Main container
- `wallet/overview.tsx` - Balance display
- `wallet/send.tsx` - Send form
- `wallet/receive.tsx` - Address generation
- `wallet/activity.tsx` - Transaction list
- `wallet/settings.tsx` - RPC configuration

## Building for Production

```bash
# Electron app
cd apps/studio
pnpm build
```

**Note**: For distributable Electron packages, you'll need to add `electron-builder` back to `apps/studio/package.json` and configure build targets.

## Development Notes

### Adding New RPC Methods

1. Add types to `packages/itc-rpc/src/types.ts`
2. Add method to `packages/itc-rpc/src/client.ts`
3. Add IPC handler to `apps/studio/src/main/rpc-bridge.ts`
4. Add to preload API in `apps/studio/src/preload/index.ts`
5. Use in React components

### Testing Against Real Node

```bash
# Ensure interchainedd is running
interchainedd -daemon

# Check RPC is working
bitcoin-cli -rpcuser=youruser -rpcpassword=yourpass getblockchaininfo

# Launch wallet
pnpm dev:studio
```

## Security Checklist

- [x] Context isolation enabled
- [x] No nodeIntegration in renderer
- [x] Preload script for IPC only
- [x] Credentials encrypted with safeStorage
- [x] No private keys in app
- [x] All RPC calls server-side (main process)
- [x] Input validation on IPC boundaries
- [x] HTTPS not needed (localhost only)

## Known Limitations

- **No multi-wallet support yet** (can specify wallet name only)
- **QR code generation** not implemented (placeholder shown)
- **Fee estimation** shows UI but uses defaults
- **Transaction details** limited to list view
- **No hardware wallet support** (Mode A only)

## Future Enhancements

### Mode B (Self-Custody)
- Local key management
- HD wallet support
- Seed phrase backup
- Hardware wallet integration

### Additional Features
- Multi-wallet support
- Advanced coin control
- PSBT support
- Lightning Network integration
- Custom fee estimation
- Transaction batching

## Troubleshooting

### "RPC client not initialized"
- Ensure you've connected via Settings tab
- Check interchainedd is running
- Verify RPC credentials

### "Connection refused"
- Check `rpcport` in interchained.conf
- Verify `rpcbind` allows 127.0.0.1
- Ensure daemon is running

### "401 Unauthorized"
- Verify rpcuser and rpcpassword match interchained.conf
- Restart interchainedd after config changes

### Electron app won't start
- Run `pnpm install` in apps/studio
- Check for port conflicts (default: 5174)
- Look for errors in terminal

## License

MIT

## Contributing

This is a reference implementation. For production use:
1. Add comprehensive error handling
2. Implement proper logging
3. Add unit and integration tests
4. Security audit
5. User testing
