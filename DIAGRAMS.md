# Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                               │
│                                                                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │  Overview  │  │    Send    │  │  Receive   │  │  Activity  │   │
│  │            │  │            │  │            │  │            │   │
│  │  Balance   │  │  Address   │  │   New      │  │    Tx      │   │
│  │  Wallet    │  │  Amount    │  │  Address   │  │   List     │   │
│  │   Info     │  │   Send     │  │    QR      │  │  Details   │   │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │
│                                                                      │
│  React 19 + Tailwind CSS 4 + TanStack Query                        │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Electron Renderer   │
                    │ (Chromium Process)  │
                    │                     │
                    │ window.electronAPI  │
                    └──────────┬──────────┘
                               │
                               │ IPC (Inter-Process Communication)
                               │
┌──────────────────────────────▼───────────────────────────────────────┐
│                     ELECTRON PRELOAD SCRIPT                          │
│                                                                      │
│  contextBridge.exposeInMainWorld('electronAPI', {                   │
│    rpc: {                                                           │
│      getBalance: () => ipcRenderer.invoke('rpc:get-balance'),      │
│      sendToAddress: (...) => ipcRenderer.invoke('rpc:send'),       │
│      ...                                                            │
│    }                                                                │
│  })                                                                 │
│                                                                      │
│  ✓ Context Isolation                                               │
│  ✓ No Direct Node Access                                           │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               │ Validated IPC Calls
                               │
┌──────────────────────────────▼───────────────────────────────────────┐
│                     ELECTRON MAIN PROCESS                            │
│                        (Node.js Runtime)                             │
│                                                                      │
│  ┌───────────────────────────────────────────────────────┐          │
│  │              RPC Bridge (rpc-bridge.ts)               │          │
│  │                                                       │          │
│  │  ipcMain.handle('rpc:get-balance', async () => {     │          │
│  │    if (!rpcClient) throw Error('Not initialized');   │          │
│  │    return await rpcClient.getBalance();              │          │
│  │  });                                                 │          │
│  │                                                       │          │
│  │  Credentials Storage:                                │          │
│  │  ┌─────────────────────────────────────┐             │          │
│  │  │ safeStorage.encryptString()         │             │          │
│  │  │   ↓                                 │             │          │
│  │  │ macOS: Keychain                     │             │          │
│  │  │ Windows: DPAPI                      │             │          │
│  │  │ Linux: libsecret                    │             │          │
│  │  └─────────────────────────────────────┘             │          │
│  └───────────────────────────┬───────────────────────────┘          │
│                              │                                      │
│  ┌───────────────────────────▼───────────────────────────┐          │
│  │       @interchained/rpc (RPC Client)                  │          │
│  │                                                       │          │
│  │  class InterchainedRPCClient {                       │          │
│  │    async getBalance(): Promise<number>               │          │
│  │    async sendToAddress(addr, amt): Promise<string>   │          │
│  │    async listTransactions(): Promise<Transaction[]>  │          │
│  │    ...                                               │          │
│  │  }                                                   │          │
│  │                                                       │          │
│  │  ✓ Zod Schema Validation                            │          │
│  │  ✓ Type Safety                                      │          │
│  │  ✓ Error Handling                                   │          │
│  └───────────────────────────┬───────────────────────────┘          │
│                              │                                      │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
                               │ HTTP POST (JSON-RPC)
                               │ Authorization: Basic base64(user:pass)
                               │
┌──────────────────────────────▼───────────────────────────────────────┐
│                      INTERCHAINEDD NODE                              │
│                   (Bitcoin Core 0.21.0 Compatible)                   │
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │   RPC Server    │  │  Wallet Engine  │  │   Blockchain    │     │
│  │                 │  │                 │  │                 │     │
│  │  Port 8332      │◄─┤  Private Keys   │  │  Block Height   │     │
│  │  localhost      │  │  Signing        │  │  Verification   │     │
│  │  Basic Auth     │  │  UTXO Set       │  │  Sync Status    │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
│                                                                      │
│  Methods:                                                           │
│  • getblockchaininfo  • getbalances      • listtransactions        │
│  • getnetworkinfo     • getnewaddress    • sendtoaddress           │
│  • getwalletinfo      • getbalance       • ...                     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Security Boundaries

```
┌─────────────────────────────────────────────────────────────────────┐
│ UNTRUSTED ZONE                                                      │
│ ┌─────────────────────────────────────────────────────────────┐     │
│ │ Electron Renderer (React UI)                                │     │
│ │                                                             │     │
│ │ • Can be compromised by XSS (hypothetically)                │     │
│ │ • Cannot access Node.js APIs                                │     │
│ │ • Cannot read files or spawn processes                      │     │
│ │ • Can only call whitelisted IPC methods                     │     │
│ └─────────────────────────────────────────────────────────────┘     │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                 ┌────────────▼─────────────┐
                 │   Context Isolation      │
                 │   Security Boundary      │
                 └────────────┬─────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────┐
│ TRUSTED ZONE                                                        │
│ ┌─────────────────────────────────────────────────────────────┐     │
│ │ Preload Script                                              │     │
│ │ • Validates all IPC calls                                   │     │
│ │ • Sanitizes inputs                                          │     │
│ │ • Type checks with TypeScript                               │     │
│ └─────────────────────────────────────────────────────────────┘     │
│                              │                                      │
│ ┌─────────────────────────────▼─────────────────────────────┐       │
│ │ Main Process                                              │       │
│ │ • Full Node.js access                                     │       │
│ │ • Credential encryption (OS keychain)                     │       │
│ │ • RPC client instance                                     │       │
│ │ • Network communication                                   │       │
│ └───────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow: Send Transaction

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. USER ACTION                                                      │
│                                                                      │
│    User fills form:                                                 │
│    • Address: bc1q...                                               │
│    • Amount: 0.001 ITC                                              │
│    • Comment: "Payment"                                             │
│                                                                      │
│    Clicks "Send" button                                             │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. REACT COMPONENT (send.tsx)                                       │
│                                                                      │
│    const sendMutation = useMutation({                               │
│      mutationFn: async () => {                                      │
│        // Validate locally                                          │
│        if (!address || amount <= 0) throw Error();                  │
│                                                                      │
│        // Call Electron API                                         │
│        return await window.electronAPI.rpc.sendToAddress(           │
│          address, amount, comment                                   │
│        );                                                           │
│      },                                                             │
│      onSuccess: (txid) => {                                         │
│        // Invalidate cache                                          │
│        queryClient.invalidateQueries(['balance']);                  │
│        alert(`Sent! TXID: ${txid}`);                                │
│      }                                                              │
│    });                                                              │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               ▼ IPC: rpc:send-to-address
┌─────────────────────────────────────────────────────────────────────┐
│ 3. PRELOAD SCRIPT (preload/index.ts)                                │
│                                                                      │
│    sendToAddress: (addr, amt, comment) =>                           │
│      ipcRenderer.invoke('rpc:send-to-address', addr, amt, comment)  │
│                                                                      │
│    (Type-safe wrapper, no validation here)                          │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               ▼ Validated IPC Message
┌─────────────────────────────────────────────────────────────────────┐
│ 4. MAIN PROCESS (rpc-bridge.ts)                                     │
│                                                                      │
│    ipcMain.handle('rpc:send-to-address',                            │
│      async (_, address: string, amount: number, comment?: string) => {│
│                                                                      │
│      // Check RPC client initialized                                │
│      if (!rpcClient) throw Error('Not connected');                  │
│                                                                      │
│      // Sanitize inputs                                             │
│      if (typeof address !== 'string') throw Error();                │
│      if (typeof amount !== 'number') throw Error();                 │
│                                                                      │
│      // Forward to RPC client                                       │
│      return await rpcClient.sendToAddress(                          │
│        address, amount, comment                                     │
│      );                                                             │
│    });                                                              │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. RPC CLIENT (@interchained/rpc)                                   │
│                                                                      │
│    async sendToAddress(                                             │
│      address: string,                                               │
│      amount: number,                                                │
│      comment?: string                                               │
│    ): Promise<string> {                                             │
│      const params: unknown[] = [address, amount];                   │
│      if (comment) params.push(comment);                             │
│                                                                      │
│      return await this.call<string>('sendtoaddress', params);       │
│    }                                                                │
│                                                                      │
│    private async call<T>(method: string, params: unknown[]) {       │
│      const response = await fetch(this.endpoint, {                  │
│        method: 'POST',                                              │
│        headers: {                                                   │
│          'Authorization': `Basic ${btoa(user:pass)}`,               │
│          'Content-Type': 'application/json'                         │
│        },                                                           │
│        body: JSON.stringify({                                       │
│          jsonrpc: '1.0',                                            │
│          id: ++this.requestId,                                      │
│          method,                                                    │
│          params                                                     │
│        })                                                           │
│      });                                                            │
│      return response.result;                                        │
│    }                                                                │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               ▼ HTTP POST
                               ▼ {"jsonrpc":"1.0","method":"sendtoaddress",...}
┌─────────────────────────────────────────────────────────────────────┐
│ 6. INTERCHAINEDD NODE                                                │
│                                                                      │
│    1. Parse JSON-RPC request                                        │
│    2. Verify HTTP Basic Auth                                        │
│    3. Validate address format                                       │
│    4. Check wallet has sufficient balance                           │
│    5. Select UTXOs to spend                                         │
│    6. Create transaction                                            │
│    7. Sign with private key (wallet)                                │
│    8. Broadcast to network                                          │
│    9. Return TXID                                                   │
│                                                                      │
│    {"result":"a3b2c1d...txid...","error":null,"id":42}              │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               ▼ Response flows back up
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 7. UI UPDATE                                                        │
│                                                                      │
│    • TXID displayed to user                                         │
│    • Balance query invalidated                                      │
│    • New balance fetched automatically                              │
│    • Transaction appears in activity list                           │
│    • Success message shown                                          │
└─────────────────────────────────────────────────────────────────────┘
```

## Credential Storage Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ User enters RPC credentials in Settings                             │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Settings.tsx                                                        │
│   ↓                                                                 │
│ window.electronAPI.rpc.saveCredentials(config)                      │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               ▼ IPC
┌─────────────────────────────────────────────────────────────────────┐
│ Main Process: rpc-bridge.ts                                         │
│                                                                      │
│ 1. Test connection first                                            │
│    const testClient = new RPC(config);                              │
│    await testClient.testConnection();                               │
│    ✓ Success                                                        │
│                                                                      │
│ 2. Encrypt credentials                                              │
│    const encrypted = safeStorage.encryptString(                     │
│      JSON.stringify({ user, pass })                                 │
│    );                                                               │
│    // encrypted = Buffer<...>                                       │
│                                                                      │
│ 3. Store encrypted buffer in memory                                 │
│    encryptedCredentials = encrypted;                                │
│                                                                      │
│ 4. Initialize RPC client                                            │
│    rpcClient = new RPC(config);                                     │
│                                                                      │
│ 5. Return success                                                   │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ OS-Level Encryption                                                 │
│                                                                      │
│ macOS:    Keychain (Secure Enclave if available)                    │
│ Windows:  DPAPI (Data Protection API)                               │
│ Linux:    Secret Service API / libsecret                            │
│                                                                      │
│ Credentials encrypted at rest                                       │
│ Only decryptable by same user on same machine                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Package Dependencies

```
apps/studio/
  ├─ @interchained/rpc (workspace:*)
  │    └─ zod
  ├─ electron
  ├─ react
  ├─ react-dom
  ├─ @tanstack/react-query
  ├─ tailwindcss
  └─ vite
       ├─ vite-plugin-electron
       └─ @vitejs/plugin-react

packages/itc-rpc/
  └─ zod (only dependency)

apps/web/
  ├─ @interchained/rpc (workspace:*)
  ├─ react
  ├─ hono (server-side)
  └─ ... (similar to studio renderer)
```

## File Structure (Simplified)

```
interchained-wallet/
│
├── packages/
│   └── itc-rpc/                    # Shared RPC library
│       └── src/
│           ├── client.ts           # RPC methods
│           ├── types.ts            # Type definitions
│           └── index.ts            # Exports
│
├── apps/
│   └── studio/                     # Electron app
│       ├── src/
│       │   ├── main/
│       │   │   ├── index.ts        # App lifecycle
│       │   │   └── rpc-bridge.ts   # IPC ↔ RPC
│       │   ├── preload/
│       │   │   └── index.ts        # Context bridge
│       │   └── renderer/
│       │       └── wallet/
│       │           ├── wallet.tsx  # Container
│       │           ├── overview.tsx
│       │           ├── send.tsx
│       │           ├── receive.tsx
│       │           ├── activity.tsx
│       │           └── settings.tsx
│       ├── index.html
│       └── vite.config.ts
│
├── scripts/
│   └── test-rpc.ts                 # Testing utility
│
├── README.md                       # Main docs
├── QUICKSTART.md                   # Getting started
├── ARCHITECTURE.md                 # This file
├── DEVELOPMENT.md                  # Dev guide
├── DEPLOYMENT.md                   # Production
├── SECURITY.md                     # Security audit
└── STATUS.md                       # Project status
```

---

**Legend:**
- `┌─┐` Boxes = Components/Processes
- `│` Vertical lines = Data/control flow
- `▼` Arrows = Direction of flow
- `◄─` Connections between components
