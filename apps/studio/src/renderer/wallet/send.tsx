import { useState } from "react";

interface PSBTTransaction {
  id: string;
  psbt: string;
  description?: string;
  createdAt: number;
  status: "draft" | "signed" | "broadcast";
  recipientAddress: string;
  amount: number;
  fee: number;
  txid?: string;
}

export function Send() {
  const [transactions, setTransactions] = useState<PSBTTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTx, setSelectedTx] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const [formData, setFormData] = useState({
    recipientAddress: "",
    amount: "0.00000000",
    fee: "0",
    description: "",
  });

  const steps = [
    { label: "Recipient Address", field: "recipientAddress", required: true, hint: "Enter a valid Interchained address" },
    { label: "Amount (ITC)", field: "amount", required: true, hint: "Enter the amount to send" },
    { label: "Fee (sat)", field: "fee", required: false, hint: "Transaction fee (optional)" },
    { label: "Description", field: "description", required: false, hint: "Optional description" },
  ];

  const currentStepData = steps[currentStep];

  const handleInputChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleCreatePSBT();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleNext();
    }
  };

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const result = await window.electronAPI?.rpc.listPSBT();
      setTransactions(result || []);
    } catch (error) {
      console.error("Failed to load transactions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePSBT = async () => {
    const amount = parseFloat(formData.amount);
    const fee = parseFloat(formData.fee) || 0;

    if (!formData.recipientAddress || !formData.amount || isNaN(amount) || amount <= 0) {
      alert("Please fill in all required fields with valid numbers");
      return;
    }

    const trimmedAddress = formData.recipientAddress.trim();
    if (trimmedAddress.length === 0) {
      alert("Please enter a recipient address");
      return;
    }

    setIsLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const result = await Promise.race([
        window.electronAPI?.rpc.createPSBT({
          recipientAddress: trimmedAddress,
          amount: amount,
          fee: fee,
          description: formData.description,
        }) || Promise.reject(new Error("RPC API not available")),
        new Promise((_, reject) => 
          controller.signal.addEventListener('abort', () => 
            reject(new Error('Request timeout after 30 seconds'))
          )
        ),
      ]);

      clearTimeout(timeoutId);

      if (result) {
        setFormData({ recipientAddress: "", amount: "0.00000000", fee: "0", description: "" });
        setCurrentStep(0);
        await loadTransactions();
        alert("Transaction created successfully!");
      }
    } catch (error) {
      console.error("Failed to create PSBT:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes("Invalid")) {
        alert(`Invalid address format.\n\nError: ${errorMsg}`);
      } else {
        alert(`Failed to create transaction: ${errorMsg}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignPSBT = async (id: string) => {
    setIsLoading(true);
    try {
      await Promise.race([
        window.electronAPI?.rpc.signPSBT(id) || Promise.reject(new Error("RPC API not available")),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 30000)),
      ]);
      await loadTransactions();
      alert("Transaction signed successfully");
    } catch (error) {
      console.error("Failed to sign PSBT:", error);
      alert("Failed to sign transaction");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBroadcastPSBT = async (id: string) => {
    setIsLoading(true);
    try {
      await Promise.race([
        window.electronAPI?.rpc.broadcastPSBT(id) || Promise.reject(new Error("RPC API not available")),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 60000)),
      ]);
      await loadTransactions();
      alert("Transaction broadcast successfully");
    } catch (error) {
      console.error("Failed to broadcast PSBT:", error);
      alert("Failed to broadcast transaction");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePSBT = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    setIsLoading(true);
    try {
      await Promise.race([
        window.electronAPI?.rpc.removePSBT(id) || Promise.reject(new Error("RPC API not available")),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 30000)),
      ]);
      await loadTransactions();
      setSelectedTx(null);
    } catch (error) {
      console.error("Failed to delete PSBT:", error);
      alert("Failed to delete transaction");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTransaction = transactions.find((tx) => tx.id === selectedTx);
  const inputClass = "w-full px-4 py-3 bg-[#1a1a1a] border-2 border-gray-700/50 rounded-xl text-white focus:border-orange-500 focus:outline-none transition-all shadow-sm";

  return (
    <div className="p-8 bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] min-h-screen">
      <h2 className="text-3xl font-bold text-white mb-6">Send Transaction</h2>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <button
            onClick={loadTransactions}
            disabled={isLoading}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 disabled:from-gray-700 disabled:to-gray-800 font-medium shadow-lg transition-all"
          >
            Refresh Transactions
          </button>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-1">
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#151515] rounded-2xl p-6 border border-gray-800/50 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-white text-lg">Create Transaction</h4>
                <span className="text-xs text-gray-400 bg-gray-800/50 px-3 py-1 rounded-full">Step {currentStep + 1}/{steps.length}</span>
              </div>

              <div className="flex gap-1 mb-6">
                {steps.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 flex-1 rounded-full transition-all ${idx <= currentStep ? "bg-gradient-to-r from-orange-500 to-orange-600" : "bg-gray-800"}`}
                  />
                ))}
              </div>

              <div className="mb-6">
                <label className="block text-sm text-gray-300 mb-3 font-medium">
                  {currentStepData.label}
                  {currentStepData.required && <span className="text-orange-400 ml-1">*</span>}
                </label>
                
                {currentStep === 0 && (
                  <input
                    autoFocus
                    type="text"
                    value={formData.recipientAddress}
                    onChange={handleInputChange("recipientAddress")}
                    onKeyDown={handleKeyPress}
                    disabled={isLoading}
                    placeholder="itcq1..."
                    className={inputClass}
                  />
                )}

                {currentStep === 1 && (
                  <input
                    autoFocus
                    type="text"
                    inputMode="decimal"
                    value={formData.amount}
                    onChange={handleInputChange("amount")}
                    onKeyDown={handleKeyPress}
                    disabled={isLoading}
                    placeholder="0.00000000"
                    className={inputClass}
                  />
                )}

                {currentStep === 2 && (
                  <input
                    autoFocus
                    type="text"
                    inputMode="numeric"
                    value={formData.fee}
                    onChange={handleInputChange("fee")}
                    onKeyDown={handleKeyPress}
                    disabled={isLoading}
                    placeholder="0"
                    className={inputClass}
                  />
                )}

                {currentStep === 3 && (
                  <input
                    autoFocus
                    type="text"
                    value={formData.description}
                    onChange={handleInputChange("description")}
                    onKeyDown={handleKeyPress}
                    disabled={isLoading}
                    placeholder="Optional note"
                    className={inputClass}
                  />
                )}
                
                <p className="text-xs text-gray-500 mt-3">{currentStepData.hint}</p>
              </div>

              <div className="flex gap-3 mb-4">
                {currentStep > 0 && (
                  <button
                    onClick={handleBack}
                    disabled={isLoading}
                    className="flex-1 px-4 py-3 bg-gray-800/80 text-white rounded-xl hover:bg-gray-700 disabled:bg-gray-900 font-medium text-sm transition-all shadow-md"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 disabled:from-gray-700 disabled:to-gray-800 font-medium text-sm transition-all shadow-md"
                >
                  {currentStep === steps.length - 1 ? "Create PSBT" : "Next"}
                </button>
              </div>

              {currentStep > 0 && (
                <div className="pt-4 border-t border-gray-800/50">
                  <p className="text-xs text-gray-400 mb-3 font-medium">Summary:</p>
                  <div className="space-y-2">
                    {steps.slice(0, currentStep).map((step) => {
                      const value = formData[step.field as keyof typeof formData];
                      return value ? (
                        <div key={step.field} className="text-xs text-gray-300 flex justify-between bg-gray-900/50 p-2 rounded-lg">
                          <span className="text-gray-400">{step.label}:</span>
                          <span className="font-mono truncate ml-2 text-white">{value}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="col-span-1">
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#151515] rounded-2xl p-6 border border-gray-800/50 shadow-2xl">
              <h4 className="font-semibold text-white mb-4 text-lg">Draft Transactions</h4>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 text-sm">No transactions yet</p>
                    <p className="text-gray-600 text-xs mt-1">Create one to get started</p>
                  </div>
                ) : (
                  transactions.map((tx) => (
                    <button
                      key={tx.id}
                      onClick={() => setSelectedTx(tx.id)}
                      className={`w-full text-left p-4 rounded-xl border text-sm transition-all ${
                        selectedTx === tx.id 
                          ? "bg-gradient-to-br from-orange-500/20 to-orange-600/20 border-orange-500/50 shadow-lg" 
                          : "border-gray-700/50 hover:border-gray-600 bg-gray-900/30"
                      }`}
                    >
                      <div className="text-gray-300 truncate font-mono text-xs mb-2">{tx.id.slice(0, 16)}...</div>
                      <div className="text-base text-white font-semibold mb-2">{tx.amount} ITC</div>
                      <div className="text-xs">
                        <span className={`inline-block px-3 py-1 rounded-full font-medium ${
                          tx.status === "draft" ? "bg-yellow-900/50 text-yellow-300 border border-yellow-700/50" :
                          tx.status === "signed" ? "bg-blue-900/50 text-blue-300 border border-blue-700/50" : 
                          "bg-green-900/50 text-green-300 border border-green-700/50"
                        }`}>
                          {tx.status}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="col-span-1">
            {selectedTransaction ? (
              <div className="bg-gradient-to-br from-[#1a1a1a] to-[#151515] rounded-2xl p-6 border border-gray-800/50 shadow-2xl">
                <h4 className="font-semibold text-white mb-4 text-lg">Transaction Details</h4>
                <div className="space-y-4 text-sm">
                  <div className="bg-gray-900/50 p-3 rounded-xl">
                    <div className="text-gray-400 text-xs mb-1">Transaction ID</div>
                    <div className="text-gray-300 break-all text-xs font-mono">{selectedTransaction.id}</div>
                  </div>
                  <div className="bg-gray-900/50 p-3 rounded-xl">
                    <div className="text-gray-400 text-xs mb-1">Recipient Address</div>
                    <div className="text-gray-300 break-all text-xs font-mono">{selectedTransaction.recipientAddress}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-900/50 p-3 rounded-xl">
                      <div className="text-gray-400 text-xs mb-1">Amount</div>
                      <div className="text-white font-mono font-semibold">{selectedTransaction.amount} ITC</div>
                    </div>
                    <div className="bg-gray-900/50 p-3 rounded-xl">
                      <div className="text-gray-400 text-xs mb-1">Fee</div>
                      <div className="text-white font-mono font-semibold">{selectedTransaction.fee} sat</div>
                    </div>
                  </div>
                  {selectedTransaction.description && (
                    <div className="bg-gray-900/50 p-3 rounded-xl">
                      <div className="text-gray-400 text-xs mb-1">Description</div>
                      <div className="text-gray-300">{selectedTransaction.description}</div>
                    </div>
                  )}
                  <div className="bg-gray-900/50 p-3 rounded-xl">
                    <div className="text-gray-400 text-xs mb-2">Status</div>
                    <div className={`inline-block px-3 py-1.5 rounded-full text-xs font-medium ${
                      selectedTransaction.status === "draft" ? "bg-yellow-900/50 text-yellow-300 border border-yellow-700/50" :
                      selectedTransaction.status === "signed" ? "bg-blue-900/50 text-blue-300 border border-blue-700/50" : 
                      "bg-green-900/50 text-green-300 border border-green-700/50"
                    }`}>
                      {selectedTransaction.status}
                    </div>
                  </div>
                  {selectedTransaction.txid && (
                    <div className="bg-gray-900/50 p-3 rounded-xl">
                      <div className="text-gray-400 text-xs mb-1">TXID</div>
                      <div className="text-gray-300 break-all text-xs font-mono">{selectedTransaction.txid}</div>
                    </div>
                  )}
                  <div className="bg-gray-900/50 p-3 rounded-xl">
                    <div className="text-gray-400 text-xs mb-1">Created</div>
                    <div className="text-gray-300 text-xs">{new Date(selectedTransaction.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="pt-4 space-y-2 border-t border-gray-800/50">
                    {selectedTransaction.status === "draft" && (
                      <button
                        onClick={() => handleSignPSBT(selectedTransaction.id)}
                        disabled={isLoading}
                        className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 disabled:bg-gray-700 font-medium transition-all shadow-md"
                      >
                        Sign Transaction
                      </button>
                    )}
                    {selectedTransaction.status === "signed" && (
                      <button
                        onClick={() => handleBroadcastPSBT(selectedTransaction.id)}
                        disabled={isLoading}
                        className="w-full px-4 py-3 bg-green-600 text-white rounded-xl text-sm hover:bg-green-700 disabled:bg-gray-700 font-medium transition-all shadow-md"
                      >
                        Broadcast Transaction
                      </button>
                    )}
                    <button
                      onClick={() => handleDeletePSBT(selectedTransaction.id)}
                      disabled={isLoading}
                      className="w-full px-4 py-3 bg-red-600/80 text-white rounded-xl text-sm hover:bg-red-700 disabled:bg-gray-700 font-medium transition-all shadow-md"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-[#1a1a1a] to-[#151515] rounded-2xl p-6 border border-gray-800/50 shadow-2xl text-center">
                <div className="text-gray-500 py-12">
                  <div className="text-4xl mb-4">📋</div>
                  <p className="text-sm">Select a transaction to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
