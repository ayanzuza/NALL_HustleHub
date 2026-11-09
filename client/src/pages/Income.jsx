import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage, isUnauthorised } from '../api';
import NavBar from '../components/NavBar';

const money = (value) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(value || 0));
const STATUS_LABELS = ['pending', 'approved', 'completed', 'rejected', 'cancelled'];

function Metric({ label, value, detail }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-sm font-medium text-slate-500">{label}</p>
    <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
    {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
  </article>;
}

function MonthlyChart({ months }) {
  const max = Math.max(1, ...months.map((m) => Number(m.income || 0)));
  const hasIncome = months.some((m) => Number(m.income) > 0);
  if (!hasIncome) return <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600">No recorded income in this tax year yet. Approved bookings will appear here.</p>;
  return <div className="overflow-x-auto" role="img" aria-label="Monthly income bar chart in South African rand">
    <svg className="min-w-[560px]" viewBox="0 0 600 210" width="100%" height="210" role="presentation" aria-hidden="true">
      <line x1="4" y1="170" x2="596" y2="170" stroke="#cbd5e1" strokeWidth="1" />
      {months.map((m, index) => {
        const amount = Number(m.income || 0);
        const height = amount ? Math.max(3, (amount / max) * 130) : 0;
        const x = index * 50 + 10;
        const label = new Date(`${m.month}-01T12:00:00`).toLocaleDateString('en-ZA', { month: 'short' });
        return <g key={m.month}>
          <rect x={x} y={170 - height} width="30" height={height} rx="4" fill="#6366f1"><title>{`${label}: ${money(amount)}`}</title></rect>
          <text x={x + 15} y="194" textAnchor="middle" fontSize="11" fill="#475569">{label}</text>
        </g>;
      })}
    </svg>
  </div>;
}

export default function Income() {
  const [income, setIncome] = useState(null);
  const [tax, setTax] = useState(null);
  const [taxYear, setTaxYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = useCallback(async (year) => {
    setLoading(true);
    setError('');
    try {
      const [incomeResponse, taxResponse] = await Promise.all([
        api.get('/income'),
        api.get('/income/tax', year ? { params: { taxYear: year } } : undefined),
      ]);
      setIncome(incomeResponse.data.data);
      setTax(taxResponse.data.data);
      setTaxYear(String(taxResponse.data.data.taxYear));
    } catch (err) {
      if (isUnauthorised(err)) navigate('/login');
      else setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [navigate]);

 useEffect(() => {
  let cancelled = false;

  const fetchInitialData = async () => {
    try {
      const [incomeResponse, taxResponse] = await Promise.all([
        api.get('/income'),
        api.get('/income/tax'),
      ]);

      if (!cancelled) {
        setIncome(incomeResponse.data.data);
        setTax(taxResponse.data.data);
        setTaxYear(String(taxResponse.data.data.taxYear));
      }
    } catch (err) {
      if (!cancelled) {
        if (isUnauthorised(err)) {
          navigate('/login');
        } else {
          setError(errorMessage(err));
        }
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  };

  fetchInitialData();

  return () => {
    cancelled = true;
  };
}, [navigate]);

  const statuses = useMemo(() => income?.bookingStatusCounts || {}, [income]);
  const hasData = Boolean(income && tax);

  return <div className="min-h-screen bg-slate-50">
    <NavBar />
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Freelancer workspace</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Income &amp; tax overview</h1><p className="mt-2 text-sm text-slate-600">A clear view of your recorded earnings and booking activity.</p></div>
        {hasData && <label className="text-sm font-medium text-slate-700">Tax year <select aria-label="Tax year" className="ml-2 rounded-lg border border-slate-300 bg-white px-3 py-2" value={taxYear} onChange={(e) => load(e.target.value)} disabled={loading}>{tax.availableTaxYears.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>}
      </header>

      {loading && <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600" role="status">Loading your income dashboard…</div>}
      {error && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert"><span>{error}</span><button onClick={() => load(taxYear || undefined)} className="rounded-lg border border-rose-300 px-3 py-2 font-semibold hover:bg-rose-100">Try again</button></div>}

      {!loading && !error && hasData && <>
        <section aria-label="Income summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Total recorded income" value={money(income.totalIncome)} detail={`${income.transactionCount} approved payment(s), all time`} />
          <Metric label="Tax-year gross income" value={money(tax.grossIncome)} detail={`For tax year ${tax.taxYear}`} />
          <Metric label="Estimated tax" value={money(tax.estimatedTax)} detail={`${tax.effectiveTaxRate}% effective rate`} />
          <Metric label="Estimated net income" value={money(tax.netIncome)} detail="After estimated income tax" />
          <Metric label="Awaiting approval" value={money(income.pendingIncome)} detail="Requests are not counted as income" />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5"><h2 className="text-lg font-bold text-slate-900">Income over time</h2><p className="text-sm text-slate-500">Monthly recorded income for tax year {tax.taxYearLabel}.</p></div>
          <MonthlyChart months={tax.monthly || []} />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">Bookings by status</h2><p className="mb-4 text-sm text-slate-500">A count of booking requests associated with your gigs.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {STATUS_LABELS.map((status) => <div key={status} className="rounded-xl bg-slate-50 p-4"><p className="text-sm capitalize text-slate-500">{status}</p><p className="mt-1 text-2xl font-bold text-slate-900">{statuses[status] || 0}</p></div>)}
          </div>
          {Object.values(statuses).every((count) => count === 0) && <p className="mt-4 text-sm text-slate-600">No bookings yet. Your booking activity will appear here.</p>}
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
          <h2 className="font-bold">Tax estimate — please read</h2><p className="mt-1">This is an estimate, not tax advice or a SARS assessment. It assumes you are under 65, have no other income and claim no deductions or additional credits.</p>
          <p className="mt-2">{(tax.assumptions || []).join(' ')}</p>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Recent recorded payments</h2>
          {income.transactions?.length ? <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Amount</th><th className="py-2">Status</th></tr></thead><tbody>{income.transactions.slice(0, 8).map((t) => <tr key={t.id} className="border-b last:border-0"><td className="py-3 pr-3">{new Date(t.createdAt).toLocaleDateString('en-ZA')}</td><td className="py-3 pr-3 font-medium">{money(t.amount)}</td><td className="py-3">Simulated payment</td></tr>)}</tbody></table></div> : <p className="mt-3 text-sm text-slate-600">No payments recorded yet. Income is added when you approve a booking.</p>}
        </section>
      </>}
    </main>
  </div>;
}
