import { app, BrowserWindow, Menu } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { setupRPCBridge } from "./rpc-bridge";
import { appendLog } from "./log";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];

function findFirstExistingPath(candidates: string[]): string | null {
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      // ignore
    }
  }
  return null;
}

function getPreloadPath(): string {
  const resources = process.resourcesPath;

  const candidates = [
    // dev + expected packaged layout when main is in dist/main
    path.resolve(__dirname, "..", "preload", "index.cjs"),

    // packaged: inside app.asar
    path.join(resources, "app.asar", "dist", "preload", "index.cjs"),
    path.join(resources, "app.asar", "preload", "index.cjs"),

    // packaged: unpacked
    path.join(resources, "app.asar.unpacked", "dist", "preload", "index.cjs"),
    path.join(resources, "app.asar.unpacked", "preload", "index.cjs"),
  ];

  const found = findFirstExistingPath(candidates);
  if (!found) {
    throw new Error(
      `Preload script not found. Tried:\n${candidates.join("\n")}`
    );
  }
  return found;
}

function getRendererIndexHtmlPath(): string {
  const resources = process.resourcesPath;

  const candidates = [
    // dev build output
    path.resolve(__dirname, "..", "renderer", "index.html"),

    // packaged asar
    path.join(resources, "app.asar", "dist", "renderer", "index.html"),
    path.join(resources, "app.asar", "renderer", "index.html"),

    // packaged unpacked
    path.join(resources, "app.asar.unpacked", "dist", "renderer", "index.html"),
    path.join(resources, "app.asar.unpacked", "renderer", "index.html"),
  ];

  const found = findFirstExistingPath(candidates);
  if (!found) {
    throw new Error(
      `Renderer index.html not found. Tried:\n${candidates.join("\n")}`
    );
  }
  return found;
}

let mainWindow: BrowserWindow | null;

function createWindow() {
  const logFile = path.join(app.getPath("userData"), "logs", "main.log");

  appendLog(logFile, `process.resourcesPath=${process.resourcesPath}`);
  appendLog(logFile, `__dirname=${__dirname}`);
  appendLog(logFile, `VITE_DEV_SERVER_URL=${VITE_DEV_SERVER_URL || ""}`);

  const preloadPath = getPreloadPath();
  const preloadExists = fs.existsSync(preloadPath);
  appendLog(logFile, `preloadPath=${preloadPath}`);
  appendLog(logFile, `preloadExists=${preloadExists}`);

  console.log("[Electron] preload:", preloadPath);
  console.log("[Electron] preload exists:", preloadExists);
  console.log("[Electron] dev server:", VITE_DEV_SERVER_URL || "none");

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#1a1a1a",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      backgroundThrottling: false,
    },
  });

  // Disable default menu to prevent keyboard shortcut conflicts
  Menu.setApplicationMenu(null);

  mainWindow.webContents.on("did-finish-load", async () => {
    console.log("[Electron] Window loaded, sending test message");
    mainWindow?.webContents.send(
      "main-process-message",
      new Date().toLocaleString()
    );
    
    mainWindow?.focus();

    const logFile = path.join(app.getPath("userData"), "logs", "main.log");

    try {
      const hasElectronAPI = await mainWindow?.webContents.executeJavaScript(
        "Boolean(window.electronAPI && window.electronAPI.rpc)",
        true
      );

      appendLog(logFile, `rendererHasElectronAPI=${String(hasElectronAPI)}`);

      if (!hasElectronAPI) {
        const diag = {
          resourcesPath: process.resourcesPath,
          preloadPath,
          preloadExists: fs.existsSync(preloadPath),
        };
        appendLog(logFile, `rendererMissingElectronAPI diag=${JSON.stringify(diag)}`);

        const diagJson = JSON.stringify(diag, null, 2);
        const logFileEscaped = logFile.replace(/\\/g, "\\\\");
        const overlayHtml = [
          '<h2 style="margin:0 0 12px 0; font-size:18px;">Preload bridge not available</h2>',
          '<p style="margin:0 0 12px 0; color:#a3a3a3;">window.electronAPI is missing. This is not an RPC issue; the preload script is not running.</p>',
          `<div style="white-space:pre-wrap; line-height:1.4; font-size:12px; background:#111; border:1px solid #333; padding:12px; border-radius:8px;">${diagJson}</div>`,
          '<p style="margin:12px 0 0 0; color:#a3a3a3;">A log file was written to:</p>',
          `<div style="white-space:pre-wrap; font-size:12px; background:#111; border:1px solid #333; padding:12px; border-radius:8px;">${logFileEscaped}</div>`,
        ].join("");

        const overlayScript = `
          (function(){
            const existing = document.getElementById('__preload_diag__');
            if (existing) return;
            const el = document.createElement('div');
            el.id='__preload_diag__';
            el.style.position='fixed';
            el.style.inset='0';
            el.style.background='#0b0b0b';
            el.style.color='#e5e5e5';
            el.style.padding='24px';
            el.style.fontFamily='ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
            el.style.zIndex='999999';
            el.innerHTML = ${JSON.stringify(overlayHtml)};
            document.body.appendChild(el);
          })();
        `;
        await mainWindow?.webContents.executeJavaScript(overlayScript, true);
      }
    } catch (e: any) {
      appendLog(logFile, `executeJavaScriptCheckFailed=${e?.message || String(e)}`);
    }
  });


  if (VITE_DEV_SERVER_URL) {
    console.log("[Electron] Loading from dev server:", VITE_DEV_SERVER_URL);
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    const indexHtml = getRendererIndexHtmlPath();
    console.log("[Electron] loading file:", indexHtml);
    mainWindow.loadFile(indexHtml);
  }
}

app.whenReady().then(() => {
  console.log("[Electron] App ready, setting up RPC bridge");
  setupRPCBridge();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    mainWindow = null;
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
