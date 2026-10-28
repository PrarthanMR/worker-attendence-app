import { useState, type FormEvent } from 'react';
import { CircleDollarSign, Pencil, UserRoundPlus, UserRoundX } from 'lucide-react';
import { useApp } from '../context/AppContext';
import WorkerIdentity from '../components/WorkerIdentity';
import type { Worker } from '../types';
import { formatCurrency } from '../utils/format';

interface WorkerForm {
  id: string | null;
  name: string;
  dailyWage: string;
}

export default function WorkersPage() {
  const { workers, language, setMessage, saveWorker, setWorkerActive, t } = useApp();
  const [form, setForm] = useState<WorkerForm | null>(null);
  const [formError, setFormError] = useState<'nameRequired' | 'wageInvalid' | 'duplicateWorkerId' | null>(null);
  const activeWorkers = workers.filter((worker) => worker.active);
  const inactiveWorkers = workers.filter((worker) => !worker.active);

  function openNewWorker() {
    setFormError(null);
    setForm({ id: null, name: '', dailyWage: '600' });
  }

  function openWorker(worker: Worker) {
    setFormError(null);
    setForm({ id: worker.id, name: worker.name, dailyWage: String(worker.dailyWage) });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    if (!form.name.trim()) {
      setFormError('nameRequired');
      return;
    }
    const dailyWage = form.dailyWage.trim() === '' ? Number.NaN : Number(form.dailyWage);
    if (!Number.isFinite(dailyWage) || dailyWage < 0) {
      setFormError('wageInvalid');
      return;
    }

    const result = saveWorker({
      id: form.id ?? crypto.randomUUID(),
      name: form.name,
      dailyWage,
      active: form.id ? workers.find((worker) => worker.id === form.id)?.active ?? true : true,
    }, form.id ? 'edit' : 'add');
    if (result === 'empty-name') {
      setFormError('nameRequired');
      return;
    }
    if (result === 'duplicate-id' || result === 'invalid-id' || result === 'not-found') {
      setFormError('duplicateWorkerId');
      return;
    }
    if (result !== 'success') {
      setFormError('wageInvalid');
      return;
    }
    setFormError(null);
    setForm(null);
    setMessage('workerSaved');
  }

  function updateActiveStatus(worker: Worker) {
    if (!window.confirm(t('confirmDeactivate'))) return;
    setWorkerActive(worker.id, !worker.active);
    setMessage('workerStatusUpdated');
  }

  function renderWorker(worker: Worker) {
    return (
      <article className="managed-worker" key={worker.id}>
        <WorkerIdentity name={worker.name} nameTag="h3" className="managed-worker-identity">
          <div className="managed-name-row"><span className={`worker-state ${worker.active ? 'state-active' : 'state-inactive'}`}>{t(worker.active ? 'active' : 'inactive')}</span></div>
          <span className="managed-wage"><CircleDollarSign size={15} aria-hidden="true" />{t('dailyWage')} <strong>{formatCurrency(worker.dailyWage, language)}</strong></span>
        </WorkerIdentity>
        <div className="worker-actions">
          <button className="icon-text-button" onClick={() => openWorker(worker)}><Pencil size={16} aria-hidden="true" /><span>{t('editWorker')}</span></button>
          <button className={`icon-text-button ${worker.active ? 'deactivate-action' : ''}`} onClick={() => updateActiveStatus(worker)}>
            {worker.active ? <UserRoundX size={16} aria-hidden="true" /> : <UserRoundPlus size={16} aria-hidden="true" />}
            <span>{t(worker.active ? 'deactivate' : 'reactivate')}</span>
          </button>
        </div>
      </article>
    );
  }

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div><p className="eyebrow">{activeWorkers.length} · {t('activeWorkers')}</p><h1>{t('workers')}</h1></div>
        <button className="button button-primary" onClick={openNewWorker}><UserRoundPlus size={18} aria-hidden="true" />{t('addWorker')}</button>
      </div>

      {workers.length === 0 ? (
        <div className="empty-state">{t('noWorkers')}</div>
      ) : (
        <>
          <section className="managed-worker-list" aria-label={t('activeWorkers')}>
            {activeWorkers.map(renderWorker)}
            {activeWorkers.length === 0 && <div className="empty-state">{t('noActiveWorkers')}</div>}
          </section>
          {inactiveWorkers.length > 0 && (
            <section className="worker-group">
              <div className="section-heading"><h2>{t('inactive')} <span className="muted-count">{inactiveWorkers.length}</span></h2></div>
              <div className="managed-worker-list inactive-list">{inactiveWorkers.map(renderWorker)}</div>
            </section>
          )}
        </>
      )}

      {form && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setForm(null); }}>
          <section className="worker-dialog" role="dialog" aria-modal="true" aria-labelledby="worker-dialog-title">
            <div className="dialog-heading"><div className="dialog-icon"><UserRoundPlus size={20} aria-hidden="true" /></div><h2 id="worker-dialog-title">{t(form.id ? 'editWorker' : 'addWorker')}</h2></div>
            <form noValidate onSubmit={handleSubmit}>
              <label className="form-field">
                <span>{t('workerName')}</span>
                <input autoFocus maxLength={70} aria-invalid={formError === 'nameRequired' || formError === 'duplicateWorkerId'} value={form.name} onChange={(event) => { setForm({ ...form, name: event.target.value }); setFormError(null); }} />
                {(formError === 'nameRequired' || formError === 'duplicateWorkerId') && <span className="field-error">{t(formError)}</span>}
              </label>
              <label className="form-field">
                <span>{t('wageRupees')}</span>
                <input type="number" min="0" step="0.01" inputMode="decimal" aria-invalid={formError === 'wageInvalid'} value={form.dailyWage} onChange={(event) => { setForm({ ...form, dailyWage: event.target.value }); setFormError(null); }} />
                {formError === 'wageInvalid' && <span className="field-error">{t('wageInvalid')}</span>}
              </label>
              <div className="dialog-actions">
                <button className="button button-secondary" type="button" onClick={() => setForm(null)}>{t('cancel')}</button>
                <button className="button button-primary" type="submit">{t('save')}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}