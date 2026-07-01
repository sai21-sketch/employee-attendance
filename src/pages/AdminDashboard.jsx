import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import AdminLayout from '../components/AdminLayout';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const todayStr = () => new Date().toISOString().slice(0, 10);

function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function AdminDashboard() {
  const [employees, setEmployees] = useState([]);
  const [todayRecords, setTodayRecords] = useState([]);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    const fourteenDaysAgo = daysAgoStr(13);
    const [{ data: emps }, { data: recent }] = await Promise.all([
      supabase.from('profiles').select('id, name, email').eq('role', 'employee'),
      supabase
        .from('attendance')
        .select('*, profiles(name, email)')
        .gte('date', fourteenDaysAgo)
        .order('date', { ascending: true }),
    ]);

    setEmployees(emps || []);
    const today = todayStr();
    setTodayRecords((recent || []).filter((r) => r.date === today));

    const byDate = {};
    for (let i = 13; i >= 0; i--) {
      const d = daysAgoStr(i);
      byDate[d] = { date: d, present_count: 0, late_count: 0 };
    }
    (recent || []).forEach((rec) => {
      if (!byDate[rec.date]) return;
      if (rec.status === 'present') byDate[rec.date].present_count += 1;
      if (rec.status === 'late') byDate[rec.date].late_count += 1;
    });
    setTrend(Object.values(byDate));
    setLastUpdated(new Date().toLocaleTimeString());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();

    const channel = supabase
      .channel('attendance-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
        load();
      })
      .subscribe();

    const interval = setInterval(load, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [load]);

  const totalEmployees = employees.length;
  const presentToday = todayRecords.filter((r) => r.status === 'present').length;
  const lateToday = todayRecords.filter((r) => r.status === 'late').length;
  const checkedInIds = new Set(todayRecords.map((r) => r.user_id));
  const absentToday = totalEmployees - checkedInIds.size;

  const employeeRows = employees.map((emp) => {
    const record = todayRecords.find((r) => r.user_id === emp.id);
    return { ...emp, record, status: record?.status || 'absent' };
  });

  const modalData = {
    total: { title: 'All Employees', rows: employeeRows, color: 'var(--navy)' },
    present: { title: 'Present Today', rows: employeeRows.filter((e) => e.status === 'present'), color: 'var(--mint-dark)' },
    late: { title: 'Late Today', rows: employeeRows.filter((e) => e.status === 'late'), color: '#9c6b1a' },
    absent: { title: 'Absent Today', rows: employeeRows.filter((e) => e.status === 'absent'), color: 'var(--coral)' },
  };

  return (
    <AdminLayout title="Dashboard" subtitle="Today's overview at a glance">
      {lastUpdated && (
        <div style={styles.lastUpdated}>
          ● Live · Last updated {lastUpdated}
          <button onClick={load} style={styles.refreshBtn}>Refresh now</button>
        </div>
      )}

      <div style={styles.statsGrid}>
        <StatCard label="Total employees" value={loading ? '—' : totalEmployees} tone="navy" onClick={() => setModal('total')} />
        <StatCard label="Present today" value={loading ? '—' : presentToday} tone="mint" onClick={() => setModal('present')} />
        <StatCard label="Late today" value={loading ? '—' : lateToday} tone="amber" onClick={() => setModal('late')} />
        <StatCard label="Absent today" value={loading ? '—' : absentToday} tone="coral" onClick={() => setModal('absent')} />
      </div>

      <div style={styles.chartCard}>
        <h3 style={styles.sectionTitle}>Attendance trend — last 14 days</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} fontSize={12} stroke="var(--text-secondary)" />
            <YAxis fontSize={12} stroke="var(--text-secondary)" allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="present_count" name="Present" stroke="var(--mint)" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="late_count" name="Late" stroke="var(--amber)" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={styles.tableCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ ...styles.sectionTitle, marginBottom: 0 }}>Today — {todayStr()}</h3>
          <button onClick={load} style={styles.refreshBtn}>↻ Refresh</button>
        </div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Employee</th>
              <th style={styles.th}>Photo</th>
              <th style={styles.th}>Check-in</th>
              <th style={styles.th}>Check-out</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {employeeRows.map((emp) => (
              <tr key={emp.id}>
                <td style={styles.td}>
                  <div style={{ fontWeight: 600 }}>{emp.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{emp.email}</div>
                </td>
                <td style={styles.td}>
                  {emp.record?.photo_url
                    ? <img src={emp.record.photo_url} alt="check-in" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                    : '—'}
                </td>
                <td style={styles.td}>{emp.record?.check_in_time?.slice(11, 16) || '—'}</td>
                <td style={styles.td}>{emp.record?.check_out_time?.slice(11, 16) || '—'}</td>
                <td style={styles.td}><StatusBadge status={emp.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={styles.modalOverlay} onClick={() => setModal(null)}>
          <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={{ ...styles.modalTitle, color: modalData[modal].color }}>
                {modalData[modal].title}
              </h2>
              <button onClick={() => setModal(null)} style={styles.closeBtn}>✕</button>
            </div>
            <div style={styles.modalList}>
              {modalData[modal].rows.length === 0 && (
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, padding: '16px 0' }}>
                  No employees in this category today.
                </p>
              )}
              {modalData[modal].rows.map((emp) => (
                <div key={emp.id} style={styles.modalRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {emp.record?.photo_url
                      ? <img src={emp.record.photo_url} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                      : <div style={styles.avatar}>{emp.name?.[0]?.toUpperCase()}</div>}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{emp.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{emp.email}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <StatusBadge status={emp.status} />
                    {emp.record?.check_in_time && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                        In: {emp.record.check_in_time.slice(11, 16)}
                        {emp.record.check_out_time ? ` · Out: ${emp.record.check_out_time.slice(11, 16)}` : ''}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function StatCard({ label, value, tone, onClick }) {
  const colors = {
    navy: 'var(--navy)',
    mint: 'var(--mint-dark)',
    amber: '#9c6b1a',
    coral: 'var(--coral)',
  };
  return (
    <div style={{ ...styles.statCard, cursor: 'pointer' }} onClick={onClick}>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, color: colors[tone], marginTop: 6 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: colors[tone], marginTop: 6, opacity: 0.7 }}>Click to view →</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    present: { bg: '#e8f6f1', color: 'var(--mint-dark)', label: 'Present' },
    late: { bg: '#fdf3e3', color: '#9c6b1a', label: 'Late' },
    absent: { bg: '#fdeceb', color: 'var(--coral)', label: 'Absent' },
  };
  const s = map[status] || map.absent;
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>
      {s.label}
    </span>
  );
}

const styles = {
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 },
  statCard: { background: 'var(--surface)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', padding: '18px 20px', border: '1px solid var(--border)', transition: 'transform 0.15s, box-shadow 0.15s' },
  chartCard: { background: 'var(--surface)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)', padding: '22px 24px', marginBottom: 24 },
  tableCard: { background: 'var(--surface)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)', padding: '22px 24px' },
  sectionTitle: { fontSize: 15, marginBottom: 16 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', padding: '8px 10px', borderBottom: '1px solid var(--border)' },
  td: { padding: '12px 10px', borderBottom: '1px solid var(--border)', fontSize: 13.5 },
  lastUpdated: { fontSize: 12, color: 'var(--mint-dark)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 },
  refreshBtn: { background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', color: 'var(--navy)' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalBox: { background: 'var(--surface)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 520, maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' },
  modalTitle: { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, margin: 0 },
  closeBtn: { background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px 8px' },
  modalList: { overflowY: 'auto', padding: '8px 24px 24px' },
  modalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' },
  avatar: { width: 40, height: 40, borderRadius: '50%', background: 'var(--navy)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 },
};
