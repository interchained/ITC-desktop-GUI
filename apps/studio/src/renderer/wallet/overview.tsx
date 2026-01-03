import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts";
import { useMemo } from "react";
import { Logo } from "../components/logo";

interface MarketData {
  [key: string]: {
    exchange: string;
    pair: string;
    last_price: number;
    vwap: number;
    volume_24h: number;
    best_bid: number;
    best_ask: number;
    spread_pct: number;
  };
}

interface VWAPHistoryData {
  symbol: string;
  timespan: string;
  data: Array<{
    time: number;
    value: number;
  }>;
}

export function Overview() {
  const { data: balances, isLoading: balancesLoading } = useQuery({
    queryKey: ["balances"],
    queryFn: () => window.electronAPI!.rpc.getBalances(),
    refetchInterval: 10000,
  });

  const { data: walletInfo, isLoading: walletLoading } = useQuery({
    queryKey: ["walletInfo"],
    queryFn: () => window.electronAPI!.rpc.getWalletInfo(),
    refetchInterval: 30000,
  });

  const { data: blockchainInfo } = useQuery({
    queryKey: ["blockchainInfo"],
    queryFn: () => window.electronAPI!.rpc.getBlockchainInfo(),
    refetchInterval: 30000,
  });

  const { data: marketData } = useQuery<MarketData>({
    queryKey: ["marketData"],
    queryFn: async () => {
      const response = await fetch("https://ix-api.interchained.org/api/market/vwap");
      return response.json();
    },
    refetchInterval: 60000,
  });

  const { data: vwapHistory } = useQuery<VWAPHistoryData>({
    queryKey: ["vwapHistory"],
    queryFn: async () => {
      const response = await fetch("https://ix-api.interchained.org/api/inews/aggregator/vwap/history/ITC?timespan=24H");
      return response.json();
    },
    refetchInterval: 60000,
  });

  const totalBalance = balances?.mine?.trusted ?? 0;
  const pendingBalance = balances?.mine?.untrusted_pending ?? 0;
  const immatureBalance = balances?.mine?.immature ?? 0;

  const { currentVWAP, totalVolume24h } = useMemo(() => {
    let vwap = 0;
    let volume = 0;
    
    if (vwapHistory && vwapHistory.data && vwapHistory.data.length > 0) {
      // Use the most recent VWAP value as current price
      vwap = vwapHistory.data[vwapHistory.data.length - 1]?.value || 0;
    }
    
    if (marketData) {
      // Sum volume across all exchanges
      volume = Object.entries(marketData)
        .filter(([_, m]) => m.exchange.toLowerCase() !== 'gamexchange')
        .reduce((sum, [_, m]) => sum + m.volume_24h, 0);
    }
    
    return { currentVWAP: vwap, totalVolume24h: volume };
  }, [vwapHistory, marketData]);

  const usdValue = totalBalance * currentVWAP;

  const chartData = useMemo(() => {
    if (!marketData) return [];
    return Object.entries(marketData)
      .filter(([_, m]) => m.last_price > 0 && m.exchange.toLowerCase() !== 'gamexchange')
      .map(([exchange, m]) => ({
        exchange: m.exchange,
        price: m.last_price,
        volume: m.volume_24h,
      }))
      .sort((a, b) => b.volume - a.volume);
  }, [marketData]);

  const vwapChartData = useMemo(() => {
    if (!vwapHistory || !vwapHistory.data || vwapHistory.data.length === 0) return [];
    return vwapHistory.data.map(point => ({
      time: new Date(point.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      vwap: point.value,
      timestamp: point.time,
    })).sort((a, b) => a.timestamp - b.timestamp);
  }, [vwapHistory]);

  const topExchange = chartData.length > 0 ? chartData[0] : null;

  return (
    <div className="p-8 bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="relative bg-gradient-to-br from-[#1f1f1f] via-[#1a1a1a] to-[#151515] rounded-3xl p-8 border border-gray-800/50 shadow-2xl backdrop-blur-sm overflow-hidden" style={{
              background: `
                radial-gradient(
                  circle at 30% 20%,
                  rgba(255,122,0,0.08),
                  transparent 60%
                ),
                linear-gradient(180deg, rgb(31,31,31), rgb(21,21,21))`
            }}>
              <div className="flex items-center gap-4 mb-6">
                <Logo size="md" />
                <div>
                  <div className="text-sm text-gray-400 font-medium">Account #0</div>
                  <div className="text-xl text-white font-semibold">Primary Account</div>
                </div>
              </div>

              <div className="mt-8">
                <div className="text-sm text-gray-400 mb-2 font-medium">Total Balance</div>
                <div className="flex items-baseline gap-4">
                  <div className="text-5xl font-bold text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {balancesLoading ? (
                      <span className="text-3xl text-gray-400">Loading...</span>
                    ) : (
                      <span>
                        {totalBalance.toFixed(8).split('.')[0]}.
                        <span style={{ opacity: 0.7, fontSize: '0.9em' }}>
                          {totalBalance.toFixed(8).split('.')[1]}
                        </span>
                      </span>
                    )}
                  </div>
                  <span className="text-2xl text-orange-500 font-semibold">ITC</span>
                </div>
                {!balancesLoading && currentVWAP > 0 && (
                  <div className="mt-3 text-lg text-gray-400">
                    ≈ ${usdValue.toFixed(2)} USD
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#1f1f1f] via-[#1a1a1a] to-[#151515] rounded-3xl p-6 border border-gray-800/50 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">Market Price</h3>
            {currentVWAP > 0 ? (
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-400 mb-1">24h VWAP</div>
                  <div className="text-3xl font-bold text-orange-500">
                    ${currentVWAP.toFixed(6)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Volume Weighted Average Price</div>
                </div>
                <div className="pt-4 border-t border-gray-800">
                  <div className="text-sm text-gray-400 mb-1">24h Volume (All Exchanges)</div>
                  <div className="text-lg font-semibold text-white">
                    {totalVolume24h.toLocaleString()} ITC
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-sm">Loading market data...</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#151515] rounded-2xl p-5 border border-gray-800/50 shadow-xl">
            <div className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider" style={{ opacity: 0.6 }}>Available</div>
            <div className="text-2xl font-bold text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {totalBalance.toFixed(8)}
            </div>
            <div className="text-xs text-gray-500 mt-1">ITC</div>
          </div>
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#151515] rounded-2xl p-5 border border-gray-800/50 shadow-xl">
            <div className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider" style={{ opacity: 0.6 }}>Pending</div>
            <div className="text-2xl font-bold text-yellow-500" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {pendingBalance.toFixed(8)}
            </div>
            <div className="text-xs text-gray-500 mt-1">ITC</div>
          </div>
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#151515] rounded-2xl p-5 border border-gray-800/50 shadow-xl">
            <div className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider" style={{ opacity: 0.6 }}>Immature</div>
            <div className="text-2xl font-bold text-gray-500" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {immatureBalance.toFixed(8)}
            </div>
            <div className="text-xs text-gray-500 mt-1">ITC</div>
          </div>
        </div>

        {chartData.length > 0 && (
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#151515] rounded-3xl p-6 border border-gray-800/50 shadow-2xl">
            <div className="flex items-baseline justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Exchange Prices</h3>
              <div className="text-xs text-gray-500">
                {topExchange && (
                  <>
                    <span>{topExchange.exchange}</span>
                    <span className="text-gray-600 mx-2">•</span>
                    <span>Live rates</span>
                  </>
                )}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis 
                  dataKey="exchange" 
                  stroke="#666"
                  tick={{ fill: '#888', fontSize: 11 }}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  stroke="#666"
                  tick={{ fill: '#888', fontSize: 11 }}
                  tickFormatter={(value) => `$${value.toFixed(4)}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a1a', 
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: any) => [`$${value.toFixed(6)}`, 'Price']}
                />
                <Area 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#f97316" 
                  strokeWidth={2}
                  fill="url(#colorPrice)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {vwapChartData.length > 0 && (
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#151515] rounded-3xl p-6 border border-gray-800/50 shadow-2xl">
            <div className="flex items-baseline justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">24h VWAP History</h3>
              <div className="text-xs text-gray-500">Volume Weighted Average Price</div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={vwapChartData}>
                <defs>
                  <linearGradient id="colorVWAP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis 
                  dataKey="time" 
                  stroke="#666"
                  tick={{ fill: '#888', fontSize: 11 }}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  stroke="#666"
                  tick={{ fill: '#888', fontSize: 11 }}
                  tickFormatter={(value) => `$${value.toFixed(4)}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a1a', 
                    border: '1px solid #333',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: any) => [`$${value.toFixed(8)}`, 'VWAP']}
                />
                <Line 
                  type="monotone" 
                  dataKey="vwap" 
                  stroke="#06b6d4" 
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#151515] rounded-3xl p-6 border border-gray-800/50 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">Wallet Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-gray-800/50">
                <span className="text-gray-400 font-medium">Wallet Name</span>
                <span className="text-white font-mono">{walletInfo?.walletname || "default"}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-800/50">
                <span className="text-gray-400 font-medium">Transactions</span>
                <span className="text-white font-semibold">{walletInfo?.txcount || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-800/50">
                <span className="text-gray-400 font-medium">Keypool Size</span>
                <span className="text-white font-semibold">{walletInfo?.keypoolsize || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-400 font-medium">Private Keys</span>
                <span className={`font-semibold ${walletInfo?.private_keys_enabled ? "text-green-400" : "text-red-400"}`}>
                  {walletInfo?.private_keys_enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#151515] rounded-3xl p-6 border border-gray-800/50 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">Network Status</h3>
            {blockchainInfo && (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-gray-800/50">
                  <span className="text-gray-400 font-medium">Block Height</span>
                  <span className="text-white font-mono">{blockchainInfo.blocks.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-400 font-medium">Sync Progress</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all"
                        style={{ width: `${blockchainInfo.verificationprogress * 100}%` }}
                      />
                    </div>
                    <span className="text-white font-semibold min-w-[50px]">
                      {(blockchainInfo.verificationprogress * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
