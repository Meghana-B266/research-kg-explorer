import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import {
  listPapers, getClaims, getNegResults, getAllNegResults, getCitationCtx, verifyClaimAdhoc,
} from "../api/client"
import {
  ShieldCheck, AlertTriangle, MessageSquareQuote, Loader2, ChevronDown,
} from "lucide-react"
import clsx from "clsx"

type Tab = "claims" | "negative" | "citations" | "verify"

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "claims", label: "Claim Verifier", icon: ShieldCheck },
  { id: "negative", label: "Negative Results", icon: AlertTriangle },
  { id: "citations", label: "Citation Context", icon: MessageSquareQuote },
  { id: "verify", label: "Verify a Claim", icon: ShieldCheck },
]

const STRENGTH_BADGE: Record<string, string> = {
  strong: "badge-green",
  moderate: "badge-warn",
  weak: "badge-danger",
  unknown: "badge-blue",
}

const INTENT_BADGE: Record<string, string> = {
  supporting: "badge-green",
  criticizing: "badge-danger",
  mentioning: "badge-blue",
}

export default function AnalysisPage() {
  const [tab, setTab] = useState<Tab>("claims")
  const [selectedPaper, setSelectedPaper] = useState<string>("")

  const { data: papersData } = useQuery({ queryKey: ["papers"], queryFn: listPapers })
  const papers: any[] = papersData?.papers || []

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-text flex items-center gap-2">
        <ShieldCheck size={22} className="text-accent" /> Analysis
      </h1>

      <div className="flex gap-1 bg-surface rounded-lg p-1 w-fit flex-wrap">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={clsx(
              "px-3 py-1.5 text-sm rounded-md transition-all flex items-center gap-1.5",
              tab === id ? "bg-accent text-white" : "text-muted hover:text-text"
            )}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {tab !== "verify" && tab !== "negative" && (
        <select
          value={selectedPaper}
          onChange={(e) => setSelectedPaper(e.target.value)}
          className="input max-w-md"
        >
          <option value="">Select a paper…</option>
          {papers.map((p) => (
            <option key={p.id} value={p.id}>{p.title?.slice(0, 70) || "Untitled"}</option>
          ))}
        </select>
      )}

      {tab === "claims" && <ClaimsTab paperId={selectedPaper} />}
      {tab === "negative" && <NegativeResultsTab />}
      {tab === "citations" && <CitationsTab paperId={selectedPaper} />}
      {tab === "verify" && <AdhocVerifyTab />}
    </div>
  )
}

function ClaimsTab({ paperId }: { paperId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["claims", paperId],
    queryFn: () => getClaims(paperId),
    enabled: !!paperId,
  })
  const claims: any[] = data?.claims || []

  if (!paperId) return <EmptyHint text="Select a paper above to see its verified claims." />
  if (isLoading) return <LoadingHint text="Loading claims…" />
  if (claims.length === 0) {
    return <EmptyHint text="No claims analyzed yet for this paper — analysis runs in the background right after upload, so try again in a moment." />
  }

  return (
    <div className="space-y-3 max-w-3xl">
      {claims.map((c, i) => (
        <div key={i} className="card space-y-2">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-text flex-1">"{c.text}"</p>
            <span className={STRENGTH_BADGE[c.strength] || "badge-blue"}>{c.strength}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className={clsx(
                  "h-full rounded-full",
                  c.strength === "strong" ? "bg-neon" : c.strength === "weak" ? "bg-danger" : "bg-warn"
                )}
                style={{ width: `${c.score}%` }}
              />
            </div>
            <span className="text-xs text-muted font-mono">{c.score}/100</span>
          </div>
          <p className="text-xs text-muted">{c.verdict}</p>
        </div>
      ))}
    </div>
  )
}

function NegativeResultsTab() {
  const { data, isLoading } = useQuery({ queryKey: ["allNegResults"], queryFn: getAllNegResults })
  const results: any[] = data?.results || []

  if (isLoading) return <LoadingHint text="Loading negative results across the graph…" />
  if (results.length === 0) {
    return <EmptyHint text="No negative results detected yet. Upload papers to populate this — negative results are surfaced automatically from phrases like 'did not improve', 'failed to', or stated limitations." />
  }

  return (
    <div className="space-y-3 max-w-3xl">
      {results.map((r, i) => (
        <div key={i} className="card space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text">{r.paper} <span className="text-muted font-normal">({r.year})</span></p>
            <span className="badge-warn flex items-center gap-1"><AlertTriangle size={11} /> {r.type}</span>
          </div>
          <p className="text-xs text-text/80 italic">"{r.phrase}"</p>
        </div>
      ))}
    </div>
  )
}

function CitationsTab({ paperId }: { paperId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["citations", paperId],
    queryFn: () => getCitationCtx(paperId),
    enabled: !!paperId,
  })
  const citations: any[] = data?.citations || []

  if (!paperId) return <EmptyHint text="Select a paper above to see how it cites other work." />
  if (isLoading) return <LoadingHint text="Loading citation contexts…" />
  if (citations.length === 0) {
    return <EmptyHint text="No citation context analyzed yet for this paper — this runs in the background after upload." />
  }

  return (
    <div className="space-y-3 max-w-3xl">
      {citations.map((c, i) => (
        <div key={i} className="card space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-text flex-1">{c.cited_title} <span className="text-muted text-xs">({c.cited_year || "—"})</span></p>
            <span className={INTENT_BADGE[c.intent] || "badge-blue"}>{c.intent || "mentioning"}</span>
          </div>
          {c.explanation && <p className="text-xs text-muted">{c.explanation}</p>}
        </div>
      ))}
    </div>
  )
}

function AdhocVerifyTab() {
  const [claim, setClaim] = useState("")
  const [context, setContext] = useState("")
  const [showExample, setShowExample] = useState(false)

  const mut = useMutation({ mutationFn: () => verifyClaimAdhoc(claim, context) })

  return (
    <div className="max-w-2xl space-y-4">
      <div className="card space-y-3">
        <p className="text-xs text-muted">
          Paste any claim + surrounding context (e.g. from an abstract or results
          section) and get an instant evidence-strength assessment — no paper
          upload required.
        </p>
        <textarea
          value={claim}
          onChange={(e) => setClaim(e.target.value)}
          placeholder='e.g. "Our model improves accuracy significantly over prior work."'
          className="input w-full h-16 resize-none"
        />
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Paste supporting context: dataset used, baselines compared, evaluation setup…"
          className="input w-full h-28 resize-none"
        />
        <button
          onClick={() => setShowExample(!showExample)}
          className="text-xs text-accent flex items-center gap-1"
        >
          <ChevronDown size={12} className={clsx("transition-transform", showExample && "rotate-180")} />
          {showExample ? "Hide example" : "Show example"}
        </button>
        {showExample && (
          <p className="text-xs text-muted bg-bg rounded-lg p-3 border border-border">
            Claim: "Our model improves accuracy significantly." Context: "We
            evaluated on a held-out set of 200 examples, comparing only against
            a single non-neural baseline. No significance test was reported."
            → Expect a "weak" verdict.
          </p>
        )}
        <button
          onClick={() => mut.mutate()}
          disabled={!claim.trim() || mut.isPending}
          className="btn-primary flex items-center gap-2"
        >
          {mut.isPending ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
          Verify Claim
        </button>
      </div>

      {mut.data && (
        <div className="card space-y-3 animate-slide-up">
          <div className="flex items-center justify-between">
            <span className={STRENGTH_BADGE[mut.data.strength] || "badge-blue"}>{mut.data.strength}</span>
            <span className="text-xs text-muted font-mono">{mut.data.score}/100</span>
          </div>
          <p className="text-sm text-text">{mut.data.verdict}</p>
          {mut.data.evidence_found?.length > 0 && (
            <div>
              <p className="text-xs text-muted mb-1">Evidence found</p>
              <ul className="text-xs text-text/80 list-disc list-inside space-y-0.5">
                {mut.data.evidence_found.map((e: string, i: number) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
          {mut.data.gaps?.length > 0 && (
            <div>
              <p className="text-xs text-muted mb-1">Gaps</p>
              <ul className="text-xs text-danger/90 list-disc list-inside space-y-0.5">
                {mut.data.gaps.map((g: string, i: number) => <li key={i}>{g}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EmptyHint({ text }: { text: string }) {
  return <div className="card max-w-2xl text-sm text-muted">{text}</div>
}

function LoadingHint({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-muted text-sm">
      <Loader2 size={14} className="animate-spin" /> {text}
    </div>
  )
}
