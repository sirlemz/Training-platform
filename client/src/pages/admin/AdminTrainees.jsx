import React, { useEffect, useState } from 'react';
import { api } from '../../api';

function TraineeModal({ trainee, onSave, onClose }) {
  const [name, setName] = useState(trainee?.name || '');
  const [email, setEmail] = useState(trainee?.email || '');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) return;
    if (!trainee && !password) { setError('Password is required'); return; }
    setSaving(true);
    setError('');
    try {
      if (trainee) {
        await api.updateTrainee(trainee.id, { name, email, password: password || undefined });
      } else {
        await api.createTrainee({ name, email, password });
      }
      onSave();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{trainee ? 'Edit Trainee' : 'Add Trainee'}</div>
        <div className="fg">
          <label className="lbl">Full Name *</label>
          <input className="inp" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Juan dela Cruz" autoFocus />
        </div>
        <div className="fg">
          <label className="lbl">Email Address *</label>
          <input className="inp" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="trainee@email.com" />
        </div>
        <div className="fg">
          <label className="lbl">{trainee ? 'New Password (leave blank to keep current)' : 'Password *'}</label>
          <input className="inp" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={trainee ? 'Leave blank to keep current…' : 'Min. 6 characters'} />
        </div>
        {error && (
          <div style={{ background: '#fee2e2', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#dc2626' }}>{error}</div>
        )}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-pri" onClick={handleSave} disabled={saving || !name.trim() || !email.trim()}>
            {saving ? 'Saving…' : trainee ? 'Save Changes' : 'Create Trainee'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminTrainees() {
  const [trainees, setTrainees] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editTrainee, setEditTrainee] = useState(null);
  const [search, setSearch] = useState('');

  const load = () => api.getTrainees().then(setTrainees);
  useEffect(() => { load(); }, []);

  const handleDelete = async (t) => {
    if (!confirm(`Delete trainee "${t.name}"? This will remove all their progress data.`)) return;
    await api.deleteTrainee(t.id);
    load();
  };

  const filtered = trainees.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Trainees</div>
        <div className="topbar-actions">
          <button className="btn btn-pri btn-sm" onClick={() => { setEditTrainee(null); setShowModal(true); }}>
            + Add Trainee
          </button>
        </div>
      </div>

      <div className="page-content">
        <div style={{ marginBottom: 16 }}>
          <input className="inp" style={{ maxWidth: 320 }} placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">👥</div>
            <div className="empty-text">{search ? 'No trainees match your search' : 'No trainees yet'}</div>
            <div className="empty-sub">{!search && 'Add trainees so you can assign them to classes'}</div>
            {!search && (
              <button className="btn btn-pri" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}>Add First Trainee</button>
            )}
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Member Since</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                          {t.name[0]?.toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600 }}>{t.name}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--muted)' }}>{t.email}</td>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>{new Date(t.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setEditTrainee(t); setShowModal(true); }}>Edit</button>
                        <button className="btn btn-bad btn-sm" onClick={() => handleDelete(t)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <TraineeModal
          trainee={editTrainee}
          onSave={() => { setShowModal(false); load(); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
