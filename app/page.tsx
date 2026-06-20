"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useWallet } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"

const allTasks = [
  { icon: "▶", platform: "YouTube", task: "Watch Video", earn: "0.1 SOL", badge: "bg-red-500/15 text-red-400 border-red-500/20" },
  { icon: "📸", platform: "Instagram", task: "Watch Reel", earn: "0.05 SOL", badge: "bg-pink-500/15 text-pink-400 border-pink-500/20" },
  { icon: "👍", platform: "Any Platform", task: "Watch & Like", earn: "0.5 SOL", badge: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  { icon: "🔁", platform: "Twitter / X", task: "Retweet & Follow", earn: "0.08 SOL", badge: "bg-sky-500/15 text-sky-400 border-sky-500/20" },
  { icon: "🎵", platform: "TikTok", task: "Watch Short", earn: "0.03 SOL", badge: "bg-purple-500/15 text-purple-400 border-purple-500/20" },
  { icon: "💬", platform: "Any Platform", task: "Comment & Share", earn: "0.06 SOL", badge: "bg-green-500/15 text-green-400 border-green-500/20" },
]

const navItems = [
  { id: "home",    label: "Home",    icon: "⬡" },
  { id: "tasks",   label: "Tasks",   icon: "✓" },
  { id: "wallet",  label: "Wallet",  icon: "◎" },
  { id: "profile", label: "Profile", icon: "◉" },
]

/* ─────────────────── PAGE SECTIONS ─────────────────── */

function HomeSection({ onStartTask }: { onStartTask: (task: string) => void }) {
  const [completing, setCompleting] = useState<string | null>(null)
  const handleTask = (task: string) => {
    setCompleting(task)
    setTimeout(() => { setCompleting(null); onStartTask(task) }, 1200)
  }

  return (
    <div className="space-y-5">
      {/* SOL Balance Card */}
      <div className="rounded-3xl bg-gradient-to-br from-[#1A3060] via-[#0F2040] to-[#0A1628] border border-white/10 p-5 md:p-7 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-48 h-48 rounded-full bg-blue-500/8 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Total SOL Earned</p>
            <div className="flex items-end gap-2 mb-1">
              <span className="text-4xl md:text-5xl font-black text-white">0.1</span>
              <span className="text-orange-400 font-bold mb-1 text-lg">SOL</span>
            </div>
            <p className="text-white/30 text-xs mb-4">≈ $14.20 USD</p>
            <div className="w-full md:w-64 h-1.5 bg-white/10 rounded-full mb-1.5">
              <div className="h-1.5 bg-gradient-to-r from-orange-500 to-orange-400 rounded-full w-1/3 shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
            </div>
            <div className="flex justify-between w-full md:w-64">
              <p className="text-white/30 text-[10px]">Daily goal: 0.3 SOL</p>
              <p className="text-orange-400 text-[10px] font-bold">33%</p>
            </div>
          </div>
          <button className="w-full md:w-auto bg-orange-500 hover:bg-orange-400 active:scale-95 text-white font-black py-3.5 px-6 rounded-2xl text-sm transition-all shadow-lg shadow-orange-500/30 whitespace-nowrap">
            ◎ Withdraw SOL
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Tasks Done", value: "3", color: "text-green-400" },
          { label: "Day Streak", value: "5 🔥", color: "text-yellow-400" },
          { label: "Rank", value: "#142", color: "text-purple-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl bg-[#0D1B2A] border border-white/5 p-4 text-center">
            <p className={`text-xl md:text-2xl font-black ${color}`}>{value}</p>
            <p className="text-white/30 text-[10px] md:text-xs mt-1 uppercase tracking-widest">{label}</p>
          </div>
        ))}
      </div>

      {/* Tasks preview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-base uppercase tracking-tight">Available <span className="text-orange-500">Tasks</span></h2>
        </div>
        <div className="flex flex-col gap-3">
          {allTasks.slice(0, 4).map(({ icon, platform, task, earn, badge }) => (
            <div key={task} className="flex items-center justify-between rounded-2xl border border-white/5 bg-[#0D1B2A] px-4 py-3.5 hover:border-orange-500/20 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xl w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl shrink-0">{icon}</span>
                <div className="min-w-0">
                  <p className="text-white font-bold text-sm truncate">{task}</p>
                  <p className="text-white/30 text-xs">{platform}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className={`hidden sm:block text-xs font-black px-2.5 py-1 rounded-lg border ${badge}`}>+{earn}</span>
                <button onClick={() => handleTask(task)}
                  className={`text-xs font-black px-4 py-2.5 rounded-xl transition-all active:scale-95 min-w-[60px] ${completing === task ? "bg-green-500 text-white" : "bg-orange-500 hover:bg-orange-400 text-white"}`}>
                  {completing === task ? "✓" : "Start"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TasksSection() {
  const [completing, setCompleting] = useState<string | null>(null)
  const [done, setDone] = useState<string[]>([])

  const handleTask = (task: string) => {
    if (done.includes(task)) return
    setCompleting(task)
    setTimeout(() => { setCompleting(null); setDone(d => [...d, task]) }, 1200)
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-black text-xl uppercase tracking-tight mb-1">All <span className="text-orange-500">Tasks</span></h2>
        <p className="text-white/30 text-sm">{done.length} of {allTasks.length} completed today</p>
      </div>
      <div className="h-2 bg-white/5 rounded-full">
        <div className="h-2 bg-orange-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]"
          style={{ width: `${(done.length / allTasks.length) * 100}%` }} />
      </div>
      <div className="flex flex-col gap-3">
        {allTasks.map(({ icon, platform, task, earn, badge }) => {
          const isDone = done.includes(task)
          return (
            <div key={task} className={`flex items-center justify-between rounded-2xl border px-4 py-4 transition-colors ${isDone ? "border-green-500/20 bg-green-500/5" : "border-white/5 bg-[#0D1B2A] hover:border-orange-500/20"}`}>
              <div className="flex items-center gap-3 min-w-0">
                <span className={`text-xl w-10 h-10 flex items-center justify-center rounded-xl shrink-0 ${isDone ? "bg-green-500/15" : "bg-white/5"}`}>{isDone ? "✓" : icon}</span>
                <div className="min-w-0">
                  <p className={`font-bold text-sm truncate ${isDone ? "text-white/40 line-through" : "text-white"}`}>{task}</p>
                  <p className="text-white/30 text-xs">{platform}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${isDone ? "bg-green-500/15 text-green-400 border-green-500/20" : badge}`}>+{earn}</span>
                <button onClick={() => handleTask(task)} disabled={isDone}
                  className={`text-xs font-black px-4 py-2.5 rounded-xl transition-all active:scale-95 min-w-[64px] ${isDone ? "bg-green-500/20 text-green-400 cursor-default" : completing === task ? "bg-green-500 text-white" : "bg-orange-500 hover:bg-orange-400 text-white"}`}>
                  {isDone ? "Done" : completing === task ? "✓" : "Start"}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WalletSection() {
  const { publicKey, disconnect, connected, connecting, wallet } = useWallet()
  const { setVisible } = useWalletModal()

  const txns = [
    { type: "earn", label: "Watch Video — YouTube", amount: "+0.1 SOL", time: "2 mins ago", color: "text-green-400" },
    { type: "earn", label: "Watch Reel — Instagram", amount: "+0.05 SOL", time: "1 hr ago", color: "text-green-400" },
    { type: "withdraw", label: "Withdraw to Wallet", amount: "-0.5 SOL", time: "Yesterday", color: "text-red-400" },
    { type: "earn", label: "Retweet & Follow — X", amount: "+0.08 SOL", time: "2 days ago", color: "text-green-400" },
    { type: "earn", label: "Watch Short — TikTok", amount: "+0.03 SOL", time: "3 days ago", color: "text-green-400" },
  ]

  const shortAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : null

  return (
    <div className="space-y-5">
      {/* Balance */}
      <div className="rounded-3xl bg-gradient-to-br from-[#1A3060] via-[#0F2040] to-[#0A1628] border border-white/10 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
        <p className="text-white/40 text-xs uppercase tracking-widest mb-1 relative z-10">SOL Balance</p>
        <div className="flex items-end gap-2 mb-1 relative z-10">
          <span className="text-5xl font-black text-white">0.1</span>
          <span className="text-orange-400 font-bold mb-1 text-xl">SOL</span>
        </div>
        <p className="text-white/30 text-sm mb-6 relative z-10">≈ $14.20 USD</p>
        <div className="flex gap-3 relative z-10">
          <button
            disabled={!connected}
            className="flex-1 bg-orange-500 hover:bg-orange-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-3 rounded-2xl text-sm transition-all shadow-lg shadow-orange-500/30">
            ↑ Withdraw
          </button>
          {connected ? (
            <button onClick={disconnect}
              className="flex-1 border border-red-500/20 hover:bg-red-500/10 text-red-400 font-semibold py-3 rounded-2xl text-sm transition-all">
              Disconnect
            </button>
          ) : (
            <button onClick={() => setVisible(true)}
              className="flex-1 border border-orange-500/30 hover:bg-orange-500/10 text-orange-400 hover:text-orange-300 font-semibold py-3 rounded-2xl text-sm transition-all">
              + Connect Wallet
            </button>
          )}
        </div>
      </div>

      {/* Wallet connection status */}
      <div className="rounded-2xl bg-[#0D1B2A] border border-white/5 p-5">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Connected Wallet</p>
        {connected && publicKey ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0">
                {wallet?.adapter.icon && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={wallet.adapter.icon} alt={wallet.adapter.name} className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-bold">{wallet?.adapter.name}</p>
                <code className="text-white/40 text-xs truncate block">{shortAddress}</code>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-xs font-bold">Connected</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl">◎</div>
            <div>
              <p className="text-white font-bold text-sm mb-1">No wallet connected</p>
              <p className="text-white/30 text-xs">Connect Phantom, Solflare, or Torus to withdraw your SOL earnings</p>
            </div>
            <button
              onClick={() => setVisible(true)}
              disabled={connecting}
              className="bg-orange-500 hover:bg-orange-400 active:scale-95 disabled:opacity-60 text-white font-black px-6 py-3 rounded-xl text-sm transition-all shadow-lg shadow-orange-500/30">
              {connecting ? "Connecting..." : "Connect Wallet"}
            </button>
            <div className="flex items-center gap-3 text-white/20 text-xs">
              <span>Supports</span>
              {["Phantom", "Solflare", "Torus"].map(w => (
                <span key={w} className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg">{w}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Transactions */}
      <div>
        <h3 className="font-black text-base uppercase tracking-tight mb-4">Transaction <span className="text-orange-500">History</span></h3>
        <div className="flex flex-col gap-2">
          {txns.map((t, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl bg-[#0D1B2A] border border-white/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${t.type === "earn" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                  {t.type === "earn" ? "↓" : "↑"}
                </div>
                <div>
                  <p className="text-white text-xs font-semibold">{t.label}</p>
                  <p className="text-white/30 text-[10px]">{t.time}</p>
                </div>
              </div>
              <span className={`text-sm font-black ${t.color}`}>{t.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ProfileSection({ onLogout }: { onLogout: () => void }) {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null)
  useEffect(() => {
    const u = localStorage.getItem("cd_user")
    if (u) setUser(JSON.parse(u))
  }, [])

  return (
    <div className="space-y-5">
      {/* Profile card */}
      <div className="rounded-3xl bg-[#0D1B2A] border border-white/10 p-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-black text-2xl shrink-0">
          {user?.name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div>
          <p className="text-white font-black text-lg">{user?.name ?? "Anonymous"}</p>
          <p className="text-white/40 text-sm">{user?.email ?? "No email"}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-xs font-semibold">Active Earner</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Total Earned", value: "0.1 SOL", color: "text-orange-400" },
          { label: "Tasks Done", value: "3", color: "text-green-400" },
          { label: "Current Streak", value: "5 days 🔥", color: "text-yellow-400" },
          { label: "Global Rank", value: "#142", color: "text-purple-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl bg-[#0D1B2A] border border-white/5 p-4">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Settings */}
      <div className="rounded-2xl bg-[#0D1B2A] border border-white/5 overflow-hidden">
        {[
          { label: "Edit Profile", icon: "✎" },
          { label: "Notification Settings", icon: "🔔" },
          { label: "Linked Accounts", icon: "🔗" },
          { label: "Security & Password", icon: "🔒" },
        ].map(({ label, icon }, i, arr) => (
          <div key={label} className={`flex items-center justify-between px-5 py-4 hover:bg-white/5 cursor-pointer transition-colors ${i < arr.length - 1 ? "border-b border-white/5" : ""}`}>
            <div className="flex items-center gap-3">
              <span className="text-sm w-5 text-center">{icon}</span>
              <span className="text-white text-sm font-semibold">{label}</span>
            </div>
            <span className="text-white/20">›</span>
          </div>
        ))}
      </div>

      <button onClick={onLogout}
        className="w-full border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 active:scale-95 text-red-400 font-bold py-4 rounded-2xl text-sm transition-all">
        Sign Out
      </button>
    </div>
  )
}

/* ─────────────────── ROOT ─────────────────── */

export default function Dashboard() {
  const router = useRouter()
  const [activeNav, setActiveNav] = useState("home")

  const handleLogout = () => {
    localStorage.removeItem("cd_auth")
    router.push("/demo")
  }

  const renderSection = () => {
    switch (activeNav) {
      case "home":    return <HomeSection onStartTask={() => {}} />
      case "tasks":   return <TasksSection />
      case "wallet":  return <WalletSection />
      case "profile": return <ProfileSection onLogout={handleLogout} />
      default:        return null
    }
  }

  const pageTitle: Record<string, string> = {
    home: "Dashboard",
    tasks: "My Tasks",
    wallet: "Wallet",
    profile: "Profile",
  }

  return (
    <div className="min-h-screen bg-[#060E1A] text-white flex">

      {/* ── SIDEBAR (desktop) ── */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-white/5 sticky top-0 h-screen bg-[#07111F]">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center font-black text-base shadow-lg shadow-orange-500/30">₿</div>
            <div>
              <p className="font-black text-base leading-none tracking-tight">COIN<span className="text-orange-500">DROP</span></p>
              <p className="text-white/30 text-[10px] tracking-widest uppercase mt-0.5">Watch · Engage · Earn</p>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-1 p-4 flex-1">
          <p className="text-white/20 text-[10px] uppercase tracking-widest px-3 mb-2">Menu</p>
          {navItems.map(({ id, label, icon }) => (
            <button key={id} onClick={() => setActiveNav(id)}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all text-left w-full group ${
                activeNav === id
                  ? "bg-orange-500/15 text-orange-500 border border-orange-500/25 shadow-sm"
                  : "text-white/40 hover:text-white hover:bg-white/5 border border-transparent"
              }`}>
              <span className={`text-base w-5 text-center transition-transform ${activeNav === id ? "" : "group-hover:scale-110"}`}>{icon}</span>
              {label}
              {activeNav === id && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-500" />}
            </button>
          ))}
        </nav>

        {/* User + logout */}
        <div className="p-4 border-t border-white/5 space-y-2">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5 border border-white/5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-black text-xs shrink-0">CD</div>
            <div className="min-w-0">
              <p className="text-white text-xs font-bold truncate">My Account</p>
              <p className="text-white/30 text-[10px] truncate">0.1 SOL balance</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-red-400/70 hover:text-red-400 hover:bg-red-500/10 text-xs font-semibold transition-all border border-transparent hover:border-red-500/15">
            <span>←</span> Sign Out
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-5 py-4 border-b border-white/5 bg-[#060E1A]/90 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center font-black text-xs">₿</div>
            <span className="font-black text-sm tracking-tight">COIN<span className="text-orange-500">DROP</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/30 text-lg cursor-pointer">🔔</span>
            <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-black text-[10px]">CD</div>
          </div>
        </header>

        {/* Desktop page header */}
        <header className="hidden md:flex items-center justify-between px-8 py-5 border-b border-white/5">
          <div>
            <p className="text-white/30 text-xs uppercase tracking-widest">CoinDrop</p>
            <h1 className="text-xl font-black mt-0.5">{pageTitle[activeNav]}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white/30 text-xl cursor-pointer hover:text-white/60 transition">🔔</span>
            <div className="flex items-center gap-2 bg-[#0D1B2A] border border-white/10 rounded-xl px-3 py-2 cursor-pointer hover:border-white/20 transition-colors">
              <div className="w-7 h-7 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-black text-xs">CD</div>
              <span className="text-white text-xs font-semibold">My Account</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-5 md:px-8 py-6 pb-28 md:pb-8 overflow-y-auto max-w-3xl w-full">
          {/* Mobile page title */}
          <div className="md:hidden mb-5">
            <h1 className="text-2xl font-black">{pageTitle[activeNav]}</h1>
          </div>
          {renderSection()}
        </main>
      </div>

      {/* ── BOTTOM NAV (mobile) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden px-4 pb-4">
        <div className="rounded-2xl bg-[#0D1B2A]/95 backdrop-blur-xl border border-white/10 px-2 py-2 flex items-center justify-around shadow-2xl shadow-black/60">
          {navItems.map(({ id, label, icon }) => (
            <button key={id} onClick={() => setActiveNav(id)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all flex-1 ${activeNav === id ? "bg-orange-500/15 text-orange-500" : "text-white/30 hover:text-white/60"}`}>
              <span className="text-lg leading-none">{icon}</span>
              <span className="text-[10px] font-bold">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
