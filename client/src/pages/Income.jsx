import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage, isUnauthorised } from '../api';
import NavBar from '../components/NavBar';

export default function Income() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get('/income')
      .then((res) => setData(res.data.data))
      .catch((err) => (isUnauthorised(err) ? navigate('/login') : setError(errorMessage(err))));
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Income</h1>
        {error && <div role="alert" className="p-3 bg-red-100 text-red-700 text-sm rounded-lg">{error}</div>}
        {!data && !error && <p className="text-gray-600">Loading…</p>}
        {data && (
          <>
            <p className="text-lg">Total income: <strong>R{Number(data.totalIncome).toFixed(2)}</strong> {data.currency}</p>
            <p className="text-gray-600 mb-4">{data.transactionCount} transaction(s) (simulated)</p>
            <table className="w-full bg-white rounded-xl border">
              <thead><tr><th className="text-left p-2 border-b">Reference</th><th className="text-left p-2 border-b">Amount</th><th className="text-left p-2 border-b">Status</th></tr></thead>
              <tbody>
                {data.transactions.map((t) => (
                  <tr key={t.id}><td className="p-2 border-b">{t.reference}</td><td className="p-2 border-b">R{t.amount}</td><td className="p-2 border-b">{t.status}</td></tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
