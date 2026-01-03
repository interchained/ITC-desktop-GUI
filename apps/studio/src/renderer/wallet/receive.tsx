import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";

export function Receive() {
  const [currentAddress, setCurrentAddress] = useState<string>("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: groupings } = useQuery({
    queryKey: ["addresses", "groupings"],
    queryFn: () => window.electronAPI!.rpc.listAddressGroupings(),
    refetchInterval: 15000,
  });

  const { data: unspent } = useQuery({
    queryKey: ["addresses", "unspent"],
    queryFn: () => window.electronAPI!.rpc.listUnspent(),
    refetchInterval: 15000,
  });

  const addressList = useMemo(() => {
    const seen = new Set<string>();
    const balanceMap = new Map<string, number>();
    const confirmationMap = new Map<string, number>();

    // Build balance map from unspent outputs
    for (const utxo of unspent || []) {
      const current = balanceMap.get(utxo.address) || 0;
      balanceMap.set(utxo.address, current + utxo.amount);
      
      // Track minimum confirmations for each address
      const currentConf = confirmationMap.get(utxo.address) ?? utxo.confirmations;
      confirmationMap.set(utxo.address, Math.min(currentConf, utxo.confirmations));
    }

    const list: { address: string; amount: number; label?: string; confirmations?: number }[] = [];

    for (const entry of groupings || []) {
      if (!seen.has(entry.address)) {
        seen.add(entry.address);
        list.push({
          address: entry.address,
          amount: balanceMap.get(entry.address) || 0,
          label: entry.label,
          confirmations: confirmationMap.get(entry.address),
        });
      }
    }

    return list.sort((a, b) => a.address.localeCompare(b.address));
  }, [groupings, unspent]);

  useEffect(() => {
    if (!currentAddress && addressList.length > 0) {
      setCurrentAddress(addressList[0].address);
    }
  }, [addressList, currentAddress]);

  useEffect(() => {
    const gen = async () => {
      if (!currentAddress) {
        setQrDataUrl("");
        return;
      }
      try {
        const url = await QRCode.toDataURL(currentAddress, {
          errorCorrectionLevel: "M",
          margin: 1,
          scale: 6,
        });
        setQrDataUrl(url);
      } catch {
        setQrDataUrl("");
      }
    };
    void gen();
  }, [currentAddress]);

  const generateAddressMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      return await window.electronAPI!.rpc.getNewAddress(label || undefined);
    },
    onSuccess: (address) => {
      setCurrentAddress(address);
      setLabel("");
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
    },
    onError: (err: any) => {
      setError(err?.message || "Failed to generate address");
    },
  });

  const copyToClipboard = async (addr: string) => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopiedAddress(addr);
      setTimeout(() => setCopiedAddress(null), 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="p-8 bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] min-h-screen">
      <h2 className="text-3xl font-bold text-white mb-6">Receive ITC</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-300">Address Label (optional)</label>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ["addresses"] })}
              className="px-4 py-2 text-xs bg-gray-800/80 hover:bg-gray-700 text-white rounded-xl border border-gray-700/50 transition-all shadow-md"
            >
              Refresh
            </button>
          </div>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Name this address"
            className="w-full px-4 py-3 bg-[#1a1a1a] border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-all shadow-sm"
          />

          <button
            onClick={() => generateAddressMutation.mutate()}
            disabled={generateAddressMutation.isPending}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-700 disabled:to-gray-800 text-white font-medium rounded-xl transition-all shadow-lg"
          >
            {generateAddressMutation.isPending ? "Generating..." : "Generate New Address"}
          </button>

          {error && (
            <div className="p-4 bg-red-900/20 border border-red-800/50 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#151515] rounded-2xl p-6 border border-gray-800/50 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Your Addresses</h3>
              <div className="text-xs text-gray-400 bg-gray-800/50 px-3 py-1 rounded-full">{addressList.length} total</div>
            </div>
            <div className="max-h-80 overflow-auto divide-y divide-gray-800/50">
              {addressList.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-sm">No addresses yet</p>
                  <p className="text-gray-600 text-xs mt-1">Generate one to get started</p>
                </div>
              ) : (
                addressList.map((entry) => (
                  <div
                    key={entry.address}
                    className={`flex items-center justify-between gap-3 py-3 px-3 rounded-lg transition-all ${
                      currentAddress === entry.address ? "bg-gradient-to-r from-orange-500/10 to-orange-600/10" : "hover:bg-gray-900/30"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-200 truncate font-mono">{entry.address}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        <span className="font-medium">{entry.label || "(no label)"}</span>
                        <span className="mx-2">•</span>
                        <span className="font-semibold text-gray-400">{entry.amount.toFixed(8)} ITC</span>
                        {entry.confirmations !== undefined && (
                          <>
                            <span className="mx-2">•</span>
                            <span>{entry.confirmations} conf</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentAddress(entry.address)}
                        className="px-3 py-1.5 text-xs bg-gray-800/80 hover:bg-gray-700 text-white rounded-lg border border-gray-700/50 transition-all shadow-sm"
                      >
                        Show QR
                      </button>
                      <button
                        onClick={() => copyToClipboard(entry.address)}
                        className={`px-3 py-1.5 text-xs bg-gray-800/80 hover:bg-gray-700 text-white rounded-lg border border-gray-700/50 transition-all shadow-sm ${
                          copiedAddress === entry.address
                            ? "!bg-green-700 !border-green-600"
                            : ""
                        }`}
                      >
                        {copiedAddress === entry.address ? "✓" : "Copy"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#151515] rounded-2xl p-6 border border-gray-800/50 shadow-2xl">
          <h3 className="text-lg font-semibold text-white mb-4">Selected Address</h3>
          {currentAddress ? (
            <>
              <div className="bg-[#0f0f0f] rounded-xl p-4 break-all font-mono text-sm text-gray-300 border border-gray-800/50 mb-6 shadow-inner">
                {currentAddress}
              </div>
              <div className="flex flex-col items-center gap-4">
                {qrDataUrl ? (
                  <div className="p-4 bg-white rounded-2xl shadow-2xl">
                    <img src={qrDataUrl} alt="QR" className="w-56 h-56" />
                  </div>
                ) : (
                  <div className="w-64 h-64 bg-gray-800 text-gray-500 flex items-center justify-center rounded-2xl">
                    Generating QR...
                  </div>
                )}
                <button
                  onClick={() => copyToClipboard(currentAddress)}
                  className={`px-6 py-3 bg-gray-800/80 hover:bg-gray-700 text-white text-sm rounded-xl transition-all shadow-md font-medium ${
                    copiedAddress === currentAddress
                      ? "!bg-green-700 !border-green-600"
                      : ""
                  }`}
                >
                  {copiedAddress === currentAddress ? "✓ Copied to Clipboard" : "Copy Address"}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📱</div>
              <p className="text-sm text-gray-500">Select or generate an address to view QR code</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
