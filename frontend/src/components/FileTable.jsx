export default function FileTable({ items }) {
  if (!items.length) {
    return <div className="panel empty">Chưa có file nào trên backend mock.</div>;
  }

  return (
    <div className="panel table-panel">
      <div className="table-head">
        <span>Tên file</span>
        <span>Owner</span>
        <span>Blob ID</span>
        <span>On-chain</span>
      </div>
      {items.map((item) => (
        <div className="table-row" key={item.id}>
          <span>{item.fileName}</span>
          <span>{item.owner}</span>
          <span>{item.blobId}</span>
          <span>{item.onChainStatus}</span>
        </div>
      ))}
    </div>
  );
}
