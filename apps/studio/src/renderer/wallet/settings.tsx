import { useState } from "react";
import { Logo } from "../components/logo";
import type { RPCConfig } from "@interchained/rpc";

interface SettingsProps {
  onConnect: (config: RPCConfig) => Promise<{ success: boolean; error?: string }>;
}

export function Settings({ onConnect }: SettingsProps) {
  const [host, setHost] = useState("127.0.0.1");
  const [port, setPort] = useState("8332");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [wallet, setWallet] = useState("");
  const [testing, setTesting] = useState(false);
  const [loadingWallets, setLoadingWallets] = useState(false);
  const [wallets, setWallets] = useState<{ name: string; descriptor?: boolean }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const canUseElectronAPI = typeof window !== "undefined" && !!window.electronAPI?.rpc;

  const buildConfig = (): RPCConfig => ({
    host,
    port: parseInt(port),
    username,
    password,
    wallet: wallet || undefined,
  });

  const handleLoadWallets = async () => {
    if (!canUseElectronAPI) {
      setError("Electron API not available. Run the desktop app.");
      return;
    }
    if (!username || !password) {
      setError("Enter RPC username and password first.");
      return;
    }
    setError(null);
    setLoadingWallets(true);
    const config = buildConfig();
    try {
      // Attempt to load wallet if user typed one
      if (wallet) {
        try {
          const res = await window.electronAPI!.rpc.loadWallet(wallet, config);
          if (res.warning) setError(res.warning);
        } catch (e: any) {
          setError(e?.message || "Load wallet failed");
        }
      }
      // Prefer listwalletdir; fallback listwallets
      try {
        const dir = await window.electronAPI!.rpc.listWalletDir(config);
        setWallets(dir.wallets || []);
      } catch (e) {
        const names = await window.electronAPI!.rpc.listWallets(config);
        setWallets(names.map((name) => ({ name })));
      }
    } catch (err: any) {
      setError(err.message || "Failed to load wallets");
    } finally {
      setLoadingWallets(false);
    }
  };

  const handleCreateWallet = async () => {
    if (!canUseElectronAPI) {
      setError("Electron API not available. Run the desktop app.");
      return;
    }
    if (!username || !password) {
      setError("Enter RPC username and password first.");
      return;
    }
    if (!wallet) {
      setError("Enter a wallet name to create.");
      return;
    }
    setError(null);
    setLoadingWallets(true);
    const config = buildConfig();
    try {
      const res = await window.electronAPI!.rpc.createWallet(wallet, config);
      if (res.warning) setError(res.warning);
      // refresh list
      await handleLoadWallets();
    } catch (err: any) {
      setError(err.message || "Failed to create wallet");
    } finally {
      setLoadingWallets(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setError(null);

    if (!canUseElectronAPI) {
      setError("Electron API not available. Make sure you're running the desktop app.");
      setTesting(false);
      return;
    }

    const config = buildConfig();

    try {
      const result = await onConnect(config);
      if (!result.success) {
        setError(result.error || "Connection failed");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] to-[#0f0f0f] flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Logo size="lg" className="mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-2">Interchained Wallet</h1>
          <p className="text-gray-400 text-sm">Connect to your local node</p>
        </div>

        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#151515] rounded-2xl p-6 border border-gray-800/50 shadow-2xl space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Host</label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="w-full px-4 py-3 bg-[#0f0f0f] border-2 border-gray-700/50 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-all shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Port</label>
              <input
                type="text"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="w-full px-4 py-3 bg-[#0f0f0f] border-2 border-gray-700/50 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-all shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">RPC Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-[#0f0f0f] border-2 border-gray-700/50 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-all shadow-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">RPC Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#0f0f0f] border-2 border-gray-700/50 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-all shadow-sm"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="block text-sm font-medium text-gray-300">Wallet (optional)</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleLoadWallets}
                  disabled={loadingWallets || !canUseElectronAPI}
                  className="px-3 py-1.5 text-xs bg-gray-800/80 hover:bg-gray-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg border border-gray-700/50 transition-all shadow-sm font-medium"
                >
                  {loadingWallets ? "Loading..." : "Load"}
                </button>
                <button
                  type="button"
                  onClick={handleCreateWallet}
                  disabled={loadingWallets || !canUseElectronAPI}
                  className="px-3 py-1.5 text-xs bg-gray-800/80 hover:bg-gray-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg border border-gray-700/50 transition-all shadow-sm font-medium"
                >
                  Create
                </button>
              </div>
            </div>
            <input
              type="text"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="default"
              className="w-full px-4 py-3 bg-[#0f0f0f] border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-all shadow-sm"
            />
            {wallets.length > 0 && (
              <div className="border border-gray-800/50 rounded-xl divide-y divide-gray-800/50 bg-[#0f0f0f] overflow-hidden shadow-inner">
                {wallets.map((w) => (
                  <button
                    key={w.name}
                    type="button"
                    onClick={() => setWallet(w.name)}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-800/50 transition-all ${
                      wallet === w.name ? "bg-gradient-to-r from-orange-500/10 to-orange-600/10 text-white" : "text-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{w.name || "(default)"}</span>
                      {w.descriptor !== undefined && (
                        <span className="text-xs text-gray-500 bg-gray-800/50 px-2 py-0.5 rounded">
                          {w.descriptor ? "descriptor" : "legacy"}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-900/30 border border-red-800/50 rounded-xl text-red-400 text-sm shadow-lg">
              {error}
            </div>
          )}

          <button
            onClick={handleTestConnection}
            disabled={testing || !username || !password}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg"
          >
            {testing ? "Connecting..." : "Connect to Node"}
          </button>

          <div className="text-xs text-gray-500 text-center pt-2">
            🔒 Credentials are stored securely in your system keychain
          </div>
        </div>
      </div>
    </div>
  );
}
