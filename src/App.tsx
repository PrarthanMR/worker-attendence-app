import { useEffect, useState } from 'react';
import { CalendarCheck2, ClipboardList, Coffee, LayoutDashboard, UsersRound, Wallet } from 'lucide-react';
import DashboardPage from './pages/DashboardPage';
import AttendancePage from './pages/AttendancePage';
import WorkersPage from './pages/WorkersPage';
import WagesPage from './pages/WagesPage';
import HistoryPage from './pages/HistoryPage';
import { AppProvider, useApp } from './context/AppContext';
import type { ViewName } from './types';

const navigation: { view: ViewName; label: 'dashboard' | 'attendance' | 'workers' | 'wages' | 'history'; mobileLabel: 'navHome' | 'navMark' | 'navWorkers' | 'navWages' | 'navHistory'; icon: typeof LayoutDashboard }[] = [
  { view: 'dashboard', label: 'dashboard', mobileLabel: 'navHome', icon: LayoutDashboard },
  { view: 'attendance', label: 'attendance', mobileLabel: 'navMark', icon: CalendarCheck2 },
  { view: 'workers', label: 'workers', mobileLabel: 'navWorkers', icon: UsersRound },
  { view: 'wages', label: 'wages', mobileLabel: 'navWages', icon: Wallet },
  { view: 'history', label: 'history', mobileLabel: 'navHistory', icon: ClipboardList },
];

function TrackerApp() {
  const [view, setView] = useState<ViewName>('dashboard');
  const { language, setLanguage, t, message, setMessage } = useApp();

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [message, setMessage]);
  
  useEffect(() => {
    document.documentElement.lang = language === 'kn' ? 'kn' : 'en';
    document.title = t('appName');
  }, [language, t]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <span className="brand-mark"><Coffee size={21} aria-hidden="true" /></span>
          <span className="brand-name">{t('appName')}</span>
        </div>
        <nav className="side-nav" aria-label={t('appName')}>
          {navigation.map(({ view: destination, label, icon: Icon }) => (
            <button
              className={`nav-link ${view === destination ? 'is-current' : ''}`}
              key={destination}
              aria-current={view === destination ? 'page' : undefined}
              onClick={() => setView(destination)}
            >
              <Icon size={19} aria-hidden="true" />
              <span>{t(label)}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-note"><span className="note-dot" />{t('demoNotice')}</div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark"><Coffee size={19} aria-hidden="true" /></span>{t('appName')}</div>
          <div className="language-switch" role="group" aria-label={t('language')}>
            <button className={language === 'en' ? 'selected' : ''} aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>{t('english')}</button>
            <button className={language === 'kn' ? 'selected' : ''} aria-pressed={language === 'kn'} onClick={() => setLanguage('kn')}>{t('kannada')}</button>
          </div>
        </header>
        <div className="demo-banner"><span className="note-dot" />{t('demoNotice')}</div>
        {message && <div className="toast-message" role="status">{t(message)}</div>}
        <main className="main-content">
          {view === 'dashboard' ? (
            <DashboardPage navigate={setView} />
          ) : view === 'attendance' ? (
            <AttendancePage />
          ) : view === 'workers' ? (
            <WorkersPage />
          ) : view === 'wages' ? (
            <WagesPage />
          ) : view === 'history' ? (
            <HistoryPage navigate={setView} />
          ) : (
            <section className="page-stack"><div className="page-heading"><h1>{t(view)}</h1></div></section>
          )}
        </main>
      </div>

      <nav className="mobile-nav" aria-label={t('appName')}>
        {navigation.map(({ view: destination, mobileLabel, icon: Icon }) => (
          <button
            className={`mobile-nav-link ${view === destination ? 'is-current' : ''}`}
            key={destination}
            aria-current={view === destination ? 'page' : undefined}
            onClick={() => setView(destination)}
          >
            <Icon size={20} aria-hidden="true" />
            <span>{t(mobileLabel)}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return <AppProvider><TrackerApp /></AppProvider>;
}