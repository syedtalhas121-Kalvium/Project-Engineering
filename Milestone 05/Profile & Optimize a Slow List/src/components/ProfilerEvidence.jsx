import React, { useEffect, useState } from 'react';
import { getProfilerStore } from '../utils/profiler';

const formatDuration = (value) => (
  typeof value === 'number' ? `${value.toFixed(4)} ms` : '—'
);

const ProfilerEvidence = () => {
  const [store, setStore] = useState(() => getProfilerStore());

  useEffect(() => {
    const refresh = () => setStore({ ...getProfilerStore() });
    window.addEventListener('txn-profiler-update', refresh);
    refresh();

    const query = new URLSearchParams(window.location.search).get('profile');
    if (query) {
      const timer = window.setTimeout(() => {
        if (window.__txnProfileTriggered) return;
        window.__txnProfileTriggered = true;
        if (typeof window.__txnSetFilter === 'function') {
          window.__txnSetFilter(query);
        }
      }, 700);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener('txn-profiler-update', refresh);
      };
    }

    return () => window.removeEventListener('txn-profiler-update', refresh);
  }, []);

  const initial = store?.initial;
  const update = store?.lastUpdate;

  return (
    <section className="mb-8 rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-xl" data-testid="profiler-evidence">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">React Profiler evidence</p>
          <h2 className="mt-1 text-xl font-extrabold">Baseline and interaction measurements</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-300">
            These values are captured from the production React Profiler callback for this session. Type one character in the search box to record the interaction row.
          </p>
        </div>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">Evidence capture</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Initial render</p>
          <p className="mt-2 text-2xl font-black text-cyan-300">{formatDuration(initial?.actualDuration)}</p>
          <p className="mt-1 text-xs text-slate-400">React Profiler mount commit</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Last search interaction</p>
          <p className="mt-2 text-2xl font-black text-emerald-300">{formatDuration(update?.interactionDuration ?? update?.actualDuration)}</p>
          <p className="mt-1 text-xs text-slate-400">Update commit after typing</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Row renders in interaction</p>
          <p className="mt-2 text-2xl font-black text-amber-300">{update?.rowRenders ?? '—'}</p>
          <p className="mt-1 text-xs text-slate-400">Rows rendered during the last commit</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current list DOM rows</p>
          <p className="mt-2 text-2xl font-black text-fuchsia-300">{document.querySelectorAll('[data-transaction-row]').length}</p>
          <p className="mt-1 text-xs text-slate-400">Measured live from rendered row elements</p>
        </div>
      </div>
    </section>
  );
};

export default ProfilerEvidence;
