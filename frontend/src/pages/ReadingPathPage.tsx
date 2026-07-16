import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { generateReadingPath } from "../api/client"
import { Route as RouteIcon, Loader2, BookOpen } from "lucide-react"

export default function ReadingPathPage() {
  const [goal, setGoal] = useState("")
  const [maxPapers, setMaxPapers] = useState(10)

  const mut = useMutation({
    mutationFn: () => generateReadingPath(goal, maxPapers),
  })

  const path: any[] = mut.data?.reading_path || []

  return (
    <div className="p-8 space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          <RouteIcon size={22} className="text-accent" /> Smart Reading Path
        </h1>
        <p className="text-sm text-muted mt-1">
          Describe what you want to understand. Papers are ranked by PageRank
          and year, then ordered from foundational to cutting-edge by the LLM.
        </p>
      </div>

      <div className="card space-y-3">
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder='e.g. "I want to understand diffusion models from scratch"'
          className="input w-full h-20 resize-none"
        />
        <div className="flex items-center gap-3">
          <label className="text-xs text-muted">Max papers</label>
          <input
            type="number"
            min={3}
            max={30}
            value={maxPapers}
            onChange={(e) => setMaxPapers(Number(e.target.value))}
            className="input w-20"
          />
          <button
            onClick={() => mut.mutate()}
            disabled={!goal.trim() || mut.isPending}
            className="btn-primary ml-auto flex items-center gap-2"
          >
            {mut.isPending
              ? <><Loader2 size={14} className="animate-spin" /> Building path…</>
              : <><RouteIcon size={14} /> Generate Reading Path</>}
          </button>
        </div>
      </div>

      {mut.data?.error && (
        <div className="card border-warn/30 bg-warn/5 text-sm text-text">{mut.data.error}</div>
      )}

      {path.length > 0 && (
        <div className="space-y-3">
          {mut.data?.note && (
            <p className="text-xs text-muted italic">{mut.data.note}</p>
          )}
          <ol className="space-y-3">
            {path.map((p: any, i: number) => (
              <li key={i} className="card flex gap-4 items-start animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                <span className="shrink-0 w-7 h-7 rounded-full bg-accent/15 text-accent text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text flex items-center gap-2">
                    <BookOpen size={13} className="text-muted shrink-0" />
                    {p.title}
                    {p.year && <span className="text-xs text-muted font-normal">({p.year})</span>}
                  </p>
                  {p.why && <p className="text-xs text-muted mt-1">{p.why}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
