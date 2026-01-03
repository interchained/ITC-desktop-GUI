import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Overview } from "./overview";
import { Send } from "./send";
import { Receive } from "./receive";
import { Activity } from "./activity";
import { Settings } from "./settings";
import { About } from "./about";
import { Logo } from "../components/logo";
import type { RPCConfig } from "@interchained/rpc";


type View = "overview" | "send" | "receive" | "activity" | "settings" | "about";

export function Wallet() {
  const [currentView, setCurrentView] = useState<View>("overview");
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  // Check if electronAPI is available
  const hasElectronAPI = typeof window !== "undefined" && !!window.electronAPI?.rpc;

  const handleConnect = async (config: RPCConfig) => {
    if (!hasElectronAPI) {
      return { success: false, error: "Electron API not available" };
    }
    
    const result = await window.electronAPI!.rpc.testConnection(config);
    if (result.success) {
      await window.electronAPI!.rpc.saveCredentials(config);
      setIsConnected(true);
      queryClient.invalidateQueries();
    }
    return result;
  };

  if (!isConnected) {
    return <Settings onConnect={handleConnect} />;
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#0a0a0a] to-[#0f0f0f] text-gray-100">
      <aside className="w-72 bg-[#0f0f0f]/80 backdrop-blur-xl border-r border-gray-800/50 flex flex-col shadow-2xl">
        <div className="p-6 border-b border-gray-800/50">
          <div className="flex items-center gap-3 mb-1">
            <Logo size="sm" />
            <div>
              <h1 className="text-lg font-bold text-white">Interchained</h1>
              <p className="text-xs text-gray-400">Wallet</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4">
          <button
            onClick={() => setCurrentView("overview")}
            className={`w-full text-left px-4 py-3 rounded-xl mb-2 transition-all font-medium ${
              currentView === "overview"
                ? "bg-gradient-to-r from-orange-500/20 to-orange-600/20 text-white border-l-4 border-orange-500 shadow-lg"
                : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">📊</span>
              <span>Overview</span>
            </div>
          </button>
          <button
            onClick={() => setCurrentView("send")}
            className={`w-full text-left px-4 py-3 rounded-xl mb-2 transition-all font-medium ${
              currentView === "send"
                ? "bg-gradient-to-r from-orange-500/20 to-orange-600/20 text-white border-l-4 border-orange-500 shadow-lg"
                : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">↗️</span>
              <span>Send</span>
            </div>
          </button>
          <button
            onClick={() => setCurrentView("receive")}
            className={`w-full text-left px-4 py-3 rounded-xl mb-2 transition-all font-medium ${
              currentView === "receive"
                ? "bg-gradient-to-r from-orange-500/20 to-orange-600/20 text-white border-l-4 border-orange-500 shadow-lg"
                : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">↙️</span>
              <span>Receive</span>
            </div>
          </button>
          <button
            onClick={() => setCurrentView("activity")}
            className={`w-full text-left px-4 py-3 rounded-xl mb-2 transition-all font-medium ${
              currentView === "activity"
                ? "bg-gradient-to-r from-orange-500/20 to-orange-600/20 text-white border-l-4 border-orange-500 shadow-lg"
                : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">📜</span>
              <span>Activity</span>
            </div>
          </button>
          <button
            onClick={() => setCurrentView("settings")}
            className={`w-full text-left px-4 py-3 rounded-xl mb-2 transition-all font-medium ${
              currentView === "settings"
                ? "bg-gradient-to-r from-orange-500/20 to-orange-600/20 text-white border-l-4 border-orange-500 shadow-lg"
                : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">⚙️</span>
              <span>Settings</span>
            </div>
          </button>
          <button
            onClick={() => setCurrentView("about")}
            className={`w-full text-left px-4 py-3 rounded-xl mb-2 transition-all font-medium ${
              currentView === "about"
                ? "bg-gradient-to-r from-orange-500/20 to-orange-600/20 text-white border-l-4 border-orange-500 shadow-lg"
                : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">ℹ️</span>
              <span>About</span>
            </div>
          </button>
        </nav>

        <div className="p-4 border-t border-gray-800/50 space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ boxShadow: '0 0 6px rgba(34, 197, 94, 0.6)' }}></div>
            <span className="text-green-400 font-medium">Wallet Synchronized</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ boxShadow: '0 0 6px rgba(34, 197, 94, 0.6)' }}></div>
            <span className="text-gray-400">Daemon Synchronized</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {currentView === "overview" && <Overview />}
        {currentView === "send" && <Send />}
        {currentView === "receive" && <Receive />}
        {currentView === "activity" && <Activity />}
        {currentView === "settings" && <Settings onConnect={handleConnect} />}
        {currentView === "about" && <About />}
      </main>
    </div>
  );
}
