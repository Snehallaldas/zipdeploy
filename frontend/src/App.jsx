import { useState, useEffect } from "react";
import axios from "axios";

const API = "https://zipdeploy.onrender.com";

const PROJECT_ICONS = {
  react: "⚛️", static: "🌐", vue: "💚",
  nextjs: "▲", svelte: "🔥", node: "🟩", unknown: "📦"
};

export default function App() {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState("idle");
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [deployments, setDeployments] = useState([]);
  const [page, setPage] = useState("deploy");
  const [deleting, setDeleting] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (page === "history") fetchDeployments();
  }, [page]);

  useEffect(() => {
    let interval;
    if (status === "uploading") {
      setStep(0);
      interval = setInterval(() => {
        setStep((s) => (s < 3 ? s + 1 : s));
      }, 1800);
    }
    return () => clearInterval(interval);
  }, [status]);

  const fetchDeployments = async () => {
    try {
      const res = await axios.get(`${API}/deployments`);
      setDeployments(res.data.reverse());
    } catch {
      setDeployments([]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith(".zip")) {
      setFile(dropped);
      setStatus("idle");
      setResult(null);
      setError(null);
    } else {
      setError("Only .zip files are supported!");
    }
  };

  const handleDeploy = async () => {
    if (!file) return;
    setStatus("uploading");
    setError(null);
    setResult(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post(`${API}/deploy`, formData);
      setResult(res.data);
      setStatus("success");
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong");
      setStatus("error");
    }
  };

  const handleDelete = async (job_id, site_id) => {
    setDeleting(job_id);
    try {
      await axios.delete(`${API}/deploy/job/${job_id}`);
      await fetchDeployments();
    } catch (err) {
      alert(err.response?.data?.detail || "Delete failed");
    }
    setDeleting(null);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = [
    { icon: "📦", label: "Uploading ZIP" },
    { icon: "🔍", label: "Detecting project" },
    { icon: "⚙️", label: "Building" },
    { icon: "🚀", label: "Deploying to Netlify" },
  ];

  const resetDeploy = () => {
    setFile(null);
    setStatus("idle");
    setResult(null);
    setError(null);
    setStep(0);
  };

  return (
    <div style={styles.page}>
      <div style={styles.blob1} />
      <div style={styles.blob2} />

      <div style={styles.card}>
        <div style={styles.header}>
          <span style={styles.logo}>⚡</span>
          <h1 style={styles.title}>ZipDeploy</h1>
          <p style={styles.subtitle}>Drop a ZIP. Get a live URL.</p>
        </div>

        <div style={styles.nav}>
          {["deploy", "history"].map((p) => (
            <button
              key={p}
              style={{ ...styles.navBtn, ...(page === p ? styles.navActive : {}) }}
              onClick={() => setPage(p)}
            >
              {p === "deploy" ? "Deploy" : "History"}
            </button>
          ))}
        </div>

        {page === "deploy" && (
          <>
            {status === "idle" && (
              <>
                <div
                  style={{
                    ...styles.dropzone,
                    borderColor: dragging ? "#818cf8" : "#1e293b",
                    background: dragging ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.02)",
                    transform: dragging ? "scale(1.02)" : "scale(1)",
                  }}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("fileInput").click()}
                >
                  <input
                    id="fileInput" type="file" accept=".zip"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      setFile(e.target.files[0]);
                      setError(null);
                    }}
                  />
                  <div style={styles.dropIcon}>{file ? "📦" : "☁️"}</div>
                  {file ? (
                    <p style={styles.filename}>{file.name}</p>
                  ) : (
                    <>
                      <p style={styles.dropText}>Drag and drop your ZIP here</p>
                      <p style={styles.dropSub}>Supports static, React, Vue, Svelte, Next.js</p>
                    </>
                  )}
                </div>

                {error && <div style={styles.errorBox}>❌ {error}</div>}

                <button
                  style={{
                    ...styles.button,
                    opacity: file ? 1 : 0.4,
                    cursor: file ? "pointer" : "not-allowed",
                  }}
                  onClick={handleDeploy}
                  disabled={!file}
                >
                  Deploy Now
                </button>
              </>
            )}

            {status === "uploading" && (
              <div style={styles.progressBox}>
                <p style={styles.progressTitle}>Deploying your project...</p>
                {steps.map((s, i) => (
                  <div key={i} style={styles.stepRow}>
                    <div style={{
                      ...styles.stepDot,
                      background: i < step ? "#22c55e" : i === step ? "#6366f1" : "#1e293b",
                      boxShadow: i === step ? "0 0 12px #6366f1" : "none",
                    }} />
                    <span style={{
                      ...styles.stepLabel,
                      color: i <= step ? "#f8fafc" : "#475569",
                    }}>
                      {s.icon} {s.label}
                      {i === step && <span style={{ color: "#6366f1" }}> ●</span>}
                      {i < step && <span style={{ color: "#22c55e" }}> ✓</span>}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {status === "success" && result && (
              <div style={styles.successBox}>
                <div style={styles.successIcon}>🎉</div>
                <p style={styles.successTitle}>Live on the internet!</p>
                <p style={styles.deployedAs}>
                  {PROJECT_ICONS[result.project_type]} Deployed as{" "}
                  <strong style={{ color: "#a5b4fc" }}>{result.project_type}</strong>
                </p>

                {/* ✅ FIXED */}
                <div style={styles.urlRow}>
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.urlLink}
                  >
                    {result.url}
                  </a>
                  <button
                    style={styles.copyBtn}
                    onClick={() => copyToClipboard(result.url)}
                  >
                    {copied ? "✓" : "copy"}
                  </button>
                </div>

                <button style={styles.secondaryBtn} onClick={resetDeploy}>
                  Deploy another
                </button>
              </div>
            )}

            {status === "error" && (
              <div style={styles.errorBox}>
                <p style={{ margin: "0 0 12px" }}>❌ {error}</p>
                <button style={styles.secondaryBtn} onClick={resetDeploy}>
                  Try again
                </button>
              </div>
            )}
          </>
        )}

        {page === "history" && (
          <>
            {deployments.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={{ fontSize: "2rem" }}>📭</p>
                <p style={{ color: "#475569" }}>No deployments yet.</p>
              </div>
            ) : (
              <div style={styles.deployList}>
                {deployments.map((d) => (
                  <div key={d.job_id} style={styles.deployCard}>
                    <div style={styles.deployLeft}>
                      <span style={styles.deployIcon}>
                        {PROJECT_ICONS[d.project_type] || "📦"}
                      </span>
                      <div>
                        <p style={styles.deployType}>{d.project_type}</p>

                        {/* ✅ FIXED */}
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noreferrer"
                          style={styles.deployUrl}
                        >
                          {d.url.replace("https://", "")}
                        </a>

                      </div>
                    </div>
                    <button
                      style={{
                        ...styles.deleteBtn,
                        opacity: deleting === d.job_id ? 0.4 : 1,
                      }}
                      onClick={() => handleDelete(d.job_id, d.site_id)}
                      disabled={deleting === d.job_id}
                    >
                      {deleting === d.job_id ? "..." : "🗑️"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
const styles = {
  page: {
    minHeight: "100vh",
    background: "#020617",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Segoe UI', sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  blob1: {
    position: "fixed", top: "-100px", left: "-100px",
    width: "400px", height: "400px",
    background: "radial-gradient(circle, rgba(99,102,241,0.15), transparent 70%)",
    borderRadius: "50%", pointerEvents: "none",
  },
  blob2: {
    position: "fixed", bottom: "-100px", right: "-100px",
    width: "400px", height: "400px",
    background: "radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%)",
    borderRadius: "50%", pointerEvents: "none",
  },
  card: {
    background: "rgba(15,23,42,0.9)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "20px",
    padding: "40px",
    width: "100%",
    maxWidth: "460px",
    boxShadow: "0 32px 64px rgba(0,0,0,0.6)",
    position: "relative",
    zIndex: 1,
  },
  header: { textAlign: "center", marginBottom: "28px" },
  logo: { fontSize: "2.5rem" },
  title: { color: "#f8fafc", fontSize: "1.8rem", margin: "4px 0 6px" },
  subtitle: { color: "#475569", fontSize: "0.9rem", margin: 0 },
  nav: { display: "flex", gap: "8px", marginBottom: "28px" },
  navBtn: {
    flex: 1, padding: "10px",
    background: "rgba(255,255,255,0.03)",
    color: "#475569",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "10px", cursor: "pointer",
    fontSize: "0.88rem", fontWeight: "600",
  },
  navActive: {
    background: "rgba(99,102,241,0.15)",
    color: "#a5b4fc",
    borderColor: "rgba(99,102,241,0.4)",
  },
  dropzone: {
    border: "2px dashed",
    borderRadius: "14px",
    padding: "44px 24px",
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.25s",
    marginBottom: "16px",
  },
  dropIcon: { fontSize: "2.5rem", marginBottom: "12px" },
  dropText: { color: "#94a3b8", fontSize: "1rem", margin: "0 0 6px" },
  dropSub: { color: "#334155", fontSize: "0.8rem", margin: 0 },
  filename: { color: "#a5b4fc", fontSize: "0.95rem", margin: 0 },
  button: {
    width: "100%", padding: "14px",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "white", border: "none",
    borderRadius: "12px", fontSize: "1rem",
    fontWeight: "700", cursor: "pointer",
  },
  secondaryBtn: {
    width: "100%", padding: "11px",
    background: "rgba(255,255,255,0.05)",
    color: "#94a3b8",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "10px", fontSize: "0.9rem",
    fontWeight: "600", cursor: "pointer",
    marginTop: "12px",
  },
  progressBox: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "14px", padding: "24px",
  },
  progressTitle: {
    color: "#94a3b8", fontSize: "0.9rem",
    margin: "0 0 20px", textAlign: "center",
  },
  stepRow: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" },
  stepDot: { width: "10px", height: "10px", borderRadius: "50%", flexShrink: 0, transition: "all 0.3s" },
  stepLabel: { fontSize: "0.9rem", transition: "color 0.3s" },
  successBox: {
    background: "rgba(34,197,94,0.05)",
    border: "1px solid rgba(34,197,94,0.2)",
    borderRadius: "14px", padding: "28px",
    textAlign: "center",
  },
  successIcon: { fontSize: "2.5rem", marginBottom: "8px" },
  successTitle: { color: "#f8fafc", fontSize: "1.1rem", fontWeight: "700", margin: "0 0 6px" },
  deployedAs: { color: "#64748b", fontSize: "0.85rem", margin: "0 0 16px" },
  urlRow: {
    display: "flex", alignItems: "center", gap: "8px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "10px", padding: "10px 14px",
    marginBottom: "4px",
  },
  urlLink: {
    color: "#60a5fa", fontSize: "0.85rem",
    wordBreak: "break-all", flex: 1, textDecoration: "none",
  },
  copyBtn: {
    background: "rgba(255,255,255,0.08)",
    border: "none", borderRadius: "6px",
    color: "#94a3b8", cursor: "pointer",
    padding: "4px 10px", fontSize: "0.8rem", flexShrink: 0,
  },
  errorBox: {
    background: "rgba(248,113,113,0.08)",
    border: "1px solid rgba(248,113,113,0.2)",
    borderRadius: "12px", padding: "16px",
    color: "#fca5a5", fontSize: "0.9rem",
    marginBottom: "12px",
  },
  emptyState: { textAlign: "center", padding: "40px 0" },
  deployList: { display: "flex", flexDirection: "column", gap: "10px" },
  deployCard: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "12px", padding: "14px 16px",
  },
  deployLeft: { display: "flex", alignItems: "center", gap: "12px" },
  deployIcon: { fontSize: "1.5rem" },
  deployType: { color: "#64748b", fontSize: "0.75rem", margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.5px" },
  deployUrl: { color: "#60a5fa", fontSize: "0.85rem", wordBreak: "break-all" },
  deleteBtn: {
    background: "rgba(248,113,113,0.1)",
    border: "1px solid rgba(248,113,113,0.2)",
    borderRadius: "8px", padding: "8px 10px",
    cursor: "pointer", fontSize: "1rem", flexShrink: 0,
  },
};