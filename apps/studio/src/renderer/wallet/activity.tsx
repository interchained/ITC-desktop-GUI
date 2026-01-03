import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Transaction } from "@interchained/rpc";

type SortField = "date" | "amount" | "confirmations";
type SortOrder = "asc" | "desc";
type FilterType = "all" | "send" | "receive" | "generate" | "immature";

export function Activity() {
  const [txCount, setTxCount] = useState(250);
  
  const { data: transactions, isLoading, error, refetch } = useQuery({
    queryKey: ["transactions", txCount],
    queryFn: async () => {
      try {
        console.log(`Fetching ${txCount} transactions...`);
        const result = await window.electronAPI!.rpc.listTransactions(undefined, txCount);
        console.log(`Successfully loaded ${result?.length || 0} transactions`, result);
        if (!result || result.length === 0) {
          console.warn("No transactions returned from RPC");
        }
        return result || [];
      } catch (err) {
        console.error("Failed to load transactions:", err);
        throw err;
      }
    },
    refetchInterval: 15000,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getDirectionIcon = (category: string) => {
    switch (category) {
      case "receive":
        return "↓";
      case "send":
        return "↑";
      case "generate":
      case "immature":
        return "⛏";
      default:
        return "•";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "receive":
        return "text-green-500";
      case "send":
        return "text-red-500";
      case "generate":
      case "immature":
        return "text-blue-500";
      default:
        return "text-gray-500";
    }
  };

  const filteredAndSortedTransactions = useMemo(() => {
    if (!transactions) return [];

    let filtered = transactions.filter((tx) => {
      if (filterType !== "all" && tx.category !== filterType) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const txidMatch = tx.txid.toLowerCase().includes(query);
        const addressMatch = tx.address?.toLowerCase().includes(query);
        return txidMatch || addressMatch;
      }

      return true;
    });

    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (sortField) {
        case "date":
          compareValue = a.time - b.time;
          break;
        case "amount":
          compareValue = Math.abs(a.amount) - Math.abs(b.amount);
          break;
        case "confirmations":
          compareValue = a.confirmations - b.confirmations;
          break;
      }

      return sortOrder === "asc" ? compareValue : -compareValue;
    });

    return filtered;
  }, [transactions, searchQuery, filterType, sortField, sortOrder]);

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return "";
    return sortOrder === "asc" ? " ↑" : " ↓";
  };

  const stats = useMemo(() => {
    if (!filteredAndSortedTransactions) return { sent: 0, received: 0, net: 0 };
    return {
      sent: filteredAndSortedTransactions
        .filter((tx) => tx.amount < 0)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
      received: filteredAndSortedTransactions
        .filter((tx) => tx.amount > 0)
        .reduce((sum, tx) => sum + tx.amount, 0),
      net: filteredAndSortedTransactions.reduce((sum, tx) => sum + tx.amount, 0),
    };
  }, [filteredAndSortedTransactions]);

  return (
    <div className="p-8 bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] min-h-screen">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-6">Transaction History</h2>

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700/50 rounded-xl text-red-200 text-sm shadow-lg">
            <div className="font-semibold mb-1">Error loading transactions:</div>
            <div className="font-mono text-xs">{String(error)}</div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#151515] border border-gray-800/50 rounded-2xl p-5 shadow-xl">
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-2 font-medium">
              Total Sent
            </div>
            <div className="text-red-400 text-2xl font-bold">
              {stats.sent.toFixed(8)} ITC
            </div>
          </div>
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#151515] border border-gray-800/50 rounded-2xl p-5 shadow-xl">
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-2 font-medium">
              Total Received
            </div>
            <div className="text-green-400 text-2xl font-bold">
              {stats.received.toFixed(8)} ITC
            </div>
          </div>
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#151515] border border-gray-800/50 rounded-2xl p-5 shadow-xl">
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-2 font-medium">
              Net Balance
            </div>
            <div
              className={`text-2xl font-bold ${
                stats.net >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {stats.net >= 0 ? "+" : ""}
              {stats.net.toFixed(8)} ITC
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 mb-6">
          <input
            type="text"
            placeholder="Search by TXID or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-3 bg-[#1a1a1a] border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-all shadow-sm"
          />

          <div className="flex gap-2 flex-wrap">
            {(["all", "send", "receive", "generate", "immature"] as FilterType[]).map(
              (type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-md ${
                    filterType === type
                      ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white"
                      : "bg-gray-800/80 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg">Loading transactions...</div>
        </div>
      ) : !filteredAndSortedTransactions || filteredAndSortedTransactions.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📜</div>
          <div className="text-gray-400">
            {transactions && transactions.length === 0
              ? "No transactions yet"
              : "No transactions match your filters"}
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#151515] rounded-2xl border border-gray-800/50 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0f0f0f] border-b border-gray-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-orange-400 transition-colors"
                    onClick={() => handleSortChange("amount")}
                  >
                    Amount{getSortIndicator("amount")}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Address
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-orange-400 transition-colors"
                    onClick={() => handleSortChange("confirmations")}
                  >
                    Confirmations{getSortIndicator("confirmations")}
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-orange-400 transition-colors"
                    onClick={() => handleSortChange("date")}
                  >
                    Date{getSortIndicator("date")}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    TXID
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {filteredAndSortedTransactions.map((tx, index) => (
                  <tr key={`${tx.txid}-${index}`} className="hover:bg-gray-900/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${
                          tx.category === 'receive' ? 'bg-green-900/30 text-green-400' :
                          tx.category === 'send' ? 'bg-red-900/30 text-red-400' :
                          'bg-blue-900/30 text-blue-400'
                        }`}>
                          {getDirectionIcon(tx.category)}
                        </div>
                        <span className="text-sm text-gray-300 capitalize font-medium">
                          {tx.category}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`text-sm font-semibold ${
                          tx.amount > 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {tx.amount > 0 ? "+" : ""}
                        {tx.amount.toFixed(8)} ITC
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-400 font-mono bg-gray-900/50 px-2 py-1 rounded" title={tx.address || ""}>
                        {tx.address
                          ? `${tx.address.slice(0, 12)}...${tx.address.slice(-8)}`
                          : "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`text-sm font-medium px-3 py-1 rounded-full ${
                          tx.confirmations >= 6
                            ? "bg-green-900/30 text-green-400"
                            : tx.confirmations > 0
                            ? "bg-yellow-900/30 text-yellow-400"
                            : "bg-gray-800/50 text-gray-400"
                        }`}
                      >
                        {tx.confirmations}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {formatDate(tx.time)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500 font-mono bg-gray-900/50 px-2 py-1 rounded" title={tx.txid}>
                        {tx.txid.slice(0, 12)}...
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 text-sm text-gray-400 flex items-center justify-between">
        <span>Showing {filteredAndSortedTransactions.length} of {transactions?.length || 0} transactions</span>
        {transactions && transactions.length === txCount && (
          <button
            onClick={() => setTxCount(prev => prev + 250)}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl text-sm font-medium transition-all shadow-lg"
          >
            Load More Transactions
          </button>
        )}
      </div>
    </div>
  );
}
