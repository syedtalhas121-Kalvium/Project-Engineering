const createProfilerStore = () => ({
  initial: null,
  lastUpdate: null,
  rowRenders: 0,
});

export const getProfilerStore = () => {
  if (typeof window === 'undefined') return null;
  if (!window.__txnProfiler) {
    window.__txnProfiler = createProfilerStore();
  }
  return window.__txnProfiler;
};

export const resetRowRenderCount = () => {
  const store = getProfilerStore();
  if (store) store.rowRenders = 0;
};

export const recordRowRender = () => {
  const store = getProfilerStore();
  if (store) store.rowRenders += 1;
};

export const recordProfilerCommit = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime,
) => {
  const store = getProfilerStore();
  if (!store) return;

  const commit = {
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime,
    rowRenders: store.rowRenders,
  };

  if (phase === 'mount' && !store.initial) {
    store.initial = commit;
  } else if (phase === 'update') {
    store.lastUpdate = commit;
  }

  window.dispatchEvent(new CustomEvent('txn-profiler-update'));
};
