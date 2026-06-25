import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';

function ClassModal({ cls, onSave, onClose }) {
  const [name, setName] = useState(cls?.name || '');
  const [description, setDescription] = useState(cls?.description || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (cls) {
        await api.updateClass(cls.id, { name, description });
      } else {
        await api.createClass({ name, description });
      }
      onSave();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{cls ? 'Edit Class' : 'New Class'}</div>
        <div className="fg">
          <label className="lbl">Class Name *</label>
          <input className="inp" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Batch 2 — Outbound Chat" autoFocus />
        </div>
        <div className="fg">
          <label className="lbl">Description</label>
          <textarea className="inp" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description…" />
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-pri" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : cls ? 'Save Changes' : 'Create Class'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminClasses() {
  const [classes, setClasses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editCls, setEditCls] = useState(null);
  const navigate = useNavigate();

  const load = () => api.getClasses().then(setClasses);
  useEffect(() => { load(); }, []);

  const handleDelete = async (cls, e) => {
    e.stopPropagation();
    if (!confirm(`Delete class "${cls.name}"? This cannot be undone.`)) return;
    await api.deleteClass(cls.id);
    load();
  };

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Classes</div>
        <div className="topbar-actions">
          <button className="btn btn-pri btn-sm" onClick={() => { setEditCls(null); setShowModal(true); }}>
            + New Class
          </button>
        </div>
      </div>

      <div className="page-content">
        {classes.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🎓</div>
            <div className="empty-text">No classes yet</div>
            <div className="empty-sub">Create a class to assign trainees and content</div>
            <button className="btn btn-pri" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}>
              Create First Class
            </button>
          </div>
        ) : (
          <div className="class-grid">
            {classes.map(cls => (
              <div key={cls.id} className="class-card" onClick={() => navigate(`/admin/classes/${cls.id}`)}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div className="class-card-name">{cls.name}</div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button className="btn btn-ghost btn-sm btn-icon" title="Edit" onClick={e => { e.stopPropagation(); setEditCls(cls); setShowModal(true); }}>✏️</button>
                    <button className="btn btn-ghost btn-sm btn-icon" title="Delete" onClick={e => handleDelete(cls, e)}>🗑️</button>
                  </div>
                </div>
                <div className="class-card-desc">{cls.description || 'No description'}</div>
                <div className="class-card-meta">
                  <span>📦 {cls.moduleCount} module{cls.moduleCount !== 1 ? 's' : ''}</span>
                  <span>👥 {cls.traineeCount} trainee{cls.traineeCount !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ marginTop: 4 }}>
                  <span className="badge b-info">View Details →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <ClassModal
          cls={editCls}
          onSave={() => { setShowModal(false); load(); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
