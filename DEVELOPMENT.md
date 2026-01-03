# Developer Onboarding Guide

Welcome! This guide will help you set up your development environment and understand the codebase.

## Prerequisites

### Required Software

1. **Node.js 22+**
   ```bash
   node --version  # Should be v22.x.x or higher
   ```

2. **pnpm** (Package Manager)
   ```bash
   npm install -g pnpm
   pnpm --version  # Should be 9.x.x or higher
   ```

3. **Git**
   ```bash
   git --version
   ```

4. **interchainedd** (or Bitcoin Core 0.21.0 for testing)
   - Download from official sources
   - Verify checksums
   - Install for your platform

### Optional Tools

- **VS Code** - Recommended IDE with extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features
  - Tailwind CSS IntelliSense
- **Postman** or **curl** - For testing RPC directly

## Initial Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd interchained-wallet

# Install all dependencies
pnpm install

# Verify installation
pnpm --filter @interchained/rpc build
```

### 2. Configure Your Node

Create `~/.interchained/interchained.conf` (or Bitcoin Core equivalent):

```conf
# RPC Server
server=1
rpcuser=devuser
rpcpassword=devpass123
rpcport=8332

# Bind to localhost only
rpcbind=127.0.0.1
rpcallowip=127.0.0.1

# Optional: Testnet for development
testnet=1

# Optional: Regtest for fast testing
regtest=1
```

### 3. Start Your Node

```bash
# Start the daemon
interchainedd -daemon

# Or with Bitcoin Core
bitcoind -daemon

# Check it's running
bitcoin-cli -rpcuser=devuser -rpcpassword=devpass123 getblockchaininfo
```

### 4. Create Test Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your values
# .env (git-ignored)
RPC_HOST=127.0.0.1
RPC_PORT=8332
RPC_USER=devuser
RPC_PASS=devpass123
```

### 5. Test RPC Connection

```bash
# Run the test script
RPC_USER=devuser RPC_PASS=devpass123 tsx scripts/test-rpc.ts
```

You should see:
```
✓ Connection successful
✓ Chain: main
  Blocks: 123456
  ...
```

## Development Workflow

### Running the Apps

#### Electron App (Primary Development Target)

```bash
# Terminal 1: From project root
pnpm dev:studio

# The Electron app will:
# 1. Build main process
# 2. Build preload script
# 3. Start Vite dev server for renderer
# 4. Launch Electron window
```

#### Web App (Future)

```bash
# Terminal 1: From project root
pnpm dev

# Opens at http://localhost:5173
# Note: RPC proxy not yet implemented
```

### Making Changes

#### Modifying RPC Client

```bash
cd packages/itc-rpc

# Edit src/types.ts to add new schemas
# Edit src/client.ts to add new methods
# Edit src/index.ts to export

# No build step needed (TypeScript direct import)
# Changes hot-reload in Electron
```

**Example: Adding `getmininginfo`**

1. **Add type** in `packages/itc-rpc/src/types.ts`:
```typescript
export const MiningInfoSchema = z.object({
  blocks: z.number(),
  currentblockweight: z.number().optional(),
  currentblocktx: z.number().optional(),
  difficulty: z.number(),
  networkhashps: z.number(),
  pooledtx: z.number(),
  chain: z.string(),
  warnings: z.string(),
});

export type MiningInfo = z.infer<typeof MiningInfoSchema>;
```

2. **Add method** in `packages/itc-rpc/src/client.ts`:
```typescript
async getMiningInfo(): Promise<MiningInfo> {
  const result = await this.call("getmininginfo");
  return MiningInfoSchema.parse(result);
}
```

3. **Add IPC handler** in `apps/studio/src/main/rpc-bridge.ts`:
```typescript
ipcMain.handle("rpc:get-mining-info", async () => {
  if (!rpcClient) {
    throw new Error("RPC client not initialized");
  }
  return await rpcClient.getMiningInfo();
});
```

4. **Expose in preload** in `apps/studio/src/preload/index.ts`:
```typescript
export interface ElectronAPI {
  rpc: {
    // ... existing methods
    getMiningInfo: () => Promise<MiningInfo>;
  };
}

const electronAPI: ElectronAPI = {
  rpc: {
    // ... existing
    getMiningInfo: () => ipcRenderer.invoke("rpc:get-mining-info"),
  },
};
```

5. **Use in component** in `apps/studio/src/renderer/wallet/overview.tsx`:
```typescript
const { data: miningInfo } = useQuery({
  queryKey: ["miningInfo"],
  queryFn: () => window.electronAPI.rpc.getMiningInfo(),
  refetchInterval: 60000, // Every minute
});

// Render in UI
<div>Network Hashrate: {miningInfo?.networkhashps}</div>
```

#### Modifying UI Components

All React components use:
- **Tailwind CSS** for styling
- **TanStack Query** for data fetching
- **React Hooks** for state

**Example: Adding a new tab**

1. **Create component** in `apps/studio/src/renderer/wallet/advanced.tsx`:
```typescript
export function Advanced() {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-white mb-6">Advanced</h2>
      {/* Your content */}
    </div>
  );
}
```

2. **Add to router** in `apps/studio/src/renderer/wallet/wallet.tsx`:
```typescript
import { Advanced } from "./advanced";

// Add button in sidebar
<button
  onClick={() => setCurrentView("advanced")}
  className={/* ... */}
>
  Advanced
</button>

// Add to view switcher
{currentView === "advanced" && <Advanced />}
```

### Debugging

#### Electron Main Process

```typescript
// In apps/studio/src/main/index.ts or rpc-bridge.ts
console.log("Debug:", someValue);

// Logs appear in terminal where you ran `pnpm dev:studio`
```

#### Electron Renderer Process

The dev server automatically opens DevTools. Use:
- **Console** - See React errors, logs
- **Network** - Not used (IPC instead)
- **React DevTools** - Inspect component tree
- **Sources** - Set breakpoints

```typescript
// In any renderer component
console.log("Debug:", someValue);
window.electronAPI  // Inspect available APIs
```

#### RPC Client

```typescript
// In packages/itc-rpc/src/client.ts
console.log("RPC Request:", method, params);
console.log("RPC Response:", data);
```

### Testing Changes

#### Manual Testing

1. **Start the app** - `pnpm dev:studio`
2. **Connect to node** - Enter credentials in Settings
3. **Test feature** - Navigate to relevant tab
4. **Check console** - Look for errors
5. **Verify data** - Compare with `bitcoin-cli` output

#### Automated Testing (Future)

```bash
# Unit tests
pnpm test:unit

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e
```

## Code Style Guide

### TypeScript

**Do:**
```typescript
// Explicit return types
async function getBalance(): Promise<number> {
  return await client.getBalance();
}

// Named exports
export function Component() { }

// Zod validation
const result = BalanceSchema.parse(data);
```

**Don't:**
```typescript
// Implicit any
function doSomething(data) { } // ❌

// Default exports
export default Component; // ❌ (except app.tsx, main.tsx)

// Unvalidated data
const balance = data.balance; // ❌ Parse with Zod
```

### React

**Do:**
```typescript
// Functional components with hooks
export function Component() {
  const [state, setState] = useState();
  return <div>...</div>;
}

// TanStack Query for async
const { data } = useQuery({
  queryKey: ["key"],
  queryFn: () => api.call(),
});

// Tailwind for styling
<div className="bg-gray-900 rounded-lg p-4">
```

**Don't:**
```typescript
// Class components
class Component extends React.Component { } // ❌

// fetch in useEffect
useEffect(() => {
  fetch("/api").then(/* ... */); // ❌ Use TanStack Query
}, []);

// Inline styles
<div style={{ color: "red" }}>  // ❌ Use Tailwind
```

### File Naming

```
✓ kebab-case.tsx
✓ kebab-case.ts
✗ PascalCase.tsx
✗ camelCase.ts
✗ snake_case.ts
```

### Imports

```typescript
// Node/NPM packages first
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

// Internal packages
import { InterchainedRPCClient } from "@interchained/rpc";

// Relative imports last
import { Component } from "./component";
import type { Props } from "./types";
```

## Common Tasks

### Adding a New Dependency

```bash
# To shared RPC package
cd packages/itc-rpc
pnpm add some-package

# To Electron app
cd apps/studio
pnpm add some-package

# To web app
cd apps/web
pnpm add some-package
```

### Updating Dependencies

```bash
# Check for updates
pnpm outdated

# Update specific package
pnpm update react

# Update all (careful!)
pnpm update --latest

# Check for security issues
pnpm audit
```

### Building for Production

```bash
# Build everything
pnpm build

# Build specific app
cd apps/studio
pnpm build

# Output in dist/ folders
```

### Linting and Type Checking

```bash
# Lint all code
pnpm lint

# Fix auto-fixable issues
pnpm lint:fix

# Type check
pnpm check:types
```

## Troubleshooting

### "Cannot find module '@interchained/rpc'"

```bash
# Reinstall workspace dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Electron won't start

```bash
# Check Electron is installed
cd apps/studio
pnpm list electron

# Reinstall if missing
pnpm install
```

### RPC connection fails

```bash
# Test node directly
bitcoin-cli -rpcuser=devuser -rpcpassword=devpass123 getblockchaininfo

# Check node is running
ps aux | grep interchainedd

# Check config file
cat ~/.interchained/interchained.conf
```

### Hot reload not working

```bash
# Kill all Node processes
pkill -9 node

# Restart dev server
pnpm dev:studio
```

### TypeScript errors

```bash
# Regenerate type definitions
pnpm check:types

# Check for multiple TypeScript versions
pnpm list typescript
```

## Project Structure Reference

```
interchained-wallet/
├── packages/
│   └── itc-rpc/              # Shared RPC client library
│       ├── src/
│       │   ├── client.ts     # RPC methods implementation
│       │   ├── types.ts      # TypeScript types + Zod schemas
│       │   └── index.ts      # Public exports
│       ├── package.json
│       └── tsconfig.json
├── apps/
│   ├── studio/               # Electron desktop app
│   │   ├── src/
│   │   │   ├── main/         # Electron main process (Node.js)
│   │   │   │   ├── index.ts          # App lifecycle
│   │   │   │   └── rpc-bridge.ts     # IPC ↔ RPC bridge
│   │   │   ├── preload/      # Secure IPC bridge
│   │   │   │   └── index.ts          # Context bridge
│   │   │   └── renderer/     # React UI (runs in Chromium)
│   │   │       ├── wallet/
│   │   │       │   ├── wallet.tsx    # Main container
│   │   │       │   ├── overview.tsx
│   │   │       │   ├── send.tsx
│   │   │       │   ├── receive.tsx
│   │   │       │   ├── activity.tsx
│   │   │       │   └── settings.tsx
│   │   │       ├── app.tsx           # Root component
│   │   │       └── main.tsx          # React entry point
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                  # Web version (future)
│       ├── src/
│       ├── vite.config.ts
│       ├── package.json
│       └── tsconfig.json
├── scripts/
│   ├── example.ts
│   └── test-rpc.ts           # RPC connection tester
├── uploads/                  # User-uploaded files
├── .env.example              # Environment template
├── .gitignore
├── package.json              # Root workspace config
├── pnpm-workspace.yaml       # Workspace definition
├── tsconfig.json             # Shared TypeScript config
├── README.md                 # Main documentation
├── QUICKSTART.md             # Quick start guide
├── ARCHITECTURE.md           # System architecture
├── DEPLOYMENT.md             # Production deployment
├── SECURITY.md               # Security checklist
└── DEVELOPMENT.md            # This file
```

## Resources

### Documentation
- [Bitcoin Core RPC](https://developer.bitcoin.org/reference/rpc/)
- [Electron Docs](https://www.electronjs.org/docs)
- [React Docs](https://react.dev/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/)
- [Zod](https://zod.dev/)

### Tools
- [Bitcoin Core](https://bitcoin.org/en/download)
- [Electrum](https://electrum.org/) - For testing transactions
- [pnpm](https://pnpm.io/)

### Community
- GitHub Issues - Bug reports and feature requests
- GitHub Discussions - Questions and ideas

## Next Steps

Now that you're set up:

1. **Explore the codebase** - Read through the components
2. **Make a small change** - Add a console.log somewhere
3. **Test your change** - See it work in the app
4. **Read ARCHITECTURE.md** - Understand the system design
5. **Pick an issue** - Start contributing!

Welcome to the team! 🎉
