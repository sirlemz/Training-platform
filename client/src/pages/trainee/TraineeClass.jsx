import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api';

const TYPE_ICONS = { video: '🎬', assessment: '📋', text: '📄' };
const TYPE_LABELS = { video: 'Video', assessment: 'Assessment', text: 'Reading' };

function VideoPlayer({ module: mod, onComplete }) {
  const [watched, setWatched] = useState(mod.progress?.status === 'completed');
  const [marking, setMarking] = useState(false);
  const videoRef = useRef(null);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const { currentTime, duration } = videoRef.current;
    if (duration > 0 && currentTime / duration > 0.9 && !watched) {
      setWatched(true);
    }
  };

  const markComplete = async () => {
    setMarking(true);
    try {
      await api.saveProgress(mod.id, { status: 'completed' });
      onComplete();
    } finally {
      setMarking(false);
    }
  };

  return (
    <div>
      <div className="video-wrap">
        <video
          ref={videoRef}
          controls
          src={`/uploads/${mod.content}`}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setWatched(true)}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          {mod.progress?.status === 'completed'
            ? '✅ You have completed this video. You can re-watch it anytime.'
            : 'Watch the video then mark it as complete to unlock the next module.'}
        </div>
        {mod.progress?.status !== 'completed' && (
          <button className="btn btn-ok" onClick={markComplete} disabled={marking}>
            {marking ? 'Saving…' : '✓ Mark as Complete'}
          </button>
        )}
      </div>
    </div>
  );
}

function TextReader({ module: mod, onComplete }) {
  const [marking, setMarking] = useState(false);

  const markComplete = async () => {
    setMarking(true);
    try {
      await api.saveProgress(mod.id, { status: 'completed' });
      onComplete();
    } finally {
      setMarking(false);
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 16, lineHeight: 1.7, fontSize: 14 }} dangerouslySetInnerHTML={{ __html: mod.content || '<p style="color:var(--muted)">No content provided.</p>' }} />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {mod.progress?.status === 'completed' ? (
          <span className="badge b-ok" style={{ fontSize: 13, padding: '6px 14px' }}>✅ Completed</span>
        ) : (
          <button className="btn btn-ok" onClick={markComplete} disabled={marking}>
            {marking ? 'Saving…' : '✓ Mark as Read'}
          </button>
        )}
      </div>
    </div>
  );
}

function AssessmentPlayer({ module: mod, user, onComplete }) {
  const [done, setDone] = useState(mod.progress?.status === 'completed');
  const [scoreData, setScoreData] = useState(mod.progress?.score_data ? JSON.parse(mod.progress.score_data) : null);
  const iframeRef = useRef(null);

  useEffect(() => {
    const handler = async (e) => {
      if (e.data?.type !== 'tgs-assessment-complete') return;
      const data = e.data;
      const score = data.overall?.weighted ?? null;
      try {
        await api.saveProgress(mod.id, {
          status: 'completed',
          score,
          score_data: { overall: data.overall, a1: data.a1, a2: data.a2, a3: data.a3, a4: data.a4 }
        });
        setScoreData({ overall: data.overall });
        setDone(true);
        onComplete();
      } catch (err) {
        console.error('Failed to save assessment progress', err);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [mod.id, onComplete]);

  const src = `/assessment/assessment.html?platform=1&tname=${encodeURIComponent(user.name)}&temail=${encodeURIComponent(user.email)}`;

  if (done) {
    const overall = scoreData?.overall;
    const tierMap = {
      priority: { label: '✦ Priority Hire', cls: 'b-ok' },
      recommended: { label: 'Recommended Hire', cls: 'b-ok' },
      conditional: { label: 'Conditional Hire', cls: 'b-warn' },
      not_recommended: { label: 'Not Recommended', cls: 'b-bad' },
      pending: { label: 'Pending Review', cls: 'b-gray' }
    };
    const tier = tierMap[overall?.decision] || { label: 'Submitted', cls: 'b-info' };
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--pri)', marginBottom: 8 }}>Assessment Submitted</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>You have completed the TGS BPO Pre-Hire Assessment. One attempt only — no retakes.</div>
        {overall && (
          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            {overall.weighted != null && (
              <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--pri)' }}>{overall.weighted}<span style={{ fontSize: 16, color: 'var(--muted)' }}>/100</span></div>
            )}
            <span className={`badge ${tier.cls}`} style={{ fontSize: 14, padding: '6px 16px' }}>{tier.label}</span>
            {overall.pendingA3 && <div className="warn-box" style={{ marginTop: 10 }}>Communication score pending assessor review.</div>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="warn-box">This is a one-attempt assessment. Once submitted, you cannot retake it.</div>
      <iframe ref={iframeRef} src={src} className="assessment-frame" title="TGS Pre-Hire Assessment" allow="fullscreen" />
    </div>
  );
}

export default function TraineeClass() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cls, setCls] = useState(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const load = useCallback(() => {
    api.myClass(id).then(data => {
      setCls(data);
      // Set active to first incomplete or last completed
      const firstIncomplete = data.modules.findIndex(m => m.unlocked && m.progress?.status !== 'completed');
      setActiveIdx(firstIncomplete >= 0 ? firstIncomplete : data.modules.length - 1);
    });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (!cls) return <div className="page-content" style={{ color: 'var(--muted)' }}>Loading…</div>;

  const activeMod = cls.modules[activeIdx];
  const allDone = cls.modules.every(m => m.progress?.status === 'completed');

  return (
    <>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/my')}>← Back</button>
          <div className="topbar-title">{cls.name}</div>
        </div>
        {allDone && (
          <button className="btn btn-ok btn-sm" onClick={() => navigate(`/my/classes/${id}/certificate`)}>
            🏆 View Certificate
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 0, flex: 1, minHeight: 'calc(100vh - 61px)' }}>
        {/* Module sidebar */}
        <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid var(--bdr)', background: '#fff', padding: 16, overflowY: 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>
            Modules — {cls.modules.filter(m => m.progress?.status === 'completed').length}/{cls.modules.length} done
          </div>
          <div className="pbar" style={{ marginBottom: 16 }}>
            <div className="pfill ok" style={{ width: `${cls.modules.length > 0 ? Math.round((cls.modules.filter(m => m.progress?.status === 'completed').length / cls.modules.length) * 100) : 0}%` }} />
          </div>
          {cls.modules.map((mod, idx) => {
            const isActive = idx === activeIdx;
            const isDone = mod.progress?.status === 'completed';
            const isLocked = !mod.unlocked;
            return (
              <div
                key={mod.id}
                onClick={() => !isLocked && setActiveIdx(idx)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8,
                  marginBottom: 4, cursor: isLocked ? 'not-allowed' : 'pointer',
                  background: isActive ? '#eff6ff' : 'transparent',
                  border: `1.5px solid ${isActive ? 'var(--blue)' : 'transparent'}`,
                  opacity: isLocked ? .5 : 1,
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, background: isDone ? '#dcfce7' : isActive ? '#dbeafe' : '#f1f5f9', flexShrink: 0 }}>
                  {isLocked ? '🔒' : isDone ? '✅' : TYPE_ICONS[mod.type]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--blue)' : 'var(--txt)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {idx + 1}. {mod.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{TYPE_LABELS[mod.type]}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Module content */}
        <div style={{ flex: 1, padding: 24, overflowY: 'auto', background: 'var(--bg)' }}>
          {activeMod ? (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 20 }}>{TYPE_ICONS[activeMod.type]}</span>
                  <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--pri)' }}>{activeMod.title}</h1>
                </div>
                {activeMod.description && <p style={{ fontSize: 13, color: 'var(--muted)' }}>{activeMod.description}</p>}
              </div>

              {!activeMod.unlocked ? (
                <div className="warn-box">Complete the previous module to unlock this one.</div>
              ) : activeMod.type === 'video' ? (
                <VideoPlayer key={activeMod.id} module={activeMod} onComplete={load} />
              ) : activeMod.type === 'text' ? (
                <TextReader key={activeMod.id} module={activeMod} onComplete={load} />
              ) : activeMod.type === 'assessment' ? (
                <AssessmentPlayer key={activeMod.id} module={activeMod} user={user} onComplete={load} />
              ) : null}
            </>
          ) : (
            <div className="empty"><div className="empty-sub">Select a module from the list.</div></div>
          )}
        </div>
      </div>
    </>
  );
}
