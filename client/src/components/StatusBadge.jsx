
const styles = {
  pending: 'bg-amber-100 text-amber-800 ring-amber-200',
  approved: 'bg-blue-100 text-blue-800 ring-blue-200',
  completed: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  rejected: 'bg-rose-100 text-rose-800 ring-rose-200',
  cancelled: 'bg-slate-100 text-slate-700 ring-slate-200',
};

export default function StatusBadge({ status }) {
  const value = String(status || 'unknown').toLowerCase();
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${styles[value] || 'bg-gray-100 text-gray-700 ring-gray-200'}`}>{value}</span>;
}
