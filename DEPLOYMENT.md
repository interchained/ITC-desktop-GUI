# Deployment Guide

## Building for Production

### Electron Desktop Application

The Electron app can be packaged for distribution on Windows, macOS, and Linux.

#### 1. Add electron-builder

First, add the packager back to `apps/studio/package.json`:

```bash
cd apps/studio
pnpm add -D electron-builder@^25.1.8
```

Add to `package.json`:

```json
{
  "scripts": {
    "package": "electron-builder",
    "package:win": "electron-builder --win",
    "package:mac": "electron-builder --mac",
    "package:linux": "electron-builder --linux"
  },
  "build": {
    "appId": "com.interchained.wallet",
    "productName": "Interchained Wallet",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "package.json"
    ],
    "mac": {
      "category": "public.app-category.finance",
      "target": ["dmg", "zip"]
    },
    "win": {
      "target": ["nsis", "portable"]
    },
    "linux": {
      "target": ["AppImage", "deb", "rpm"],
      "category": "Finance"
    }
  }
}
```

#### 2. Build the application

```bash
# Build TypeScript and Vite
pnpm build

# Package for current platform
pnpm package

# Or specific platform
pnpm package:win   # Windows
pnpm package:mac   # macOS
pnpm package:linux # Linux
```

Output will be in `apps/studio/release/`.

#### 3. Distribution Files

**Windows:**
- `Interchained Wallet Setup X.X.X.exe` - Installer
- `Interchained Wallet X.X.X.exe` - Portable

**macOS:**
- `Interchained Wallet-X.X.X.dmg` - Disk image
- `Interchained Wallet-X.X.X-mac.zip` - Archive

**Linux:**
- `Interchained Wallet-X.X.X.AppImage` - Universal
- `interchained-wallet_X.X.X_amd64.deb` - Debian/Ubuntu
- `interchained-wallet-X.X.X.x86_64.rpm` - Fedora/RHEL

### Web Application

The web version requires additional backend infrastructure.

#### 1. Build the web app

```bash
cd apps/web
pnpm build
```

Output in `apps/web/dist/`.

#### 2. RPC Proxy Requirement

**Security Note:** Never expose RPC credentials to the browser.

You need a server-side proxy that:
- Accepts authenticated requests from web app
- Forwards to interchainedd with real credentials
- Validates all inputs
- Rate limits requests

Example architecture:

```
Browser (React)
    ↓ HTTPS
Auth Server (API keys)
    ↓ Internal
RPC Proxy
    ↓ HTTP Basic Auth
interchainedd node
```

#### 3. Example Proxy Setup (Node.js)

```typescript
// server/rpc-proxy.ts
import express from 'express';
import { InterchainedRPCClient } from '@interchained/rpc';

const app = express();
app.use(express.json());

// Authenticate web users
function authenticateUser(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!isValidApiKey(apiKey)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Rate limiting
import rateLimit from 'express-rate-limit';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use('/api/rpc', authenticateUser, limiter);

// Proxy specific methods only
const ALLOWED_METHODS = [
  'getblockchaininfo',
  'getnetworkinfo',
  'getwalletinfo',
  'getbalances',
  'listtransactions'
];

app.post('/api/rpc/:method', async (req, res) => {
  const { method } = req.params;
  
  if (!ALLOWED_METHODS.includes(method)) {
    return res.status(403).json({ error: 'Method not allowed' });
  }

  const client = new InterchainedRPCClient({
    host: process.env.RPC_HOST!,
    port: parseInt(process.env.RPC_PORT!),
    username: process.env.RPC_USER!,
    password: process.env.RPC_PASS!,
  });

  try {
    const result = await client[method]();
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

#### 4. Deploy to hosting

Deploy both:
- Static React build → CDN/Vercel/Netlify
- Proxy server → VPS/AWS/Railway

## Code Signing

### macOS

```bash
# Get Developer ID certificate from Apple
# Add to electron-builder config:
{
  "mac": {
    "identity": "Developer ID Application: Your Name (TEAM_ID)",
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "build/entitlements.mac.plist",
    "entitlementsInherit": "build/entitlements.mac.plist"
  }
}
```

### Windows

```bash
# Get code signing certificate
# Add to config:
{
  "win": {
    "certificateFile": "path/to/cert.pfx",
    "certificatePassword": "password"
  }
}
```

## Security Considerations

### Before Distribution

1. **Audit dependencies** - Run `pnpm audit`
2. **Review all RPC methods** - Ensure only needed methods are exposed
3. **Test credential encryption** - Verify safeStorage works on target OS
4. **Validate input sanitization** - All user inputs should be validated
5. **Enable CSP** - Add Content Security Policy to HTML
6. **Remove dev tools** - Ensure `openDevTools()` is removed in production

### User Instructions

Include in documentation:
- **Never share RPC credentials**
- **Run node locally only** - Don't expose RPC to network
- **Keep wallet encrypted** - Use `walletpassphrase` in interchainedd
- **Backup wallet.dat** - Regular backups essential
- **Verify downloads** - Provide checksums for installers

## Auto-Update Setup

Add to `apps/studio/package.json`:

```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "your-org",
      "repo": "interchained-wallet"
    }
  }
}
```

In main process:

```typescript
import { autoUpdater } from 'electron-updater';

app.whenReady().then(() => {
  autoUpdater.checkForUpdatesAndNotify();
});
```

## CI/CD Pipeline

Example GitHub Actions:

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        os: [macos-latest, ubuntu-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 22
          cache: 'pnpm'
      
      - run: pnpm install
      - run: cd apps/studio && pnpm build
      - run: cd apps/studio && pnpm package
      
      - uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.os }}-build
          path: apps/studio/release/*
```

## Distribution Channels

### GitHub Releases
- Upload built artifacts
- Include checksums (SHA256)
- Sign releases with GPG

### Website
- Host on dedicated domain
- Provide download links
- Include verification instructions

### Package Managers

**macOS - Homebrew:**
```ruby
cask "interchained-wallet" do
  version "0.1.0"
  url "https://releases.example.com/Interchained-Wallet-#{version}.dmg"
  sha256 "..."
  name "Interchained Wallet"
  homepage "https://interchained.org"
  app "Interchained Wallet.app"
end
```

**Windows - Chocolatey:**
```xml
<package>
  <metadata>
    <id>interchained-wallet</id>
    <version>0.1.0</version>
    ...
  </metadata>
</package>
```

**Linux - Snap:**
```yaml
name: interchained-wallet
version: '0.1.0'
summary: Interchained cryptocurrency wallet
description: |
  Secure desktop wallet for Interchained
confinement: strict
```

## Support & Updates

- Document known issues
- Provide support channels (GitHub issues, Discord, etc.)
- Maintain changelog
- Plan regular security updates
- Monitor for dependency vulnerabilities

## Compliance

Depending on jurisdiction, you may need:
- Privacy policy
- Terms of service
- License agreements
- Financial services compliance
- Export control compliance (cryptography)

Consult legal counsel before public distribution.
