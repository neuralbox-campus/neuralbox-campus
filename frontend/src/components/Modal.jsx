export default function Modal({ title, onClose, children }) {
  return (
    <div className="nx-modal-overlay" onClick={onClose}>
      <div className="nx-modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="nx-modal-title">{title}</div>
          <button className="nx-btn nx-btn-ghost nx-btn-xs" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
