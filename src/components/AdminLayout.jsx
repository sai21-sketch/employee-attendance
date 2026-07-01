import { NavLink } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: '◧' },
  { to: '/admin/employees', label: 'Employees', icon: '◑' },
  { to: '/admin/records', label: 'Records', icon: '☰' },
  { to: '/admin/settings', label: 'Settings', icon: '⚙' },
];

export default function AdminLayout({ title, subtitle, children }) {
  const { user, logout } = useAuth();

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.logoMark}>A</div>
          <span style={styles.brandName}>Attendly</span>
        </div>

        <nav style={styles.nav}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              style={({ isActive }) => ({
                ...styles.navItem,
                background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.65)',
              })}
            >
              <span style={{ width: 18 }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userName}>{user.name}</div>
          <button onClick={logout} style={styles.logoutBtn}>
            Sign out
          </button>
        </div>
      </aside>

      <main style={styles.main}>
        <header style={styles.pageHeader}>
          <h1 style={styles.pageTitle}>{title}</h1>
          {subtitle && <p style={styles.pageSubtitle}>{subtitle}</p>}
        </header>
        <div style={styles.content}>{children}</div>
      </main>
    </div>
  );
}

const styles = {
  shell: { display: 'flex', minHeight: '100vh' },
  sidebar: {
    width: 220,
    background: 'var(--navy)',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    flexShrink: 0,
  },
  brand: { display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px 28px' },
  logoMark: {
    width: 30,
    height: 30,
    borderRadius: 8,
    background: 'linear-gradient(135deg, var(--mint), var(--slate))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontSize: 15,
  },
  brandName: { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17 },
  nav: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1 },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none',
  },
  sidebarFooter: {
    borderTop: '1px solid rgba(255,255,255,0.12)',
    paddingTop: 16,
    marginTop: 16,
  },
  userName: { fontSize: 13, fontWeight: 600, marginBottom: 8, padding: '0 8px' },
  logoutBtn: {
    width: '100%',
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 13,
    fontWeight: 600,
  },
  main: { flex: 1, padding: '32px 40px', maxWidth: 1100 },
  pageHeader: { marginBottom: 28 },
  pageTitle: { fontSize: 26, fontWeight: 800, color: 'var(--navy)' },
  pageSubtitle: { color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 },
  content: {},
};
