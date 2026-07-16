import { useMutation } from "@tanstack/react-query"
import { generateHypothesis } from "../api/client"
import { Sparkles, Loader2, Lightbulb, ArrowRightLeft } from "lucide-react"

export default function HypothesisPage() {
  const mut = useMutation({ mutationFn: generateHypothesis })
  const hypotheses: any[] = mut.data?.hypotheses || []

  return (
    <div className="p-8 space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          <Sparkles size={22} className="text-accent" /> Hypothesis Engine
        </h1>
        <p className="text-sm text-muted mt-1">
          Looks at disconnected clusters, underused methods, and rarely-paired
          keywords across your knowledge graph, then proposes research
          hypotheses nobody in the graph has tested yet.
        </p>
      </div>

      <button
        onClick={() => mut.mutate()}
        disabled={mut.isPending}
        className="btn-primary flex items-center gap-2"
      >
        {mut.isPending
          ? <><Loader2 size={16} className="animate-spin" /> Analyzing graph patterns…</>
          : <><Sparkles size={16} /> Generate Hypotheses</>}
      </button>

      {mut.isError && (
        <div className="card border-danger/30 bg-danger/5 text-sm text-text">
          Could not generate hypotheses. Make sure you've uploaded at least a
          few papers first — the engine needs graph structure to find gaps.
        </div>
      )}

      {mut.isSuccess && hypotheses.length === 0 && (
        <div className="card text-sm text-muted">
          Not enough graph structure yet to propose confident hypotheses — try
          uploading more papers across different sub-topics.
        </div>
      )}

      <div className="space-y-4">
        {hypotheses.map((h, i) => (
          <div key={i} className="card space-y-3 animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-start gap-2">
              <Lightbulb size={16} className="text-warn shrink-0 mt-0.5" />
              <h2 className="text-text font-semibold">{h.title}</h2>
            </div>
            <p className="text-sm text-text/90 leading-relaxed">{h.hypothesis}</p>
            <p className="text-xs text-muted">{h.rationale}</p>
            {h.connects?.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <ArrowRightLeft size={12} className="text-accent2" />
                {h.connects.map((c: string, j: number) => (
                  <span key={j} className="badge-purple">{c}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
