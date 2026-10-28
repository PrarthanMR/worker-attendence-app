import { useRef, useState, type ChangeEvent } from 'react';
import { Archive, Download, FileUp, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { createBackup, decodeBackup, type BackupDocument } from '../utils/backup';
import { formatDate, shiftDate, toDateKey } from '../utils/dates';

export default function BackupPage() {
  const {
    data, archivedAttendance, retainedAttendance, today, language, persistenceLocked,
    importData, archiveOldAttendance, setMessage, t,
  } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<BackupDocument | null>(null);
  const locale = language === 'kn' ? 'kn-IN' : 'en-IN';
  const archiveCutoff = shiftDate(today, -27);
  const oldRecordCount = retainedAttendance.filter((record) => record.date < archiveCutoff).length;

  function exportBackup() {
    try {
      const backup = createBackup(data);
      const file = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(file);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `coffee-estate-backup-${toDateKey(new Date())}.json`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('backupExported');
    } catch {
      setMessage('backupExportFailed');
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    let serialized: string;
    try {
      serialized = await file.text();
    } catch {
      setMessage('backupInvalidJson');
      return;
    }

    const result = decodeBackup(serialized);
    if (!result.valid) {
      setMessage(result.error === 'invalid-json' ? 'backupInvalidJson' : result.error === 'unsupported-version' ? 'backupInvalidSchema' : 'backupInvalidData');
      return;
    }
    setPreview(result.backup);
  }

  function confirmImport() {
    if (!preview) return;
    const result = importData(preview);
    setPreview(null);
    setMessage(result === 'success' ? 'backupImported' : result === 'invalid' ? 'backupInvalidData' : 'storageSaveFailed');
  }

  function archiveOlderRecords() {
    if (!window.confirm(t('archiveOldAttendanceConfirm'))) return;
    const result = archiveOldAttendance(archiveCutoff);
    setMessage(result === 'success' ? 'archiveOldAttendanceDone' : result === 'nothing-to-archive' ? 'nothingToArchive' : 'storageSaveFailed');
  }

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div><p className="eyebrow">{t('savedOnDevice')}</p><h1>{t('backupTitle')}</h1></div>
      </div>

      <section className="backup-panel">
        <div className="backup-panel-heading">
          <span className="backup-icon"><ShieldCheck size={21} aria-hidden="true" /></span>
          <div><h2>{t('backupTitle')}</h2><p>{t('backupIntro')}</p></div>
        </div>
        <p className="backup-explanation">{t('localDataNotice')}</p>
        <div className="backup-counts">
          <div><strong>{data.workers.length}</strong><span>{t('workers')}</span></div>
          <div><strong>{retainedAttendance.length}</strong><span>{t('attendanceRecords')}</span></div>
          <div><strong>{archivedAttendance.length}</strong><span>{t('archivedRecords')}</span></div>
        </div>
        <div className="backup-actions">
          <button className="button button-primary" onClick={exportBackup}><Download size={18} aria-hidden="true" />{t('exportBackup')}</button>
          <button className="button button-secondary" onClick={() => inputRef.current?.click()}><FileUp size={18} aria-hidden="true" />{t('importBackup')}</button>
          <input ref={inputRef} className="visually-hidden" type="file" accept="application/json,.json" aria-label={t('chooseBackupFile')} onChange={handleFileChange} />
        </div>
        <p className="retention-notice">{t('retentionNotice')}</p>
        <div className="archive-row">
          <div><strong>{oldRecordCount}</strong><span>{t('archiveOldAttendance')}</span></div>
          <button className="button button-secondary" onClick={archiveOlderRecords} disabled={persistenceLocked || oldRecordCount === 0}>
            <Archive size={17} aria-hidden="true" />{t('archiveOldAttendance')}
          </button>
        </div>
      </section>

      {preview && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreview(null); }}>
          <section className="worker-dialog backup-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="backup-preview-title">
            <div className="dialog-heading"><div className="dialog-icon"><FileUp size={20} aria-hidden="true" /></div><h2 id="backup-preview-title">{t('backupPreview')}</h2></div>
            <div className="backup-preview-info">
              <span>{formatDate(toDateKey(new Date(preview.exportedAt)), locale, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <span>{preview.workers.length} {t('workers')}</span>
              <span>{preview.attendance.length + preview.archivedAttendance.length} {t('attendanceRecords')}</span>
              <span>{preview.payments.length} {t('paymentStatus')}</span>
            </div>
            <p className="backup-warning">{t('backupReplaceWarning')}</p>
            <div className="dialog-actions">
              <button className="button button-secondary" onClick={() => setPreview(null)}>{t('cancel')}</button>
              <button className="button button-primary" onClick={confirmImport}>{t('confirmImport')}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}