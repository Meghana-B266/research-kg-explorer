import { useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import { uploadPaper } from "../api/client"
import { UploadCloud, FileText, Loader2, CheckCircle2, XCircle } from "lucide-react"
import toast from "react-hot-toast"
import clsx from "clsx"

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const uploadMut = useMutation({
    mutationFn: (f: File) => {
      const form = new FormData()
      form.append("file", f)
      return uploadPaper(form)
    },
    onSuccess: (data) => {
      toast.success(`Uploaded: "${(data.title || "Untitled").slice(0, 50)}"`)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || "Upload failed. Is the backend running?"
      toast.error(msg)
    },
  })

  const handleFile = (f: File | null) => {
    if (!f) return
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files are accepted")
      return
    }
    setFile(f)
  }

  const handleUpload = () => {
    if (!file) return
    uploadMut.mutate(file)
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          <UploadCloud size={22} className="text-accent" /> Upload a Paper
        </h1>
        <p className="text-sm text-muted mt-1">
          Upload a research PDF. It's parsed, its entities (authors, keywords,
          methods, citations) are extracted by the LLM, and it's added to the
          knowledge graph. Claim verification, negative-result detection, and
          citation-context analysis run automatically in the background.
        </p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFile(e.dataTransfer.files?.[0] || null)
        }}
        onClick={() => inputRef.current?.click()}
        className={clsx(
          "card border-dashed cursor-pointer flex flex-col items-center justify-center gap-3 py-14 transition-colors",
          dragOver ? "border-accent bg-accent/5" : "hover:border-accent/50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] || null)}
        />
        {file ? (
          <>
            <FileText size={32} className="text-accent" />
            <p className="text-text text-sm font-medium">{file.name}</p>
            <p className="text-muted text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB — click to change</p>
          </>
        ) : (
          <>
            <UploadCloud size={32} className="text-muted" />
            <p className="text-text text-sm font-medium">Drag & drop a PDF here, or click to browse</p>
            <p className="text-muted text-xs">PDF files only</p>
          </>
        )}
      </div>

      <button
        onClick={handleUpload}
        disabled={!file || uploadMut.isPending}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {uploadMut.isPending
          ? <><Loader2 size={16} className="animate-spin" /> Extracting & analyzing…</>
          : <><UploadCloud size={16} /> Upload & Process</>}
      </button>

      {uploadMut.isSuccess && (
        <div className="card border-neon/30 bg-neon/5 flex items-start gap-3 animate-slide-up">
          <CheckCircle2 size={18} className="text-neon shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="text-text font-medium">{uploadMut.data.title}</p>
            <p className="text-muted text-xs">
              {(uploadMut.data.authors || []).join(", ") || "Unknown authors"} · {uploadMut.data.year || "Year unknown"}
            </p>
            <div className="flex flex-wrap gap-1 pt-1">
              {(uploadMut.data.keywords || []).slice(0, 6).map((k: string) => (
                <span key={k} className="badge-blue">{k}</span>
              ))}
            </div>
            <p className="text-muted text-xs pt-1">{uploadMut.data.status}</p>
            <button
              onClick={() => navigate("/papers")}
              className="text-accent text-xs underline underline-offset-2 mt-1"
            >
              View in Papers →
            </button>
          </div>
        </div>
      )}

      {uploadMut.isError && (
        <div className="card border-danger/30 bg-danger/5 flex items-start gap-3 animate-slide-up">
          <XCircle size={18} className="text-danger shrink-0 mt-0.5" />
          <p className="text-sm text-text">
            {(uploadMut.error as any)?.response?.data?.detail || "Something went wrong. Check that the backend and Neo4j are running."}
          </p>
        </div>
      )}
    </div>
  )
}
