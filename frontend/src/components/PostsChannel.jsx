import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi, useMutation } from '../hooks/useApi';

const reactionMap = { fire: '🔥', heart: '❤️', brain: '🧠', rocket: '🚀', clap: '👏' };

export default function PostsChannel({ channelSlug, title, subtitle, allowGuestPost }) {
  const { isAdmin, isGuest, user } = useAuth();
  const { data: postsData, loading, refetch } = useApi(`/community/channels/${channelSlug}/posts`);
  const posts = postsData?.posts || (Array.isArray(postsData) ? postsData : []);
  const [nc, setNc] = useState('');
  const [nt, setNt] = useState('text');
  const [np, setNp] = useState('');
  const [nImg, setNImg] = useState('');
  const [nLink, setNLink] = useState('');
  const [eid, setEid] = useState(null);
  const [ec, setEc] = useState('');
  const [cop, setCop] = useState(null);
  const { mutate: create } = useMutation('POST');
  const { mutate: remove } = useMutation('DELETE');
  const { mutate: react } = useMutation('POST');

  const canPost = isAdmin || (allowGuestPost && !isGuest);

  const pub = async () => {
    if (!nc) return;
    await create(`/community/channels/${channelSlug}/posts`, {
      content: nc, type: nt, promptText: nt === 'prompt' ? np : null,
      imageUrl: nImg || null, linkUrl: nLink || null,
    });
    setNc(''); setNp(''); setNImg(''); setNLink(''); setNt('text');
    refetch();
  };

  const cp = (t) => { navigator.clipboard?.writeText(t); setCop(t); setTimeout(() => setCop(null), 1500); };

  const doReact = async (postId, type) => {
    await react('/community/reactions', { postId, type });
    refetch();
  };

  return (
    <div>
      <div className="tt fi">{title}</div>
      <div className="st fi">{subtitle}</div>

      {canPost && (
        <div className="nx-card fi" style={{ marginBottom: 10 }}>
          <div className="nx-section-label" style={{ marginBottom: 6 }}>PUBLICAR</div>
          {isAdmin && (
            <div className="nx-pub-bar">
              <div className={`nx-pub-tool ${nt === 'text' ? 'active' : ''}`} onClick={() => setNt('text')}>📝 Texto</div>
              <div className={`nx-pub-tool ${nt === 'prompt' ? 'active' : ''}`} onClick={() => setNt('prompt')}>🧠 Prompt</div>
              <div className={`nx-pub-tool ${nt === 'media' ? 'active' : ''}`} onClick={() => setNt('media')}>📷 Imagen/Video</div>
            </div>
          )}
          <textarea className="nx-textarea" value={nc} onChange={e => setNc(e.target.value)} placeholder="Escribe..." style={{ marginBottom: 6 }} />
          {nt === 'prompt' && isAdmin && (
            <textarea className="nx-textarea" value={np} onChange={e => setNp(e.target.value)}
              placeholder="Prompt copiable..." style={{ marginBottom: 6, fontFamily: 'var(--font-mono)', fontSize: 10 }} />
          )}
          {nt === 'media' && isAdmin && (
            <div style={{ marginBottom: 6 }}>
              <input className="nx-input" value={nImg} onChange={e => setNImg(e.target.value)}
                placeholder="URL de imagen o video (https://...)" style={{ marginBottom: 4 }} />
              {nImg && <img src={nImg} alt="" style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 'var(--r-md)', border: '1px solid var(--border-main)' }}
                onError={e => { e.target.style.display = 'none'; }} />}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {isAdmin && <input className="nx-input" value={nLink} onChange={e => setNLink(e.target.value)} placeholder="🔗 Enlace (opcional)" style={{ flex: 1, minWidth: 140 }} />}
            <button className="nx-btn nx-btn-primary nx-btn-sm" onClick={pub}>Publicar ✦</button>
          </div>
        </div>
      )}

      {loading && <div className="nx-loading-sm">Cargando...</div>}

      {posts.map(p => (
        <div key={p.id} className={`nx-post fi ${p.isPinned ? 'pinned' : ''}`}>
          <div className="nx-post-header">
            <div className="nx-post-av">{p.user?.avatar || '👤'}</div>
            <span className="nx-post-name">{p.user?.name || 'User'}</span>
            <span className={`nx-post-role-tag ${p.user?.role === 'ADMIN' ? 'bg-y' : 'bg-d'}`}>
              {p.user?.role === 'ADMIN' ? 'Cuántico' : 'Sinapsis'}
            </span>
            {p.isPinned && <span style={{ fontFamily: 'var(--font-display)', fontSize: 6, letterSpacing: 2, color: 'var(--brand)' }}>📌</span>}
            <span className="nx-post-time">{new Date(p.createdAt).toLocaleDateString('es')}</span>
            {isAdmin && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
                <button className="nx-btn nx-btn-ghost nx-btn-xs" onClick={() => { setEid(p.id); setEc(p.content); }}>✏️</button>
                <button className="nx-btn nx-btn-danger nx-btn-xs" onClick={async () => { await remove(`/community/posts/${p.id}`); refetch(); }}>🗑</button>
              </div>
            )}
          </div>

          {eid === p.id ? (
            <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
              <textarea className="nx-textarea" value={ec} onChange={e => setEc(e.target.value)} style={{ flex: 1, minHeight: 36 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button className="nx-btn nx-btn-accent nx-btn-xs" onClick={async () => {
                  await create(`/community/posts/${p.id}`, { content: ec });
                  setEid(null); refetch();
                }}>✓</button>
                <button className="nx-btn nx-btn-ghost nx-btn-xs" onClick={() => setEid(null)}>✕</button>
              </div>
            </div>
          ) : (
            <div className="nx-post-content">{p.content}</div>
          )}

          {p.imageUrl && <img src={p.imageUrl} alt="" className="nx-post-img" onError={e => { e.target.style.display = 'none'; }} />}

          <div className="nx-post-actions">
            {Object.entries(reactionMap).map(([type, emoji]) => {
              const count = p.reactionCounts?.[type] || 0;
              const active = p.userReactions?.includes(type);
              return (
                <div key={type} className={`nx-reaction ${active ? 'active' : ''}`} onClick={() => doReact(p.id, type)}>
                  <span>{emoji}</span>{count > 0 && <span className="ct">{count}</span>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
