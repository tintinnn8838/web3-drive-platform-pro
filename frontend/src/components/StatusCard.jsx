export default function StatusCard({ label, value, hint }) {
  return (
    <div className="status-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}
