import React, { useEffect, useState, useRef } from 'react';
import { api } from '../../api';

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function AdminAssessments() {
  const [assessments, setAssessments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const load = () => api.getAssessments().then(setAssessments);
  useEffect(() => { load(); }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.uploadAssessment(fd);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (filename) => {
    if (!confirm(`Delete "${filename}"?\n\nAny modules using this assessment will break.`)) return;
    try {
      await api.deleteAssessment(filename);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Assessment Library</div>
        <div className="topbar-actions">
          <label className={`btn btn-pri btn-sm${uploading ? ' btn-disabled' : ''}`} style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}>
            {uploading ? 'Uploading…' : '+ Upload Assessment'}
            <input ref={fileRef} type="file" accept=".html,.htm" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      <div className="page-content">
        <div className="info-box">
          Upload HTML assessment files here. Once uploaded, you can select them when adding an Assessment module to any class.
          Files must be <strong>.html</strong>. Max 10 MB each.
        </div>

        {error && (
          <div className="warn-box" style={{ marginBottom: 16 }}>{error}</div>
        )}

        {assessments.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📋</div>
            <div className="empty-text">No assessments uploaded yet</div>
            <div className="empty-sub">Upload an HTML assessment file to get started</div>
            <label className="btn btn-pri" style={{ marginTop: 16, cursor: 'pointer' }}>
              Upload First Assessment
              <input type="file" accept=".html,.htm" style={{ display: 'none' }} onChange={handleUpload} />
            </label>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Size</th>
                  <th>Uploaded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map(a => (
                  <tr key={a.filename}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 20 }}>📋</span>
                        <div>
                          <div style={{ fontWeight: 600 }}>{a.filename}</div>
                          <a
                            href={`/assessment/assessments/${encodeURIComponent(a.filename)}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: 11, color: 'var(--blue)' }}
                          >
                            Preview ↗
                          </a>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--muted)' }}>{formatSize(a.size)}</td>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>
                      {new Date(a.uploadedAt).toLocaleDateString()}
                    </td>
                    <td>
                      <button className="btn btn-bad btn-sm" onClick={() => handleDelete(a.filename)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
