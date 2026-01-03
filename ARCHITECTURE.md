# Architecture Documentation

## System Overview

The Interchained Wallet is a **hybrid desktop/web application** for interacting with a local `interchainedd` node via Bitcoin Core 0.21.0 compatible RPC.

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                      │
├───────────────────────┬─────────────────────────────────────┤
│   Electron Renderer   │         Web Browser                 │
│   (React + Tailwind)  │   (React + Tailwind)                │
└───────────┬───────────┴──────────────┬──────────────────────┘
            │                          │
            │ IPC                      │ HTTPS (future)
            ▼                          ▼
┌───────────────────────┐    ┌─────────────────────┐
│  Electron Main Process│    │   Web RPC Proxy     │
│  (Secure IPC Bridge)  │    │   (Not Implemented) │
└───────────┬───────────┘    └──────────┬──────────┘
            │                           │
            │ HTTP Basic Auth           │
            └────────────┬──────────────┘
                         ▼
            ┌─────────────────────────┐
            │  @interchained/rpc      │
            │  (RPC Client Library)   │
            └────────────┬────────────┘
                         │
                         │ JSON-RPC / HTTP
                         ▼
            ┌─────────────────────────┐
            │    interchainedd        │
            │  (Bitcoin Core 0.21.0)  │
            │   - Wallet Management   │
            │   - Blockchain Sync     │
            │   - Private Keys        │
            └─────────────────────────┘
```

## Component Architecture

### 1. `packages/itc-rpc` - RPC Client Library

**Purpose:** Type-safe JSON-RPC client for Bitcoin Core 0.21.0

**Key Files:**
- `src/types.ts` - TypeScript types + Zod schemas
- `src/client.ts` - RPC client implementation
- `src/index.ts` - Public exports

**Design Decisions:**

✓ **Zod for Runtime Validation**
- Validates all RPC responses
- Catches node version mismatches early
- Type-safe parsing

✓ **Explicit Error Types**
- `RPCError` - RPC method errors (code + message)
- `RPCConnectionError` - Network/auth failures
- Preserves error context for debugging

✓ **Bitcoin Core Method Signatures**
- Exact parameter order and types
- Optional parameters match Bitcoin Core docs
- No "helpful" abstractions that hide behavior

**Example:**
```typescript
const client = new InterchainedRPCClient(config);

try {
  const balance = await client.getBalance();
  console.log(balance); // number, validated by Zod
} catch (error) {
  if (error instanceof RPCError) {
    console.error(`RPC ${error.code}: ${error.message}`);
  }
}
```

### 2. `apps/studio` - Electron Desktop App

#### 2.1 Main Process (`src/main/`)

**Purpose:** Trusted Node.js environment with full system access

**`index.ts` - Application Lifecycle:**
```typescript
app.whenReady() → createWindow()
├── Preload script injection
├── Context isolation enforced
└── Window management

app.on('window-all-closed') → Cleanup
```

**`rpc-bridge.ts` - Secure RPC Gateway:**
```typescript
setupRPCBridge()
├── ipcMain.handle('rpc:test-connection')
├── ipcMain.handle('rpc:save-credentials')
│   └── safeStorage.encryptString()  ← OS keychain
├── ipcMain.handle('rpc:get-balance')
└── ... (one handler per RPC method)
```

**Security Model:**
- Credentials encrypted via Electron's `safeStorage`
- RPC client instance stored in main process only
- All renderer requests validated before forwarding

#### 2.2 Preload Script (`src/preload/`)

**Purpose:** Secure IPC bridge between renderer and main

**`index.ts` - API Exposure:**
```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  rpc: {
    getBalance: () => ipcRenderer.invoke('rpc:get-balance'),
    // ... type-safe wrappers
  }
});
```

**Critical Properties:**
- `contextIsolation: true` - Renderer cannot access Node.js
- `nodeIntegration: false` - No `require()` in renderer
- `sandbox: false` - Allows preload to use Node.js APIs
- Only specific APIs exposed (whitelist model)

#### 2.3 Renderer Process (`src/renderer/`)

**Purpose:** Untrusted UI layer (React application)

**Structure:**
```
renderer/
├── app.tsx              # Root component + QueryClient
├── main.tsx             # ReactDOM entry point
├── styles/globals.css   # Tailwind CSS
└── wallet/
    ├── wallet.tsx       # Main container + routing
    ├── overview.tsx     # Balance display
    ├── send.tsx         # Send form
    ├── receive.tsx      # Address generation
    ├── activity.tsx     # Transaction list
    └── settings.tsx     # RPC configuration
```

**State Management:**
- **TanStack Query** for async state
- **React hooks** for local UI state
- No Redux/MobX (YAGNI for this app)

**Data Flow:**
```typescript
Component → useMutation/useQuery
    ↓
window.electronAPI.rpc.method()
    ↓ IPC
Main process (validates & forwards)
    ↓ HTTP
interchainedd RPC
    ↓
Response flows back up
    ↓
React re-renders
```

### 3. `apps/web` - Web Application

**Current State:** Shares same UI components as Electron renderer

**Missing:** Server-side RPC proxy (security requirement)

**Future Architecture:**
```
React App (Static CDN)
    ↓ HTTPS + API Key
Backend Proxy (Node.js/Go)
    ↓ Validate user permissions
    ↓ Rate limiting
    ↓ Input sanitization
interchainedd RPC
```

**Why Proxy Required:**
- Browser can't store RPC credentials securely
- CORS prevents direct localhost access from CDN
- Rate limiting prevents abuse
- User isolation (multi-tenant)

## Security Architecture

### Threat Model

**Trusted:**
- Operating system
- Electron framework
- User's file system
- Local interchainedd node

**Untrusted:**
- Renderer process (treat as hostile web page)
- External network (future web version)
- User input (validate everything)

### Defense Layers

1. **Context Isolation**
   - Renderer can't access Node.js APIs
   - No `require()`, `process`, `fs`, etc.

2. **IPC Validation**
   - Type checking on all IPC messages
   - Whitelist of allowed methods
   - No arbitrary RPC method execution

3. **Credential Encryption**
   - `safeStorage.encryptString()` uses:
     - macOS: Keychain
     - Windows: DPAPI
     - Linux: Secret Service API/libsecret
   - Credentials never touch disk unencrypted

4. **No Private Keys in App**
   - All keys stay in interchainedd
   - App only sends RPC commands
   - Node enforces wallet unlock, etc.

### Attack Surface Analysis

| Vector | Risk | Mitigation |
|--------|------|------------|
| Malicious renderer code | Medium | Context isolation, IPC whitelist |
| Compromised dependencies | Medium | `pnpm audit`, lock files |
| RPC credential theft | Low | OS-level encryption |
| Node compromise | High | Out of scope (trust node) |
| Physical access | High | OS-level security, screen lock |
| Network exposure | None | Localhost only |

## Data Flow Diagrams

### Credential Storage Flow

```
User enters RPC credentials
    ↓
Renderer: Settings.tsx
    ↓ IPC: rpc:save-credentials
Main: rpc-bridge.ts
    ↓
Test connection (RPC call)
    ↓ Success
safeStorage.encryptString()
    ↓
Encrypted buffer stored in memory
    ↓
RPC client initialized
```

### Transaction Sending Flow

```
User enters address + amount
    ↓
Renderer: Send.tsx (useMutation)
    ↓ Validation (Zod schema)
    ↓ IPC: rpc:send-to-address
Main: rpc-bridge.ts
    ↓ Sanitize inputs
    ↓ HTTP Basic Auth
interchainedd RPC: sendtoaddress
    ↓ Wallet checks balance, creates tx
    ↓ Returns TXID
    ↓ IPC response
Renderer: Show success + TXID
    ↓
TanStack Query: Invalidate balance cache
    ↓
UI refreshes balance automatically
```

## Technology Choices

### Why Electron?

✓ **Cross-platform** - One codebase for Win/Mac/Linux
✓ **Secure IPC** - Built-in context isolation
✓ **OS integration** - safeStorage, notifications, tray icons
✓ **Familiar stack** - Web developers can contribute
✗ **Large bundle size** - ~100MB+ distributable
✗ **Memory usage** - Chromium overhead

### Why React Query (TanStack Query)?

✓ **Async state management** - Perfect for RPC calls
✓ **Automatic refetching** - Keeps UI in sync
✓ **Caching** - Reduces node load
✓ **Error handling** - Built-in retry logic
✗ **Learning curve** - Different from Redux

### Why Tailwind CSS?

✓ **Utility-first** - Fast prototyping
✓ **Consistent design** - Hard to make ugly UIs
✓ **Dark mode** - Built-in support
✓ **Small bundle** - Only used classes shipped
✗ **Verbose HTML** - Many class names

### Why Zod?

✓ **Runtime validation** - Catches node incompatibilities
✓ **Type inference** - DRY with TypeScript
✓ **Composable** - Build complex schemas
✓ **Great errors** - Helpful validation messages

### Why pnpm Workspaces?

✓ **Monorepo support** - Share `itc-rpc` package
✓ **Fast** - Symlinks instead of copies
✓ **Strict** - Prevents phantom dependencies
✓ **Disk efficient** - Content-addressable store

## Performance Considerations

### Optimization Strategies

1. **Query Caching**
   - Balance: Refetch every 10s
   - Blockchain info: Refetch every 30s
   - Transactions: Refetch every 15s
   - Manual invalidation on mutations

2. **Lazy Loading**
   - Transaction list paginated (count param)
   - Only load visible data
   - Future: Virtual scrolling for large lists

3. **Debouncing**
   - Address input validation
   - Amount parsing
   - Search/filter operations

4. **Build Optimization**
   - Vite code splitting
   - Tree shaking unused Tailwind classes
   - Minification in production

### Scalability Limits

**Current Design:**
- Supports 1 user, 1 wallet, 1 node
- Transaction list limited to recent N
- No concurrent request batching

**Future Improvements:**
- Multi-wallet support
- Request batching (batch RPC)
- Pagination with infinite scroll
- Background sync workers

## Testing Strategy

### Unit Tests (Not Implemented)
- RPC client methods
- Schema validation
- Error handling

### Integration Tests (Not Implemented)
- Full RPC flow against mock node
- IPC communication
- Credential encryption

### Manual Testing
- Test against real interchainedd node
- Verify all wallet operations
- Check error scenarios (node offline, wrong credentials)

### Future Test Suite
```
packages/itc-rpc/
  tests/
    client.test.ts
    schemas.test.ts

apps/studio/
  tests/
    unit/
      rpc-bridge.test.ts
    integration/
      wallet-flow.test.ts
    e2e/
      send-transaction.test.ts
```

## Future Architecture Considerations

### Mode B (Self-Custody)

Adding local key management would require:

1. **Crypto Library** - BIP32/39/44 implementation
2. **Secure Storage** - Encrypted local key storage
3. **Signing** - Client-side transaction signing
4. **PSBT Support** - Partially Signed Bitcoin Transactions
5. **Hardware Wallet** - USB communication (WebHID/HID)

**Architecture Changes:**
```
Current: Renderer → Main → Node (signs)
Mode B:  Renderer → Main → LocalWallet (signs) → Node (broadcasts)
```

### Multi-Node Support

Manage multiple nodes/wallets:

```typescript
type NodeConfig = {
  id: string;
  name: string;
  rpc: RPCConfig;
};

// Store array of configs
// Switch active node in UI
// Isolated RPC clients per node
```

### Watch-Only Wallets

Monitor addresses without private keys:

```typescript
// Import xpub or individual addresses
// Poll for transactions
// No signing capability
// Useful for cold storage monitoring
```

## Development Guidelines

### Adding New Features

1. **RPC Method** → Add to `itc-rpc` package
2. **IPC Handler** → Add to `rpc-bridge.ts`
3. **Preload API** → Expose in `preload/index.ts`
4. **Type Definitions** → Update `electron-env.d.ts`
5. **React Component** → Use with `useQuery`/`useMutation`

### Code Style

- **TypeScript strict mode** - No `any` types
- **Functional React** - Hooks only, no classes
- **Error handling** - Always catch and display
- **Input validation** - Zod schemas everywhere
- **Comments** - Why, not what

### Git Workflow

```bash
# Feature branch
git checkout -b feature/add-coin-control

# Commit with conventional commits
git commit -m "feat(wallet): add coin control UI"

# PR with description
# Review, test, merge
```

## References

- [Bitcoin Core RPC Documentation](https://developer.bitcoin.org/reference/rpc/)
- [Electron Security Guidelines](https://www.electronjs.org/docs/latest/tutorial/security)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Zod Documentation](https://zod.dev/)
