# Security Audit Checklist

Use this checklist before deploying to production.

## Electron Security

### Context Isolation
- [ ] `contextIsolation: true` in all BrowserWindow instances
- [ ] `nodeIntegration: false` in all windows
- [ ] `sandbox: false` (required for preload)
- [ ] No `remote` module usage
- [ ] No `enableRemoteModule: true`

### Preload Scripts
- [ ] Preload script path is absolute and verified
- [ ] Only explicit APIs exposed via `contextBridge`
- [ ] No dynamic code execution in preload
- [ ] No eval() or Function() constructor usage
- [ ] Input validation on all IPC boundaries

### Content Security Policy
- [ ] CSP meta tag in index.html
- [ ] `default-src 'self'`
- [ ] `script-src 'self'`
- [ ] No `unsafe-inline` or `unsafe-eval`
- [ ] External resources whitelisted if needed

### IPC Security
- [ ] All IPC handlers validate input types
- [ ] Method whitelist enforced (no arbitrary RPC)
- [ ] Rate limiting on expensive operations
- [ ] Async errors properly caught and handled
- [ ] No sensitive data logged

### Navigation Protection
- [ ] `will-navigate` event listener prevents external navigation
- [ ] `new-window` event prevents popup creation
- [ ] `webview` tag disabled
- [ ] No opening of untrusted URLs

### Protocol Handlers
- [ ] No custom protocol handlers (or properly validated if needed)
- [ ] Deep linking sanitized if implemented

## Credential Management

### Storage
- [ ] RPC credentials encrypted with `safeStorage`
- [ ] No plaintext credentials in memory longer than needed
- [ ] No credentials in logs
- [ ] No credentials in error messages
- [ ] Credentials cleared on app quit

### Transmission
- [ ] RPC auth via HTTP Basic Auth only
- [ ] HTTPS for remote connections (if ever implemented)
- [ ] No credentials in URLs
- [ ] No credentials in IPC message payload (use secure storage)

## RPC Client Security

### Input Validation
- [ ] All RPC parameters validated with Zod
- [ ] Address format validation
- [ ] Amount range validation (no negative, no overflow)
- [ ] String length limits enforced
- [ ] No SQL-style injection possible (JSON-RPC)

### Response Validation
- [ ] All RPC responses parsed with Zod schemas
- [ ] Unexpected response shapes rejected
- [ ] Error responses properly typed
- [ ] No trust in node data without validation

### Connection Security
- [ ] Localhost-only by default (127.0.0.1)
- [ ] No remote RPC connections (or require HTTPS)
- [ ] Connection timeout configured
- [ ] Retry logic with backoff
- [ ] Connection errors don't leak credentials

## Node Security

### Configuration
- [ ] `rpcbind=127.0.0.1` (no external access)
- [ ] `rpcallowip=127.0.0.1` only
- [ ] Strong `rpcpassword` (20+ chars, random)
- [ ] Wallet encryption enabled
- [ ] `walletpassphrase` timeout configured

### Wallet
- [ ] Private keys never leave node
- [ ] No private key export functionality
- [ ] Backup procedures documented
- [ ] Multi-sig support if needed
- [ ] Watch-only for monitoring wallets

## Application Security

### Code
- [ ] `pnpm audit` shows no critical vulnerabilities
- [ ] Dependencies pinned in package.json
- [ ] Lock file committed (pnpm-lock.yaml)
- [ ] No `eval()` or `Function()` anywhere
- [ ] No `dangerouslySetInnerHTML`

### Build Process
- [ ] Build reproducible (same output given same input)
- [ ] Source maps disabled in production
- [ ] Debug logging disabled in production
- [ ] DevTools disabled in production
- [ ] Environment variables not leaked to renderer

### Updates
- [ ] Auto-update uses HTTPS
- [ ] Update signatures verified
- [ ] Rollback mechanism exists
- [ ] Update channel (stable/beta) configurable

## User Data

### Privacy
- [ ] No telemetry without user consent
- [ ] No crash reports with sensitive data
- [ ] No analytics tracking
- [ ] Minimal data collection
- [ ] Privacy policy if collecting any data

### Storage
- [ ] User data in proper app directory (not temp)
- [ ] Permissions set correctly (user-only read/write)
- [ ] No world-readable files
- [ ] Backup/restore functionality tested

## UI/UX Security

### User Confirmation
- [ ] Send transactions require explicit confirmation
- [ ] Amount and address displayed before send
- [ ] No auto-send functionality
- [ ] Address validation visual feedback
- [ ] Balance checks before send

### Error Messages
- [ ] No sensitive data in error messages
- [ ] No stack traces shown to user
- [ ] Helpful but not revealing
- [ ] Logged securely for debugging

### Visual Security
- [ ] Address display prevents substitution attacks
- [ ] Amount display clear and unambiguous
- [ ] No clickjacking possible
- [ ] Overlay attacks prevented

## Network Security

### RPC Communication
- [ ] Localhost only (no LAN/WAN)
- [ ] No CORS issues (desktop app)
- [ ] No man-in-the-middle possible (localhost)
- [ ] Connection timeouts prevent hangs

### Future Web Version
- [ ] HTTPS only
- [ ] HSTS headers
- [ ] Certificate pinning (if possible)
- [ ] No mixed content
- [ ] RPC proxy authentication

## Testing

### Functional Tests
- [ ] Send transaction with valid inputs
- [ ] Receive address generation
- [ ] Balance updates correctly
- [ ] Transaction history accurate
- [ ] Settings persistence works

### Security Tests
- [ ] Invalid inputs rejected
- [ ] Malformed RPC responses handled
- [ ] Node offline handled gracefully
- [ ] Wrong credentials detected
- [ ] Credential encryption verified

### Penetration Testing
- [ ] Attempt IPC message forgery
- [ ] Try to extract credentials from memory
- [ ] Attempt prototype pollution
- [ ] Test XSS vectors (even if context isolated)
- [ ] Verify no arbitrary code execution

## Deployment

### Distribution
- [ ] Binaries code-signed (macOS, Windows)
- [ ] Checksums (SHA256) published
- [ ] GPG signature on checksums
- [ ] Download over HTTPS only
- [ ] Release notes include security fixes

### User Instructions
- [ ] Installation guide reviewed
- [ ] Security best practices documented
- [ ] Backup procedures explained
- [ ] What to do if compromised
- [ ] How to verify authenticity

## Incident Response

### Preparation
- [ ] Security contact documented
- [ ] Vulnerability disclosure policy
- [ ] Incident response plan exists
- [ ] Emergency patch process defined
- [ ] Rollback procedure tested

### Monitoring
- [ ] Log suspicious activities (if any)
- [ ] Node connection failures tracked
- [ ] Unexpected RPC errors monitored
- [ ] User reports triaged

## Compliance

### Legal
- [ ] License clearly stated (MIT)
- [ ] No trademark violations
- [ ] Export control review (cryptography)
- [ ] Terms of service if needed
- [ ] Privacy policy if collecting data

### Financial
- [ ] No "investment" claims
- [ ] Disclaimers about risk
- [ ] No financial advice
- [ ] Compliance with local regulations

## Final Checks

- [ ] All above items checked and verified
- [ ] Security review by second person
- [ ] Penetration test performed
- [ ] User acceptance testing completed
- [ ] Documentation up to date
- [ ] Emergency contacts prepared
- [ ] Release announcement ready

## Sign-Off

**Reviewed by:** ___________________________  
**Date:** ___________________________  
**Version:** ___________________________  
**Approved for release:** [ ] Yes [ ] No  

**Notes:**
_______________________________________________
_______________________________________________
_______________________________________________

## Post-Release

- [ ] Monitor for security issues
- [ ] Respond to vulnerability reports
- [ ] Keep dependencies updated
- [ ] Regular security audits
- [ ] User education ongoing
