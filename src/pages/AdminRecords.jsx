import { useState } from 'react';
import { supabase } from '../supabaseClient';
import AdminLayout from '../components/AdminLayout';

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function AdminRecords() {
  const [start, setStart] = useState(isoDaysAgo(7));
  const [end, setEnd] = useState(isoDaysAgo(0));
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    // Join attendance with profiles to get each employee's name in one query
    const { data, error } = await supabase
      .from('attendance')
      .select('*, profiles(name)')
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false });

    if (error) {
      console.error(error);
      setRecords([]);
    } else {
      setRecords(data || []);
    }
    setSearched(true);
    setLoading(false);
  };

  return (
    <AdminLayout title="Records" subtitle="Look up attendance for a specific date range">
      <div style={styles.filterBar}>
        <label style={styles.dateLabel}>
          From
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} style={styles.dateInput} />
        </label>
        <label style={styles.dateLabel}>
          To
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} style={styles.dateInput} />
        </label>
        <button onClick={fetchRecords} style={styles.searchBtn}>
          {loading ? 'Loading…' : 'Search'}
        </button>
      </div>

      <div style={styles.tableCard}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Employee</th>
              <th style={styles.th}>Photo</th>
              <th style={styles.th}>Check-in</th>
              <th style={styles.th}>Check-out</th>
              <th style={styles.th}>Distance</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && (
              <tr>
                <td colSpan={7} style={{ ...styles.td, textAlign: 'center', color: 'var(--text-secondary)' }}>
                  {searched ? 'No records for this range.' : 'No records loaded yet — try Search.'}
                </td>
              </tr>
            )}
            {records.map((r) => (
              <tr key={r.id}>
                <td style={styles.td}>{r.date}</td>
                <td style={styles.td}>{r.profiles?.name || '—'}</td>
                <td style={styles.td}>
                  {r.photo_url ? (
                    <img src={r.photo_url} alt="Check-in" style={styles.thumb} />
                  ) : (
                    '—'
                  )}
                </td>
                <td style={styles.td}>{r.check_in_time?.slice(11, 16) || '—'}</td>
                <td style={styles.td}>{r.check_out_time?.slice(11, 16) || '—'}</td>
                <td style={styles.td}>{r.check_in_distance_m ? `${Math.round(r.check_in_distance_m)}m` : '—'}</td>
                <td style={styles.td}>
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
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
  filterBar: { display: 'flex', gap: 14, alignItems: 'flex-end', marginBottom: 20 },
  dateLabel: { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' },
  dateInput: { padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14 },
  searchBtn: { padding: '10px 18px', background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14 },
  tableCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '8px 24px',
    overflowX: 'auto',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left',
    fontSize: 12,
    color: 'var(--text-secondary)',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    padding: '14px 10px',
    borderBottom: '1px solid var(--border)',
  },
  td: { padding: '12px 10px', borderBottom: '1px solid var(--border)', fontSize: 13.5 },
  thumb: { width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' },
};
