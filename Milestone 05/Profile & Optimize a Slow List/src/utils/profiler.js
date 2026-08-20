const createProfilerStore = () => ({
  initial: null,
  lastUpdate: null,
  rowRenders: 0,
  rowIds: new Set(),
  interactionStart: null,
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
  if (store) {
    store.rowRenders = 0;
    store.rowIds.clear();
    store.lastUpdate = null;
    store.interactionStart = performance.now();
  }
};

export const recordRowRender = (id) => {
  const store = getProfilerStore();
  if (store) {
    store.rowIds.add(id);
    store.rowRenders = store.rowIds.size;
  }
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
    interactionDuration: store.interactionStart === null
      ? actualDuration
      : performance.now() - store.interactionStart,
    rowRenders: store.rowIds.size,
  };

  if (phase === 'mount' && !store.initial) {
    store.initial = commit;
  } else if (phase === 'update' && !store.lastUpdate) {
    store.lastUpdate = commit;
  }

  store.rowRenders = 0;
  store.rowIds.clear();
  window.dispatchEvent(new CustomEvent('txn-profiler-update'));
};
