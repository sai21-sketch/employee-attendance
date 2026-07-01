import { useEffect, useState } from 'react';
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

  useEffect(() => {
    async function load() {
      const fourteenDaysAgo = daysAgoStr(13);

      const [{ data: emps }, { data: recent }] = await Promise.all([
        supabase.from('profiles').select('id, name, email').eq('role', 'employee'),
        supabase
          .from('attendance')
          .select('*')
          .gte('date', fourteenDaysAgo)
          .order('date', { ascending: true }),
      ]);

      setEmployees(emps || []);

      const today = todayStr();
      setTodayRecords((recent || []).filter((r) => r.date === today));

      // Build a 14-day trend: present_count / late_count per day
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
      setLoading(false);
    }
    load();
  }, []);

  const totalEmployees = employees.length;
  const presentToday = todayRecords.filter((r) => r.status === 'present').length;
  const lateToday = todayRecords.filter((r) => r.status === 'late').length;
  const checkedInIds = new Set(todayRecords.map((r) => r.user_id));
  const absentToday = totalEmployees - checkedInIds.size;

  const employeeRows = employees.map((emp) => {
    const record = todayRecords.find((r) => r.user_id === emp.id);
    return { ...emp, record, status: record?.status || 'absent' };
  });

  return (
    <AdminLayout title="Dashboard" subtitle="Today's overview at a glance">
      <div style={styles.statsGrid}>
        <StatCard label="Total employees" value={loading ? '—' : totalEmployees} tone="navy" />
        <StatCard label="Present today" value={loading ? '—' : presentToday} tone="mint" />
        <StatCard label="Late today" value={loading ? '—' : lateToday} tone="amber" />
        <StatCard label="Absent today" value={loading ? '—' : absentToday} tone="coral" />
      </div>

      <div style={styles.chartCard}>
        <h3 style={styles.sectionTitle}>Attendance trend — last 14 days</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => d.slice(5)}
              fontSize={12}
              stroke="var(--text-secondary)"
            />
            <YAxis fontSize={12} stroke="var(--text-secondary)" allowDecimals={false} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="present_count"
              name="Present"
              stroke="var(--mint)"
              strokeWidth={2.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="late_count"
              name="Late"
              stroke="var(--amber)"
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={styles.tableCard}>
        <h3 style={styles.sectionTitle}>Today — {todayStr()}</h3>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Employee</th>
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
                <td style={styles.td}>{emp.record?.check_in_time?.slice(11, 16) || '—'}</td>
                <td style={styles.td}>{emp.record?.check_out_time?.slice(11, 16) || '—'}</td>
                <td style={styles.td}>
                  <StatusBadge status={emp.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}

function StatCard({ label, value, tone }) {
  const colors = {
    navy: 'var(--navy)',
    mint: 'var(--mint-dark)',
    amber: '#9c6b1a',
    coral: 'var(--coral)',
  };
  return (
    <div style={styles.statCard}>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 30,
          color: colors[tone],
          marginTop: 6,
        }}
      >
        {value}
      </div>
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
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-sm)',
    padding: '18px 20px',
    border: '1px solid var(--border)',
  },
  chartCard: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--border)',
    padding: '22px 24px',
    marginBottom: 24,
  },
  tableCard: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--border)',
    padding: '22px 24px',
  },
  sectionTitle: { fontSize: 15, marginBottom: 16 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left',
    fontSize: 12,
    color: 'var(--text-secondary)',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    padding: '8px 10px',
    borderBottom: '1px solid var(--border)',
  },
  td: {
    padding: '12px 10px',
    borderBottom: '1px solid var(--border)',
    fontSize: 13.5,
  },
};
