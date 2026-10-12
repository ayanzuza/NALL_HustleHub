import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage, isUnauthorised } from '../api';
import NavBar from '../components/NavBar';

export const CATEGORIES = ['design', 'development', 'writing', 'marketing', 'video', 'audio', 'business', 'other'];
const EMPTY = { title: '', description: '', category: 'development', price: '' };
const input = 'w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none';

export default function MyGigs() {
  const [gigs, setGigs] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fail = (err) => (isUnauthorised(err) ? navigate('/login') : setError(errorMessage(err)));
  const load = () => api.get('/gigs/mine').then((res) => setGigs(res.data.data.gigs)).catch(fail);
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/gigs', { ...form, price: Number(form.price) });
      setForm(EMPTY);
      await load();
    } catch (err) { fail(err); }
  };

  const toggle = async (g) => {
    setError('');
    try {
      await api.put(`/gigs/${g.id}`, { status: g.status === 'active' ? 'paused' : 'active' });
      await load();
    } catch (err) { fail(err); }
  };

  const remove = async (g) => {
    setError('');
    try {
      await api.delete(`/gigs/${g.id}`);
      await load();
    } catch (err) { fail(err); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">My Gigs</h1>
        {error && <div role="alert" className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded-lg">{error}</div>}

        <form onSubmit={create} className="bg-white rounded-xl shadow-sm border p-6 space-y-4 max-w-lg mb-8">
          <h2 className="text-lg font-bold text-gray-800">Create a gig</h2>
          <div>
            <label htmlFor="gig-title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input id="gig-title" className={input} value={form.title} required onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label htmlFor="gig-desc" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea id="gig-desc" rows="3" className={input} value={form.description} required onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label htmlFor="gig-cat" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select id="gig-cat" className={`${input} bg-white`} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="gig-price" className="block text-sm font-medium text-gray-700 mb-1">Price (ZAR)</label>
            <input id="gig-price" type="number" min="1" className={input} value={form.price} required onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-lg transition">Create gig</button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gigs.map((g) => (
            <div key={g.id} className="bg-white rounded-xl shadow-sm border p-6">
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">{g.category}</span>
              <h3 className="text-lg font-bold text-gray-800 mt-3">{g.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{g.description}</p>
              <p className="mt-3 font-bold">R{g.price} <span className="text-xs font-normal text-gray-500">· {g.status}</span></p>
              <div className="mt-4 flex gap-2">
                <button onClick={() => toggle(g)} className="border px-3 py-1.5 rounded-lg text-sm hover:bg-gray-100">{g.status === 'active' ? 'Pause' : 'Activate'}</button>
                <button onClick={() => remove(g)} className="border border-red-300 text-red-700 px-3 py-1.5 rounded-lg text-sm hover:bg-red-50">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
