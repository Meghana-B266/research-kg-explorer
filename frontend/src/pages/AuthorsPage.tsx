import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { listAuthors, authorFingerprint, compareAuthors } from '../api/client'
import { Users, Dna, GitCompare, Loader2 } from 'lucide-react'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts'
import clsx from 'clsx'

export default function AuthorsPage() {
  const [selectedAuthor, setSelected] = useState<string | null>(null)
  const [compare1, setC1] = useState('')
  const [compare2, setC2] = useState('')

  const { data: authorsData } = useQuery({ queryKey: ['authors'], queryFn: listAuthors })
  const authors: any[] = authorsData?.authors || []

  const { data: fingerprint, isLoading: fpLoading } = useQuery({
    queryKey: ['fingerprint', selectedAuthor],
    queryFn: () => authorFingerprint(selectedAuthor!),
    enabled: !!selectedAuthor,
  })

  const compareMut = useMutation({ mutationFn: () => compareAuthors(compare1, compare2) })

  // Radar chart data from fingerprint
  const radarData = fingerprint?.top_concepts?.slice(0, 8).map((c: any) => ({
    concept: c.concept.replace('kw:', '').replace('method:', ''),
    value: Math.round(c.weight * 1000),
  })) || []

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-text flex items-center gap-2">
        <Users size={22} className="text-accent"/> Author DNA
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Author list */}
        <div className="space-y-3">
          <h2 className="section-title"><Dna size={16} className="text-accent2"/>Authors</h2>
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {authors.map((a: any) => (
              <button key={a.name}
                onClick={() => setSelected(a.name)}
                className={clsx(
                  'w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all',
                  selectedAuthor === a.name
                    ? 'bg-accent/15 text-accent border border-accent/30'
                    : 'hover:bg-white/5 text-text border border-transparent'
                )}>
                <span className="font-medium">{a.name}</span>
                <span className="text-muted text-xs ml-2">{a.paper_count} papers</span>
              </button>
            ))}
            {authors.length === 0 && (
              <p className="text-xs text-muted">No authors yet — upload papers first.</p>
            )}
          </div>
        </div>

        {/* Fingerprint panel */}
        <div className="lg:col-span-2 space-y-4">
          {selectedAuthor ? (
            <>
              <h2 className="section-title">
                <Dna size={16} className="text-accent2"/>
                Intellectual Fingerprint: <span className="text-accent ml-1">{selectedAuthor}</span>
              </h2>

              {fpLoading ? (
                <div className="flex items-center gap-2 text-muted">
                  <Loader2 size={16} className="animate-spin"/> Computing fingerprint…
                </div>
              ) : fingerprint ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Radar */}
                  <div className="card">
                    <p className="text-xs text-muted mb-3">Top Concepts (Radar)</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#1E2D4A"/>
                        <PolarAngleAxis dataKey="concept" tick={{ fill: '#6B7280', fontSize: 10 }}/>
                        <Radar dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3}/>
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Top concepts list */}
                  <div className="card">
                    <p className="text-xs text-muted mb-3">Weighted Concepts</p>
                    <div className="space-y-2">
                      {fingerprint.top_concepts?.slice(0, 10).map((c: any, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs text-muted w-5 text-right">{i+1}</span>
                          <div className="flex-1">
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="text-text">{c.concept.replace(/^(kw|method):/, '')}</span>
                              <span className="text-muted font-mono">{(c.weight * 100).toFixed(1)}%</span>
                            </div>
                            <div className="h-1 bg-border rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-accent to-accent2"
                                style={{ width: `${Math.min(c.weight * 2000, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="card flex items-center justify-center h-48 text-muted text-sm">
              Select an author to view their intellectual fingerprint
            </div>
          )}
        </div>
      </div>

      {/* Compare Authors */}
      <div className="card space-y-4">
        <h2 className="section-title"><GitCompare size={16} className="text-accent2"/>Compare Author DNA</h2>
        <div className="flex gap-3 flex-wrap">
          <select value={compare1} onChange={e => setC1(e.target.value)}
            className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent flex-1 min-w-40">
            <option value="">Author 1…</option>
            {authors.map((a: any) => <option key={a.name} value={a.name}>{a.name}</option>)}
          </select>
          <select value={compare2} onChange={e => setC2(e.target.value)}
            className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent flex-1 min-w-40">
            <option value="">Author 2…</option>
            {authors.map((a: any) => <option key={a.name} value={a.name}>{a.name}</option>)}
          </select>
          <button
            onClick={() => compareMut.mutate()}
            disabled={!compare1 || !compare2 || compareMut.isPending}
            className="btn-primary flex items-center gap-2">
            {compareMut.isPending ? <Loader2 size={14} className="animate-spin"/> : <GitCompare size={14}/>}
            Compare
          </button>
        </div>

        {compareMut.data && (
          <div className="animate-slide-up space-y-4">
            {/* Alignment score */}
            <div className="flex items-center gap-4 p-4 bg-bg rounded-xl border border-border">
              <div className="text-center">
                <p className="text-4xl font-bold font-mono text-accent">
                  {compareMut.data.alignment_score}%
                </p>
                <p className="text-xs text-muted mt-1">Intellectual Alignment</p>
              </div>
              <div className="flex-1">
                <div className="h-3 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-accent2 transition-all"
                    style={{ width: `${compareMut.data.alignment_score}%` }}
                  />
                </div>
                <p className="text-xs text-muted mt-2">
                  {compareMut.data.author1} and {compareMut.data.author2} are{' '}
                  <strong className="text-text">{compareMut.data.alignment_score}%</strong> intellectually aligned
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="card">
                <p className="text-xs text-muted mb-2">Shared Concepts</p>
                <div className="flex flex-wrap gap-1">
                  {compareMut.data.shared_concepts?.map((c: string) => (
                    <span key={c} className="badge-purple">{c.replace(/^(kw|method):/, '')}</span>
                  ))}
                </div>
              </div>
              <div className="card">
                <p className="text-xs text-muted mb-2">{compareMut.data.author1} Unique</p>
                <div className="flex flex-wrap gap-1">
                  {compareMut.data.author1_unique?.map((c: string) => (
                    <span key={c} className="badge-blue">{c.replace(/^(kw|method):/, '')}</span>
                  ))}
                </div>
              </div>
              <div className="card">
                <p className="text-xs text-muted mb-2">{compareMut.data.author2} Unique</p>
                <div className="flex flex-wrap gap-1">
                  {compareMut.data.author2_unique?.map((c: string) => (
                    <span key={c} className="badge-green">{c.replace(/^(kw|method):/, '')}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
