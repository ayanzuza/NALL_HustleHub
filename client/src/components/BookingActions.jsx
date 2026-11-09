import { useState } from 'react';
import api, { errorMessage, isUnauthorised } from '../api';

export default function BookingActions({ booking, role, onUpdated, onUnauthorised }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = booking.status === 'pending';
  const actions = role === 'freelancer'
    ? (pending ? [{ action: 'approve', label: 'Approve', style: 'bg-emerald-600 hover:bg-emerald-700' }, { action: 'reject', label: 'Decline', style: 'bg-rose-600 hover:bg-rose-700' }] : [])
    : (pending ? [{ action: 'cancel', label: 'Cancel request', style: 'bg-slate-700 hover:bg-slate-800' }] : []);

  const runAction = async (action) => {
    setBusy(true);
    setError('');
    try {
      const response = await api.patch(`/bookings/${booking.id}/${action}`, {});
      onUpdated(response.data.data.booking);
    } catch (err) {
      if (isUnauthorised(err)) onUnauthorised();
      else setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!actions.length) return null;
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2">
      {actions.map(({ action, label, style }) => <button key={action} type="button" disabled={busy} onClick={() => runAction(action)} className={`${style} rounded-lg px-3 py-2 text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}>
        {busy ? 'Please wait…' : label}
      </button>)}
    </div>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
  </div>;
}
