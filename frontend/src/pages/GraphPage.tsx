import { useEffect, useRef, useState, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Sigma } from 'sigma'
import Graph from 'graphology'
import FA2Layout from 'graphology-layout-forceatlas2/worker'
import {
  getGraph, runPagerank, explainNode, getYearRange
} from '../api/client'
import {
  Network, Zap, Clock, Info, X, Loader2, RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const NODE_COLORS: Record<string, string> = {
  paper:   '#3B82F6',
  author:  '#8B5CF6',
  keyword: '#22D3EE',
  method:  '#10B981',
}

type Mode = 'graph' | 'timeline'

export default function GraphPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sigmaRef     = useRef<Sigma | null>(null)
  const layoutRef    = useRef<FA2Layout | null>(null)
  const [mode, setMode]           = useState<Mode>('graph')
  const [selectedYear, setYear]   = useState<number>(2024)
  const [selectedNode, setNode]   = useState<any>(null)
  const [explanation, setExp]     = useState<string>('')
  const [explaining, setExplaining] = useState(false)
  const [filterType, setFilter]   = useState<string>('all')

  const { data: yearRange } = useQuery({ queryKey: ['yearRange'], queryFn: getYearRange })
  const { data: graphData, refetch, isLoading } = useQuery({
    queryKey: ['graph', mode === 'timeline' ? selectedYear : null],
    queryFn: () => getGraph(mode === 'timeline' ? selectedYear : undefined),
  })

  const pagerankMut = useMutation({
    mutationFn: runPagerank,
    onSuccess: (data) => {
      toast.success(`PageRank computed! Top: "${data.top_papers[0]?.title?.slice(0, 30)}..."`)
      refetch()
    },
  })

  // Build and render Sigma graph
  const buildGraph = useCallback(() => {
    if (!containerRef.current || !graphData) return

    // Cleanup
    layoutRef.current?.kill()
    sigmaRef.current?.kill()

    const g = new Graph({ multi: false })
    const nodes = graphData.nodes || []
    const edges = graphData.edges || []

    const filtered = filterType === 'all'
      ? nodes
      : nodes.filter((n: any) => n.type === filterType)
    const filteredIds = new Set(filtered.map((n: any) => n.id))

    filtered.forEach((node: any) => {
      if (!node.id) return
      g.addNode(node.id, {
        label:  node.label || node.id,
        size:   node.type === 'paper' ? 8 : 5,
        color:  NODE_COLORS[node.type] || '#6B7280',
        x: Math.random() * 500,
        y: Math.random() * 500,
        nodeData: node,
      })
    })

    edges.forEach((edge: any, i: number) => {
      const src = String(edge.source)
      const tgt = String(edge.target)
      if (!g.hasNode(src) || !g.hasNode(tgt) || src === tgt) return
      try {
        g.addEdge(src, tgt, {
          size: 1,
          color: edge.type === 'CITES' ? '#3B82F633' : '#8B5CF633',
        })
      } catch (_) {}
    })

    const sigma = new Sigma(g, containerRef.current, {
      renderEdgeLabels: false,
      defaultEdgeColor:  '#1E2D4A',
      defaultNodeColor:  '#3B82F6',
      labelColor: { color: '#E2E8F0' },
      labelSize: 11,
      labelWeight: '500',
      stagePadding: 40,
    })

    sigma.on('clickNode', ({ node }) => {
      const attrs = g.getNodeAttributes(node)
      setNode({ id: node, ...attrs })
      setExp('')
    })

    sigma.on('clickStage', () => setNode(null))

    sigmaRef.current = sigma

    // Force-directed layout
    const layout = new FA2Layout(g, {
      settings: { gravity: 1, scalingRatio: 10, slowDown: 5 }
    })
    layout.start()
    setTimeout(() => layout.stop(), 3000)
    layoutRef.current = layout
  }, [graphData, filterType])

  useEffect(() => { buildGraph() }, [buildGraph])
  useEffect(() => () => {
    layoutRef.current?.kill()
    sigmaRef.current?.kill()
  }, [])

  const handleExplain = async () => {
    if (!selectedNode) return
    setExplaining(true)
    setExp('')
    try {
      const type = selectedNode.nodeData?.type || 'node'
      const name = selectedNode.label || selectedNode.id
      const res = await explainNode(type, name, selectedNode.id)
      setExp(res.explanation)
    } catch {
      setExp('Could not generate explanation.')
    }
    setExplaining(false)
  }

  const minYear = yearRange?.min_year || 2018
  const maxYear = yearRange?.max_year || 2024

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-surface/50 backdrop-blur flex-wrap">
        <h1 className="text-text font-semibold flex items-center gap-2">
          <Network size={18} className="text-accent" /> Knowledge Graph
        </h1>

        <div className="flex gap-1 ml-4 bg-bg rounded-lg p-1">
          {(['graph', 'timeline'] as Mode[]).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={clsx('px-3 py-1.5 text-sm rounded-md transition-all capitalize',
                mode === m ? 'bg-accent text-white' : 'text-muted hover:text-text')}>
              {m === 'timeline' ? <><Clock size={13} className="inline mr-1"/>Timeline</> : 'Graph'}
            </button>
          ))}
        </div>

        {/* Node type filter */}
        <div className="flex gap-1">
          {['all', 'paper', 'author', 'keyword', 'method'].map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={clsx('px-2.5 py-1 text-xs rounded-full border transition-all capitalize',
                filterType === t
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-muted hover:text-text')}>
              {t}
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-2">
          <button onClick={() => pagerankMut.mutate()}
            disabled={pagerankMut.isPending}
            className="btn-ghost text-sm flex items-center gap-1.5">
            {pagerankMut.isPending
              ? <Loader2 size={14} className="animate-spin"/>
              : <Zap size={14}/>}
            PageRank
          </button>
          <button onClick={() => refetch()} className="btn-ghost text-sm flex items-center gap-1.5">
            <RefreshCw size={14}/> Refresh
          </button>
        </div>
      </div>

      {/* Timeline slider */}
      {mode === 'timeline' && (
        <div className="flex items-center gap-4 px-6 py-3 bg-card border-b border-border">
          <Clock size={14} className="text-accent shrink-0"/>
          <span className="text-xs text-muted w-20">Year: <span className="text-text font-mono font-bold">{selectedYear}</span></span>
          <input type="range"
            min={minYear} max={maxYear} value={selectedYear}
            onChange={e => setYear(Number(e.target.value))}
            className="flex-1 accent-blue-500 h-1.5"
          />
          <span className="text-xs text-muted font-mono">{minYear} → {maxYear}</span>
        </div>
      )}

      {/* Graph canvas + panel */}
      <div className="flex flex-1 overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg/80 z-10">
            <Loader2 size={32} className="animate-spin text-accent"/>
          </div>
        )}

        <div ref={containerRef} id="sigma-container" className="flex-1"/>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 card text-xs space-y-1.5 py-3">
          {Object.entries(NODE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2 capitalize">
              <span className="w-3 h-3 rounded-full" style={{ background: color }}/>
              {type}
            </div>
          ))}
        </div>

        {/* Node detail panel */}
        {selectedNode && (
          <div className="w-80 bg-surface border-l border-border overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="font-semibold text-sm">Node Detail</span>
              <button onClick={() => setNode(null)} className="text-muted hover:text-text">
                <X size={16}/>
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Type badge */}
              <div>
                <span className={clsx('badge',
                  selectedNode.nodeData?.type === 'paper'   ? 'badge-blue' :
                  selectedNode.nodeData?.type === 'author'  ? 'badge-purple' :
                  selectedNode.nodeData?.type === 'keyword' ? 'badge-blue' : 'badge-green'
                )}>{selectedNode.nodeData?.type || 'node'}</span>
              </div>

              <div>
                <p className="text-text font-medium text-sm leading-snug">
                  {selectedNode.label || selectedNode.id}
                </p>
                {selectedNode.nodeData?.year && (
                  <p className="text-muted text-xs mt-1">{selectedNode.nodeData.year}</p>
                )}
              </div>

              {selectedNode.nodeData?.authors?.length > 0 && (
                <div>
                  <p className="text-xs text-muted mb-1">Authors</p>
                  <p className="text-sm">{selectedNode.nodeData.authors.join(', ')}</p>
                </div>
              )}

              {selectedNode.nodeData?.keywords?.length > 0 && (
                <div>
                  <p className="text-xs text-muted mb-1.5">Keywords</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedNode.nodeData.keywords.slice(0, 8).map((k: string) => (
                      <span key={k} className="badge-blue">{k}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedNode.nodeData?.methods?.length > 0 && (
                <div>
                  <p className="text-xs text-muted mb-1.5">Methods</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedNode.nodeData.methods.map((m: string) => (
                      <span key={m} className="badge-green">{m}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedNode.nodeData?.abstract && (
                <div>
                  <p className="text-xs text-muted mb-1">Abstract</p>
                  <p className="text-xs text-text/80 leading-relaxed line-clamp-4">
                    {selectedNode.nodeData.abstract}
                  </p>
                </div>
              )}

              {/* ELI5 Explain */}
              <div className="pt-2 border-t border-border">
                <button onClick={handleExplain} disabled={explaining}
                  className="btn-primary w-full text-sm flex items-center justify-center gap-2">
                  {explaining
                    ? <><Loader2 size={14} className="animate-spin"/> Explaining…</>
                    : <><Info size={14}/> ELI5 Explain</>}
                </button>

                {explanation && (
                  <div className="mt-3 p-3 bg-bg rounded-lg border border-border text-xs text-text/90 leading-relaxed animate-fade-in">
                    {explanation}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
