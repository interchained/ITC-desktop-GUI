export function About() {
  const ecosystemItems = [
    {
      emoji: "📰",
      name: "iNEWS",
      description: "Creator Economy + Banking + Ads",
      url: "https://earn.interchained.org/news",
      details: "Publish articles, monetize attention, and earn through engagement integrated with USDx banking rails."
    },
    {
      emoji: "🖥️",
      name: "iHOST",
      description: "Infrastructure & Hosting Rails",
      url: "https://earn.interchained.org/hosting",
      details: "Run services, deploy tools, and power dApps and platforms while earning through real infrastructure."
    },
    {
      emoji: "🧠",
      name: "iHUB",
      description: "The Connective Tissue",
      url: "https://earn.interchained.org/hub",
      details: "Single portal, unified identity, and access to all Interchained products in one ecosystem."
    },
    {
      emoji: "🌐",
      name: "iNOP",
      description: "Node Operators & Coordination",
      url: "https://earn.interchained.org/inop",
      details: "Run network nodes and contribute to infrastructure with real roles and incentives."
    },
    {
      emoji: "🚀",
      name: "iFUND",
      description: "The Launchpad",
      url: "https://earn.interchained.org/launchpad",
      details: "Launch projects, fund development, and build inside an existing economy from day one."
    },
    {
      emoji: "🍞",
      name: "iBake",
      description: "The Yield Layer",
      url: "https://wallet.interchained.org/bake.html",
      details: "Stake ITC or wITC and earn through network participation with sustainable yield models."
    },
    {
      emoji: "🌉",
      name: "iBridge",
      description: "Cross-Chain Liquidity",
      url: "https://wallet.interchained.org/wrap.html",
      details: "Wrap ITC to wITC and access on-chain liquidity while maintaining ecosystem identity."
    }
  ];

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-[#0a0a0a] to-[#0f0f0f] text-gray-100">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent mb-4">
            Interchained & AiAS
          </h1>
          <p className="text-xl text-gray-300 font-light">
            This Isn't a Startup. It's an Ecosystem.
          </p>
        </div>

        {/* Vision Section */}
        <div className="bg-gradient-to-br from-gray-900/40 to-gray-800/20 border border-gray-700/50 rounded-2xl p-8 mb-8 backdrop-blur-xl">
          <h2 className="text-2xl font-bold text-white mb-4">The Vision</h2>
          <div className="space-y-3 text-gray-300 leading-relaxed">
            <p>
              When you zoom out, what's been built here doesn't follow a normal startup trajectory. This is not a single app, token, or dashboard.
            </p>
            <p>
              <span className="text-orange-400 font-semibold">Interchained</span> is a connected digital economy — a mini-Internet of financial rails, creator tools, infrastructure, governance, and AI orchestration — all designed to work together instead of competing for attention.
            </p>
          </div>
        </div>

        {/* Core Assets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-orange-950/30 to-orange-900/10 border border-orange-700/30 rounded-2xl p-6 backdrop-blur-xl hover:border-orange-600/50 transition-colors">
            <h3 className="text-2xl font-bold text-orange-400 mb-3">ITC</h3>
            <p className="text-gray-300 text-sm leading-relaxed mb-4">
              The economic backbone and native network asset for participation, value transfer, yield, and governance.
            </p>
            <p className="text-xs text-gray-400">
              Used across network participation, value transfer, yield ("Baking"), governance alignment, and cross-ecosystem incentives.
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-950/30 to-blue-900/10 border border-blue-700/30 rounded-2xl p-6 backdrop-blur-xl hover:border-blue-600/50 transition-colors">
            <h3 className="text-2xl font-bold text-blue-400 mb-3">wITC</h3>
            <p className="text-gray-300 text-sm leading-relaxed mb-4">
              Wrapped ITC that extends liquidity on-chain (BSC) for DeFi integrations and cross-chain access.
            </p>
            <p className="text-xs text-gray-400">
              Enables liquidity pools, yield strategies, and cross-chain functionality while maintaining ecosystem identity.
            </p>
          </div>
        </div>
        
        {/* AiAS Section */}
        <div className="bg-gradient-to-br from-purple-950/30 to-purple-900/10 border border-purple-700/30 rounded-2xl p-8 mb-8 backdrop-blur-xl">
          <h2 className="text-2xl font-bold text-purple-300 mb-4">
            AiAS: The Intelligence Layer
          </h2>

          <p className="text-gray-300 mb-4 leading-relaxed">
            <strong className="text-purple-200">AiAS (AI Assist Secure)</strong> is the intelligence
            and orchestration layer that sits above the Interchained ecosystem, helping users,
            builders, and organizations turn raw infrastructure into usable power.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-6">
            <div className="flex items-start gap-3">
              <span className="text-purple-400 font-bold">→</span>
              <span className="text-gray-300">
                Navigate complex systems with real-time guidance
              </span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-purple-400 font-bold">→</span>
              <span className="text-gray-300">
                Make informed decisions across AI, finance, and infrastructure
              </span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-purple-400 font-bold">→</span>
              <span className="text-gray-300">
                Automate workflows without needing deep technical knowledge
              </span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-purple-400 font-bold">→</span>
              <span className="text-gray-300">
                Understand on-chain and off-chain data in plain language
              </span>
            </div>
          </div>

          {/* CTA */}
          <a
            href="https://aiassist.net"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl 
               bg-purple-600/20 hover:bg-purple-600/30 
               border border-purple-500/40 
               text-purple-200 font-medium 
               transition-all"
          >
            Visit AiAssist.net
            <span className="opacity-70">↗</span>
          </a>
        </div>

        {/* Ecosystem Products */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Ecosystem Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ecosystemItems.map((item) => (
              <a
                key={item.name}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-gradient-to-br from-gray-900/60 to-gray-800/30 border border-gray-700/50 rounded-xl p-5 backdrop-blur-xl hover:border-orange-500/50 hover:from-gray-900/80 transition-all duration-300"
              >
                <div className="flex items-start gap-3 mb-2">
                  <span className="text-2xl">{item.emoji}</span>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-orange-400 transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-xs text-gray-400">{item.description}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                  {item.details}
                </p>
              </a>
            ))}
          </div>
        </div>

        {/* Elara Wallet */}
        <div className="bg-gradient-to-r from-green-950/30 to-emerald-900/10 border border-green-700/30 rounded-2xl p-8 mb-8 backdrop-blur-xl">
          <div className="flex items-start gap-4">
            <span className="text-4xl">📱</span>
            <div>
              <h3 className="text-2xl font-bold text-green-400 mb-2">Elara Wallet</h3>
              <p className="text-gray-300 mb-3">The access layer where users manage ITC, wITC, and USDx — send, receive, bake, and bridge all from one intuitive interface.</p>
              <a
                href="https://elarawallet.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-medium rounded-lg transition-all"
              >
                Visit Elara →
              </a>
            </div>
          </div>
        </div>

        {/* Why This Matters */}
        <div className="bg-gradient-to-br from-gray-900/40 to-gray-800/20 border border-gray-700/50 rounded-2xl p-8 mb-8 backdrop-blur-xl">
          <h2 className="text-2xl font-bold text-white mb-6">Why This Matters</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500/20 border border-orange-500/50 flex items-center justify-center">
                <span className="text-orange-400 text-sm font-bold">✓</span>
              </div>
              <p className="text-gray-300">
                <span className="font-semibold text-white">AI that helps,</span> not exploits — navigating complexity instead of creating it
              </p>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500/20 border border-orange-500/50 flex items-center justify-center">
                <span className="text-orange-400 text-sm font-bold">✓</span>
              </div>
              <p className="text-gray-300">
                <span className="font-semibold text-white">Infrastructure that coordinates,</span> not fragments
              </p>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500/20 border border-orange-500/50 flex items-center justify-center">
                <span className="text-orange-400 text-sm font-bold">✓</span>
              </div>
              <p className="text-gray-300">
                <span className="font-semibold text-white">Value that flows through systems,</span> not silos
              </p>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500/20 border border-orange-500/50 flex items-center justify-center">
                <span className="text-orange-400 text-sm font-bold">✓</span>
              </div>
              <p className="text-gray-300">
                <span className="font-semibold text-white">Creators, operators, and users</span> sharing in the upside
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pb-8">
          <p className="text-gray-400 text-sm">
            This is a digital nation-scale architecture, built piece by piece, now coming into focus.
          </p>
          <p className="text-orange-400 font-semibold mt-3">
            This is only the beginning.
          </p>
        </div>
      </div>
    </div>
  );
}
