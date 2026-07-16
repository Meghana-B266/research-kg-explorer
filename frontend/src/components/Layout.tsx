import { Link, useLocation } from "react-router-dom"
import {
  Upload, FileText, Network, Users, ShieldCheck, Sparkles, Route as RouteIcon,
} from "lucide-react"
import clsx from "clsx"

const NAV_ITEMS = [
  { to: "/upload", label: "Upload", icon: Upload },
  { to: "/papers", label: "Papers", icon: FileText },
  { to: "/graph", label: "Graph & Timeline", icon: Network },
  { to: "/authors", label: "Author DNA", icon: Users },
  { to: "/analysis", label: "Analysis", icon: ShieldCheck },
  { to: "/hypothesis", label: "Hypothesis Engine", icon: Sparkles },
  { to: "/reading-path", label: "Reading Path", icon: RouteIcon },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg">
      <aside className="w-56 shrink-0 border-r border-border bg-surface flex flex-col">
        <div className="px-5 py-5 border-b border-border">
          <h1 className="font-display font-bold text-lg text-text leading-tight">
            Research KG
          </h1>
          <p className="text-xs text-muted mt-0.5">Knowledge Graph Explorer</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={clsx(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all",
                  active
                    ? "bg-accent/15 text-accent border border-accent/30"
                    : "text-muted hover:text-text hover:bg-white/5 border border-transparent"
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="px-5 py-4 border-t border-border text-xs text-muted">
          Powered by NetworkX + LLM
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
