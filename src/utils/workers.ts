import type { Worker } from '../types';

export type WorkerSaveMode = 'add' | 'edit';
export type WorkerSaveResult = 'success' | 'empty-name' | 'invalid-wage' | 'duplicate-id' | 'invalid-id' | 'not-found';

export interface WorkerSaveOutcome {
  result: WorkerSaveResult;
  workers: Worker[];
}

export function saveWorkerRecord(
  workers: Worker[],
  candidate: Worker,
  mode: WorkerSaveMode,
): WorkerSaveOutcome {
  if (!candidate.id.trim()) return { result: 'invalid-id', workers };
  if (!candidate.name.trim()) return { result: 'empty-name', workers };
  if (!Number.isFinite(candidate.dailyWage) || candidate.dailyWage < 0) {
    return { result: 'invalid-wage', workers };
  }

  const exists = workers.some((worker) => worker.id === candidate.id);
  if (mode === 'add' && exists) return { result: 'duplicate-id', workers };
  if (mode === 'edit' && !exists) return { result: 'not-found', workers };

  const savedWorker = { ...candidate, name: candidate.name.trim() };
  const nextWorkers = mode === 'add'
    ? [...workers, savedWorker]
    : workers.map((worker) => worker.id === candidate.id ? savedWorker : worker);
  const ids = new Set<string>();

  for (const worker of nextWorkers) {
    if (ids.has(worker.id)) return { result: 'duplicate-id', workers };
    ids.add(worker.id);
  }

  return { result: 'success', workers: nextWorkers };
}