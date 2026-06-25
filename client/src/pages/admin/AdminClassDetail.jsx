import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api } from '../../api';
import { useAuth } from '../../contexts/AuthContext';

const TYPE_ICONS = { video: '🎬', assessment: '📋', text: '📄', slide_deck: '🖼️' };
const TYPE_LABELS = { video: 'Video', assessment: 'Assessment', text: 'Text / Reading', slide_deck: 'Slide Deck' };

function ModuleFormModal({ classId, mod, onSave, onClose }) {
  const [title, setTitle] = useState(mod?.title || '');
  const [type, setType] = useState(mod?.type || 'video');
  const [description, setDescription] = useState(mod?.description || '');
  const [allowRetake, setAllowRetake] = useState(mod?.allow_retake === 1);
  const [videoFile, setVideoFile] = useState(null);
  const [textContent, setTextContent] = useState(mod?.content || '');
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(mod?.content || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getAssessments().then(list => {
      setAssessments(list);
      if (!selectedAssessment && list.length > 0) setSelectedAssessment(list[0].filename);
    });
  }, []);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('type', type);
      fd.append('description', description);
      fd.append('allow_retake', allowRetake ? 'true' : 'false');

      if (type === 'video' && videoFile) {
        fd.append('video', videoFile);
      } else if (type === 'text') {
        fd.append('content', textContent);
      } else if (type === 'assessment') {
        fd.append('content', selectedAssessment);
      }
      // slide_deck: content starts empty; editor fills it via the slide editor

      if (mod) {
        await api.updateModule(mod.id, fd);
      } else {
        await api.createModule(classId, fd);
      }
      onSave();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">{mod ? 'Edit Module' : 'Add Module'}</div>

        <div className="fg">
          <label className="lbl">Module Title *</label>
          <input className="inp" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Introduction to TGS BPO" autoFocus />
        </div>

        {!mod && (
          <div className="fg">
            <label className="lbl">Module Type *</label>
            <select className="inp" value={type} onChange={e => setType(e.target.value)}>
              <option value="video">🎬 Video Training</option>
              <option value="slide_deck">🖼️ Slide Deck (Interactive)</option>
              <option value="assessment">📋 Assessment (TGS Pre-Hire)</option>
              <option value="text">📄 Text / Reading Material</option>
            </select>
          </div>
        )}

        <div className="fg">
          <label className="lbl">Description</label>
          <input className="inp" value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of this module…" />
        </div>

        {type === 'video' && (
          <div className="fg">
            <label className="lbl">{mod ? 'Replace Video File (optional)' : 'Video File *'}</label>
            <input className="inp" type="file" accept="video/*" onChange={e => setVideoFile(e.target.files[0])} />
            {mod?.content && !videoFile && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Current: {mod.content}</div>
            )}
          </div>
        )}

        {type === 'assessment' && (
          <div className="fg">
            <label className="lbl">Select Assessment *</label>
            {assessments.length === 0 ? (
              <div className="warn-box">No assessments uploaded yet. Go to <strong>Assessments</strong> in the sidebar to upload one first.</div>
            ) : (
              <select className="inp" value={selectedAssessment} onChange={e => setSelectedAssessment(e.target.value)}>
                {assessments.map(a => (
                  <option key={a.filename} value={a.filename}>{a.filename}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {type === 'text' && (
          <div className="fg">
            <label className="lbl">Content (HTML supported)</label>
            <textarea className="inp" style={{ minHeight: 120 }} value={textContent} onChange={e => setTextContent(e.target.value)} placeholder="Reading material content…" />
          </div>
        )}

        {type === 'slide_deck' && (
          <div className="info-box">
            A blank slide deck will be created. After saving, click <strong>Edit Slides</strong> on the module card to open the slide editor and build your content.
          </div>
        )}

        {type !== 'assessment' && (
          <div className="fg" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 0 }}>
            <input type="checkbox" id="allow-retake" checked={allowRetake} onChange={e => setAllowRetake(e.target.checked)} style={{ width: 16, height: 16 }} />
            <label htmlFor="allow-retake" style={{ fontSize: 13, cursor: 'pointer' }}>Allow trainees to re-do this module</label>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-pri" onClick={handleSave} disabled={saving || !title.trim() || (type === 'video' && !mod && !videoFile) || (type === 'assessment' && !selectedAssessment)}>
            {saving ? 'Saving…' : mod ? 'Save Changes' : 'Add Module'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AssignTraineeModal({ classId, assignedIds, onSave, onClose }) {
  const [trainees, setTrainees] = useState([]);
  const [saving, setSaving] = useState(null);

  useEffect(() => { api.getTrainees().then(setTrainees); }, []);

  const toggle = async (userId, isAssigned) => {
    setSaving(userId);
    try {
      if (isAssigned) {
        await api.removeTrainee(classId, userId);
      } else {
        await api.assignTrainee(classId, userId);
      }
      onSave();
    } finally {
      setSaving(null);
    }
  };

  const assignedSet = new Set(assignedIds);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Manage Trainees</div>
        {trainees.length === 0 ? (
          <div className="empty"><div className="empty-sub">No trainees found. Create trainees first.</div></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {trainees.map(t => {
              const assigned = assignedSet.has(t.id);
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: assigned ? 'rgba(40,167,69,.12)' : 'rgba(13,33,55,.4)', borderRadius: 8, border: `1.5px solid ${assigned ? 'var(--ok)' : 'var(--bdr)'}` }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t.email}</div>
                  </div>
                  <button
                    className={`btn btn-sm ${assigned ? 'btn-bad' : 'btn-ok'}`}
                    onClick={() => toggle(t.id, assigned)}
                    disabled={saving === t.id}
                  >
                    {saving === t.id ? '…' : assigned ? 'Remove' : 'Assign'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="modal-footer">
          <button className="btn btn-pri" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

function ProgressModal({ classId, onClose }) {
  const [data, setData] = useState(null);

  useEffect(() => { api.getClassProgress(classId).then(setData); }, [classId]);

  if (!data) return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal"><p style={{ textAlign: 'center', color: 'var(--muted)' }}>Loading…</p></div>
    </div>
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">Trainee Progress</div>
        {data.trainees.length === 0 ? (
          <div className="empty"><div className="empty-sub">No trainees assigned yet.</div></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Trainee</th>
                  {data.modules.map(m => (
                    <th key={m.id} style={{ fontSize: 10, whiteSpace: 'nowrap' }}>{TYPE_ICONS[m.type]} {m.title}</th>
                  ))}
                  <th>Overall</th>
                </tr>
              </thead>
              <tbody>
                {data.trainees.map(t => {
                  const done = t.modules.filter(m => m.progress?.status === 'completed').length;
                  return (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{t.name}</td>
                      {t.modules.map(m => (
                        <td key={m.id} style={{ textAlign: 'center' }}>
                          {m.progress?.status === 'completed' ? (
                            <span className="badge b-ok">✓{m.progress.score != null ? ` ${m.progress.score}` : ''}</span>
                          ) : (
                            <span className="badge b-gray">—</span>
                          )}
                        </td>
                      ))}
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${done === data.modules.length ? 'b-ok' : 'b-warn'}`}>
                          {done}/{data.modules.length}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="modal-footer">
          <button className="btn btn-pri" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function SortableModule({ mod, onEdit, onDelete, token }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: mod.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? .5 : 1 };

  const openSlideEditor = () => {
    const url = `/slideplayer/?mode=editor&moduleId=${mod.id}&token=${encodeURIComponent(token)}&title=${encodeURIComponent(mod.title)}`;
    window.open(url, `slide-editor-${mod.id}`, 'width=1280,height=800,menubar=no,toolbar=no');
  };

  return (
    <div ref={setNodeRef} style={style} className="module-item">
      <div className="drag-handle" {...attributes} {...listeners} title="Drag to reorder">⠿</div>
      <div className={`module-icon ${mod.type}`}>{TYPE_ICONS[mod.type] || '📦'}</div>
      <div className="module-info">
        <div className="module-title">{mod.title}</div>
        <div className="module-sub">{TYPE_LABELS[mod.type] || mod.type}{mod.description ? ` · ${mod.description}` : ''}</div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {mod.type === 'slide_deck' && (
          <button className="btn btn-ghost btn-sm" onClick={openSlideEditor} title="Open slide editor">🖼️ Edit Slides</button>
        )}
        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onEdit(mod)}>✏️</button>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onDelete(mod)}>🗑️</button>
      </div>
    </div>
  );
}

export default function AdminClassDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('tgs_token') || '';
  const [cls, setCls] = useState(null);
  const [modules, setModules] = useState([]);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [editMod, setEditMod] = useState(null);
  const [showTraineeModal, setShowTraineeModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [tab, setTab] = useState('modules');

  const sensors = useSensors(useSensor(PointerSensor));

  const load = useCallback(() => {
    api.getClass(id).then(data => {
      setCls(data);
      setModules(data.modules.sort((a, b) => a.sequence_order - b.sequence_order));
    });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIdx = modules.findIndex(m => m.id === active.id);
    const newIdx = modules.findIndex(m => m.id === over.id);
    const reordered = arrayMove(modules, oldIdx, newIdx).map((m, i) => ({ ...m, sequence_order: i + 1 }));
    setModules(reordered);
    await api.reorderModules(reordered.map(m => ({ id: m.id, sequence_order: m.sequence_order })));
  };

  const handleDeleteModule = async (mod) => {
    if (!confirm(`Delete module "${mod.title}"?`)) return;
    await api.deleteModule(mod.id);
    load();
  };

  if (!cls) return <div className="page-content" style={{ color: 'var(--muted)' }}>Loading…</div>;

  return (
    <>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/classes')}>← Back</button>
          <div className="topbar-title">{cls.name}</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setShowProgressModal(true)}>📊 Progress</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowTraineeModal(true)}>👥 Trainees</button>
          <button className="btn btn-pri btn-sm" onClick={() => { setEditMod(null); setShowModuleModal(true); }}>+ Add Module</button>
        </div>
      </div>

      <div className="page-content">
        {cls.description && (
          <div className="info-box" style={{ marginBottom: 20 }}>{cls.description}</div>
        )}

        <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid var(--bdr)' }}>
          {[['modules', `📦 Modules (${modules.length})`], ['trainees', `👥 Trainees (${cls.trainees.length})`]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{ padding: '8px 20px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: tab === key ? 'var(--blue)' : 'var(--muted)', borderBottom: `2px solid ${tab === key ? 'var(--blue)' : 'transparent'}`, marginBottom: -2, fontFamily: 'inherit' }}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'modules' && (
          <>
            {modules.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">📦</div>
                <div className="empty-text">No modules yet</div>
                <div className="empty-sub">Add videos, assessments, or reading material to this class</div>
                <button className="btn btn-pri" style={{ marginTop: 16 }} onClick={() => setShowModuleModal(true)}>Add First Module</button>
              </div>
            ) : (
              <>
                <div className="warn-box">Drag modules to reorder. Trainees must complete them in sequence.</div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={modules.map(m => m.id)} strategy={verticalListSortingStrategy}>
                    <div className="module-list">
                      {modules.map((mod, idx) => (
                        <div key={mod.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 24, textAlign: 'center', fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>{idx + 1}</div>
                          <div style={{ flex: 1 }}>
                            <SortableModule mod={mod} onEdit={m => { setEditMod(m); setShowModuleModal(true); }} onDelete={handleDeleteModule} token={token} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </>
            )}
          </>
        )}

        {tab === 'trainees' && (
          <>
            {cls.trainees.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">👥</div>
                <div className="empty-text">No trainees assigned</div>
                <div className="empty-sub">Assign trainees to this class so they can access the content</div>
                <button className="btn btn-pri" style={{ marginTop: 16 }} onClick={() => setShowTraineeModal(true)}>Assign Trainees</button>
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Progress</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cls.trainees.map(t => {
                      const pct = t.totalModules > 0 ? Math.round((t.completedModules / t.totalModules) * 100) : 0;
                      return (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 600 }}>{t.name}</td>
                          <td style={{ color: 'var(--muted)' }}>{t.email}</td>
                          <td style={{ minWidth: 160 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div className="pbar" style={{ flex: 1 }}>
                                <div className={`pfill${pct === 100 ? ' ok' : ''}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{t.completedModules}/{t.totalModules}</span>
                            </div>
                          </td>
                          <td>
                            <button className="btn btn-bad btn-sm" onClick={async () => {
                              if (!confirm(`Remove ${t.name} from this class?`)) return;
                              await api.removeTrainee(cls.id, t.id);
                              load();
                            }}>Remove</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {showModuleModal && (
        <ModuleFormModal
          classId={id}
          mod={editMod}
          onSave={() => { setShowModuleModal(false); load(); }}
          onClose={() => setShowModuleModal(false)}
        />
      )}

      {showTraineeModal && (
        <AssignTraineeModal
          classId={id}
          assignedIds={cls.trainees.map(t => t.id)}
          onSave={load}
          onClose={() => { setShowTraineeModal(false); load(); }}
        />
      )}

      {showProgressModal && (
        <ProgressModal classId={id} onClose={() => setShowProgressModal(false)} />
      )}
    </>
  );
}
