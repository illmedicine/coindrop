"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type AuthMode = "login" | "register"

function AuthModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [mode, setMode] = useState<AuthMode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!email || !password) { setError("Please fill in all fields."); return }
    if (mode === "register" && !name) { setError("Please enter your name."); return }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return }
    if (mode === "register") {
      localStorage.setItem("cd_user", JSON.stringify({ name, email }))
    } else {
      if (!localStorage.getItem("cd_user")) { setError("No account found. Please register first."); return }
    }
    localStorage.setItem("cd_auth", "true")
    onSuccess()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-md bg-[#0D1B2A] rounded-t-3xl sm:rounded-2xl border border-white/10 p-6 pb-10 sm:pb-6 shadow-2xl">
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5 sm:hidden" />
        <div className="flex items-center gap-2 mb-5">
          <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center font-black text-xs shadow-lg shadow-orange-500/30">₿</div>
          <span className="font-black tracking-tight">COIN<span className="text-orange-500">DROP</span></span>
        </div>
        <div className="flex rounded-xl border border-white/10 bg-white/5 p-1 mb-5">
          {(["login", "register"] as AuthMode[]).map((m) => (
            <button key={m} onClick={() => { setMode(m); setError("") }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === m ? "bg-orange-500 text-white" : "text-white/40"}`}>
              {m === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === "register" && (
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white placeholder-white/25 outline-none focus:border-orange-500/60 transition" />
          )}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white placeholder-white/25 outline-none focus:border-orange-500/60 transition" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white placeholder-white/25 outline-none focus:border-orange-500/60 transition" />
          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}
          <button type="submit" className="mt-1 w-full py-4 rounded-xl bg-orange-500 hover:bg-orange-400 active:scale-95 text-white text-base font-black transition-all shadow-lg shadow-orange-500/30">
            {mode === "login" ? "Sign In & Start Earning" : "Create Free Account"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-white/30">
          {mode === "login" ? "No account? " : "Already registered? "}
          <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError("") }}
            className="text-orange-400 font-semibold">{mode === "login" ? "Register" : "Sign In"}</button>
        </p>
      </div>
    </div>
  )
}

export default function DemoPage() {
  const router = useRouter()
  const [showAuth, setShowAuth] = useState(false)

  const handleCTA = () => {
    const isAuth = localStorage.getItem("cd_auth")
    if (isAuth) router.push("/")
    else setShowAuth(true)
  }

  return (
    <div className="flex flex-col bg-[#060E1A] text-white min-h-screen">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => { setShowAuth(false); router.push("/") }} />}

      {/* NAV */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-5 md:px-10 py-4 bg-[#060E1A]/90 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center font-black text-sm shadow-lg shadow-orange-500/30">₿</div>
          <span className="font-black text-base tracking-tight">COIN<span className="text-orange-500">DROP</span></span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
          {["Watch", "Engage", "Earn", "About"].map(l => <span key={l} className="hover:text-white cursor-pointer transition">{l}</span>)}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleCTA} className="hidden sm:block text-sm text-white/50 hover:text-white px-3 py-2 transition">Login</button>
          <button onClick={handleCTA} className="bg-orange-500 hover:bg-orange-400 active:scale-95 text-white text-sm font-black px-4 py-2.5 rounded-xl transition-all shadow-md shadow-orange-500/20">
            Get Started
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0D1B2A] to-[#060E1A]" />
        <div className="absolute inset-0" style={{background:"radial-gradient(ellipse 60% 60% at 50% 0%, rgba(249,115,22,0.12), transparent)"}} />
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:"linear-gradient(white 1px,transparent 1px),linear-gradient(90deg,white 1px,transparent 1px)",backgroundSize:"60px 60px"}} />

        <div className="relative z-10 max-w-6xl mx-auto px-5 md:px-10 py-16 md:py-28 flex flex-col md:flex-row items-center gap-12 md:gap-16">
          {/* Left */}
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs font-bold uppercase tracking-widest mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              Powered by Solana
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight leading-none mb-3">
              COIN<span className="text-orange-500">DROP</span>
            </h1>
            <p className="text-sm md:text-base font-bold tracking-[0.25em] text-white/40 uppercase mb-5">
              Watch • Engage • Earn
            </p>
            <p className="text-white/60 text-base md:text-lg leading-relaxed mb-8 max-w-lg mx-auto md:mx-0">
              Your global side hustle. Watch content, engage with brands, and earn <span className="text-orange-400 font-semibold">Solana</span> daily — straight to your wallet, from anywhere in the world.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <button onClick={handleCTA} className="bg-orange-500 hover:bg-orange-400 active:scale-95 text-white font-black py-4 px-8 rounded-2xl text-base transition-all shadow-xl shadow-orange-500/30">
                Start Earning — It&apos;s Free
              </button>
              <button onClick={handleCTA} className="border border-white/10 hover:border-white/20 active:scale-95 text-white/60 hover:text-white font-semibold py-4 px-8 rounded-2xl text-sm transition-all">
                How It Works
              </button>
            </div>
            <div className="mt-6 flex items-center gap-1.5 justify-center md:justify-start">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
              </span>
              <p className="text-xs text-green-400">10,000+ creators earning right now</p>
            </div>
          </div>

          {/* Right — Task cards */}
          <div className="flex-shrink-0 w-full max-w-xs md:max-w-sm">
            <div className="rounded-3xl border border-white/10 bg-[#0D1B2A] p-5 shadow-2xl shadow-black/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white/30 text-[10px] uppercase tracking-widest">Total Earned</p>
                  <p className="text-2xl font-black text-orange-400">0.1 <span className="text-sm text-white/40">SOL</span></p>
                </div>
                <div className="w-9 h-9 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-black text-xs">CD</div>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full mb-4">
                <div className="h-1.5 bg-orange-500 rounded-full w-1/3 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
              </div>
              <p className="text-white/20 text-xs mb-4">Available Tasks</p>
              <div className="flex flex-col gap-2">
                {[
                  { icon: "▶", name: "Watch YouTube", earn: "+0.1 SOL", color: "text-red-400" },
                  { icon: "📸", name: "Watch Instagram", earn: "+0.05 SOL", color: "text-pink-400" },
                  { icon: "👍", name: "Watch & Like", earn: "+0.5 SOL", color: "text-blue-400" },
                ].map(({ icon, name, earn, color }) => (
                  <div key={name} className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{icon}</span>
                      <span className="text-white text-xs font-medium">{name}</span>
                    </div>
                    <span className={`text-xs font-black ${color}`}>{earn}</span>
                  </div>
                ))}
              </div>
              <button onClick={handleCTA} className="mt-4 w-full bg-orange-500 hover:bg-orange-400 active:scale-95 text-white font-black py-3 rounded-xl text-sm transition-all shadow-lg shadow-orange-500/30">
                Start Earning Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="px-5 md:px-10 py-10 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-3 border border-orange-500/15 rounded-2xl bg-[#0D1B2A] divide-x divide-white/5">
          {[
            { value: "10K+", label: "Active Earners" },
            { value: "3.2M", label: "SOL Distributed" },
            { value: "$2.1M", label: "Total Paid Out" },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center py-6 md:py-8">
              <span className="text-2xl md:text-3xl font-black text-orange-500">{value}</span>
              <span className="text-[10px] md:text-xs text-white/30 uppercase tracking-widest mt-1">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-5 md:px-10 py-12 max-w-6xl mx-auto w-full">
        <div className="text-center mb-10 md:mb-14">
          <p className="text-orange-500 text-xs font-bold uppercase tracking-widest mb-2">Simple Process</p>
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight">How It <span className="text-orange-500">Works</span></h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {[
            { step: "01", title: "Sign Up Free", desc: "Create your account in under 2 minutes. No credit card, no KYC needed to start." },
            { step: "02", title: "Pick a Task", desc: "Watch videos, like posts, or follow accounts across YouTube, Instagram, X, TikTok and more." },
            { step: "03", title: "Earn SOL Daily", desc: "SOL lands in your wallet every day. Withdraw anytime with zero platform fees." },
          ].map(({ step, title, desc }) => (
            <div key={step} className="rounded-2xl border border-white/8 bg-[#0D1B2A] p-6 flex flex-col gap-4">
              <span className="text-3xl font-black text-orange-500/30">{step}</span>
              <h3 className="text-white font-black text-lg">{title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AVAILABLE TASKS */}
      <section className="px-5 md:px-10 py-12 max-w-6xl mx-auto w-full">
        <div className="text-center mb-10">
          <p className="text-orange-500 text-xs font-bold uppercase tracking-widest mb-2">Earn More</p>
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight">Available <span className="text-orange-500">Tasks</span></h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { icon: "▶", platform: "YouTube", task: "Watch Video", earn: "0.1 SOL", badge: "bg-red-500/15 text-red-400" },
            { icon: "📸", platform: "Instagram", task: "Watch Reel", earn: "0.05 SOL", badge: "bg-pink-500/15 text-pink-400" },
            { icon: "👍", platform: "Any Platform", task: "Watch & Like", earn: "0.5 SOL", badge: "bg-blue-500/15 text-blue-400" },
            { icon: "🔁", platform: "Twitter / X", task: "Retweet & Follow", earn: "0.08 SOL", badge: "bg-sky-500/15 text-sky-400" },
            { icon: "🎵", platform: "TikTok", task: "Watch Short", earn: "0.03 SOL", badge: "bg-purple-500/15 text-purple-400" },
            { icon: "💬", platform: "Any Platform", task: "Comment & Share", earn: "0.06 SOL", badge: "bg-green-500/15 text-green-400" },
          ].map(({ icon, platform, task, earn, badge }) => (
            <div key={task} className="flex items-center justify-between rounded-2xl border border-white/8 bg-[#0D1B2A] px-4 py-4 hover:border-orange-500/20 transition-colors group">
              <div className="flex items-center gap-3">
                <span className="text-xl w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl group-hover:bg-orange-500/10 transition-colors">{icon}</span>
                <div>
                  <p className="text-white font-bold text-sm">{task}</p>
                  <p className="text-white/30 text-xs">{platform}</p>
                </div>
              </div>
              <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${badge}`}>+{earn}</span>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="px-5 md:px-10 py-12 max-w-6xl mx-auto w-full">
        <div className="text-center mb-10">
          <p className="text-orange-500 text-xs font-bold uppercase tracking-widest mb-2">Reviews</p>
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight">Real <span className="text-orange-500">Earners</span></h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { quote: "Made 2 SOL in my first week. Easiest side hustle I've ever had.", name: "Priya S.", handle: "@priyacreates" },
            { quote: "Finally a platform that pays me in crypto for what I already do online.", name: "Marcus T.", handle: "@marcusmakes" },
            { quote: "Withdrew my first SOL in 24 hours. No cap, it actually works.", name: "Aiko R.", handle: "@aikovibes" },
          ].map(({ quote, name, handle }) => (
            <div key={handle} className="rounded-2xl border border-white/8 bg-[#0D1B2A] p-5 md:p-6">
              <p className="text-white/60 text-sm leading-relaxed mb-4">&ldquo;{quote}&rdquo;</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-xs font-black">{name[0]}</div>
                <div>
                  <p className="text-white text-xs font-bold">{name}</p>
                  <p className="text-orange-500/50 text-[10px]">{handle}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-5 md:px-10 py-16 md:py-20 text-center max-w-2xl mx-auto w-full mb-16 md:mb-0">
        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-4">
          Ready to <span className="text-orange-500">Earn?</span>
        </h2>
        <p className="text-white/40 text-sm md:text-base mb-8">Join 10,000+ earners getting paid in SOL daily.</p>
        <button onClick={handleCTA} className="w-full sm:w-auto bg-orange-500 hover:bg-orange-400 active:scale-95 text-white font-black py-4 px-10 rounded-2xl text-base transition-all shadow-xl shadow-orange-500/30">
          Create Free Account
        </button>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-8 px-5 md:px-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center font-black text-xs">₿</div>
            <span className="font-black text-sm">COIN<span className="text-orange-500">DROP</span></span>
          </div>
          <p className="text-white/20 text-xs">© 2025 CoinDrop. All rights reserved.</p>
          <div className="flex gap-6">
            {["Privacy", "Terms", "Contact", "Blog"].map(l => (
              <span key={l} className="text-white/20 text-xs hover:text-white/50 cursor-pointer transition">{l}</span>
            ))}
          </div>
        </div>
      </footer>

      {/* STICKY BOTTOM CTA — mobile only */}
      <div className="fixed bottom-0 left-0 right-0 z-30 p-4 bg-gradient-to-t from-[#060E1A] via-[#060E1A]/80 to-transparent pointer-events-none md:hidden">
        <button onClick={handleCTA} className="w-full max-w-sm mx-auto block bg-orange-500 hover:bg-orange-400 active:scale-95 text-white font-black py-4 rounded-2xl text-base transition-all shadow-2xl shadow-orange-500/40 pointer-events-auto">
          Start Earning Free 🚀
        </button>
      </div>
    </div>
  )
}
