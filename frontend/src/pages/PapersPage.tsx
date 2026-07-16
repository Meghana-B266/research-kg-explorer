import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { listPapers, getPaper } from "../api/client"
import { FileText, Loader2, Calendar, Users, Tag, Cpu } from "lucide-react"
import clsx from "clsx"

export default function PapersPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({ queryKey: ["papers"], queryFn: listPapers })
  const papers: any[] = data?.papers || []

  const { data: paper, isLoading: paperLoading } = useQuery({
    queryKey: ["paper", selectedId],
    queryFn: () => getPaper(selectedId!),
    enabled: !!selectedId,
  })

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-text flex items-center gap-2">
        <FileText size={22} className="text-accent" /> Papers
        <span className="text-sm font-normal text-muted ml-2">({papers.length})</span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-1 space-y-2 max-h-[70vh] overflow-y-auto pr-1">
          {isLoading && (
            <div className="flex items-center gap-2 text-muted text-sm">
              <Loader2 size={14} className="animate-spin" /> Loading papers…
            </div>
          )}
          {!isLoading && papers.length === 0 && (
            <div className="card text-sm text-muted">
              No papers yet. Go to <span className="text-accent">Upload</span> to add your first PDF.
            </div>
          )}
          {papers.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={clsx(
                "w-full text-left card transition-all hover:border-accent/50",
                selectedId === p.id && "border-accent bg-accent/5"
              )}
            >
              <p className="text-sm font-medium text-text leading-snug line-clamp-2">
                {p.title || "Untitled"}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                <span className="flex items-center gap-1"><Calendar size={11} /> {p.year || "—"}</span>
                <span className="flex items-center gap-1">
                  <Users size={11} /> {(p.authors || []).length}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Detail */}
        <div className="lg:col-span-2">
          {!selectedId ? (
            <div className="card flex items-center justify-center h-48 text-muted text-sm">
              Select a paper to view its details
            </div>
          ) : paperLoading ? (
            <div className="card flex items-center gap-2 text-muted text-sm h-48 justify-center">
              <Loader2 size={16} className="animate-spin" /> Loading…
            </div>
          ) : paper ? (
            <div className="card space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-text leading-snug">
                  {paper.p?.title}
                </h2>
                <p className="text-xs text-muted mt-1">{paper.p?.year}</p>
              </div>

              {paper.p?.abstract && (
                <div>
                  <p className="text-xs text-muted mb-1">Abstract</p>
                  <p className="text-sm text-text/90 leading-relaxed">{paper.p.abstract}</p>
                </div>
              )}

              {paper.authors?.length > 0 && (
                <div>
                  <p className="text-xs text-muted mb-1.5 flex items-center gap-1"><Users size={12} /> Authors</p>
                  <p className="text-sm text-text">{paper.authors.join(", ")}</p>
                </div>
              )}

              {paper.keywords?.length > 0 && (
                <div>
                  <p className="text-xs text-muted mb-1.5 flex items-center gap-1"><Tag size={12} /> Keywords</p>
                  <div className="flex flex-wrap gap-1">
                    {paper.keywords.map((k: string) => <span key={k} className="badge-blue">{k}</span>)}
                  </div>
                </div>
              )}

              {paper.methods?.length > 0 && (
                <div>
                  <p className="text-xs text-muted mb-1.5 flex items-center gap-1"><Cpu size={12} /> Methods</p>
                  <div className="flex flex-wrap gap-1">
                    {paper.methods.map((m: string) => <span key={m} className="badge-green">{m}</span>)}
                  </div>
                </div>
              )}

              {paper.citations?.length > 0 && (
                <div>
                  <p className="text-xs text-muted mb-1.5">Cites</p>
                  <ul className="text-xs text-text/80 space-y-1 list-disc list-inside">
                    {paper.citations.slice(0, 8).map((c: string, i: number) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              )}

              <p className="text-xs text-muted pt-2 border-t border-border">
                For claim verification, negative results, and citation context, see the{" "}
                <a href="/analysis" className="text-accent underline underline-offset-2">Analysis</a> tab.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
