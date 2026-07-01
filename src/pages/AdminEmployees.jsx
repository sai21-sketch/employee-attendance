import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import AdminLayout from '../components/AdminLayout';

export default function AdminEmployees() {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('role', 'employee')
      .order('name');
    setEmployees(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error: fnError } = await supabase.functions.invoke('create-employee', {
        body: form,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setForm({ name: '', email: '', password: '' });
      setSuccess(`${form.name} was added.`);
      load();
    } catch (err) {
      setError(err.message || 'Could not add employee.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id, name) => {
    if (!window.confirm(`Remove ${name}? This deletes their attendance history too.`)) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.functions.invoke('delete-employee', {
        body: { userId: id },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      load();
    } catch (err) {
      alert('Could not remove employee: ' + err.message);
    }
  };

  return (
    <AdminLayout title="Employees" subtitle="Add or remove employee accounts">
      <div style={styles.grid}>
        <form onSubmit={handleAdd} style={styles.formCard}>
          <h3 style={styles.cardTitle}>Add employee</h3>

          <label style={styles.label}>
            Full name
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={styles.input}
              placeholder="Priya Sharma"
            />
          </label>

          <label style={styles.label}>
            Email
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={styles.input}
              placeholder="priya@company.com"
            />
          </label>

          <label style={styles.label}>
            Temporary password
            <input
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={styles.input}
              placeholder="At least 6 characters"
            />
          </label>

          {error && <div style={styles.error}>{error}</div>}
          {success && <div style={styles.success}>{success}</div>}

          <button type="submit" disabled={submitting} style={styles.submitBtn}>
            {submitting ? 'Adding…' : 'Add employee'}
          </button>
        </form>

        <div style={styles.listCard}>
          <h3 style={styles.cardTitle}>All employees ({employees.length})</h3>
          <div style={styles.list}>
            {employees.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No employees yet.</p>
            )}
            {employees.map((emp) => (
              <div key={emp.id} style={styles.row}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{emp.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{emp.email}</div>
                </div>
                <button onClick={() => handleRemove(emp.id, emp.name)} style={styles.removeBtn}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

const styles = {
  grid: { display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' },
  formCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: 22,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  listCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: 22,
  },
  cardTitle: { fontSize: 15, marginBottom: 4 },
  label: { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' },
  input: { padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14 },
  submitBtn: { padding: '11px 14px', background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, marginTop: 4 },
  error: { background: '#fdeceb', color: 'var(--coral)', fontSize: 12.5, padding: '8px 10px', borderRadius: 8 },
  success: { background: '#e8f6f1', color: 'var(--mint-dark)', fontSize: 12.5, padding: '8px 10px', borderRadius: 8 },
  list: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    border: '1px solid var(--border)',
    borderRadius: 10,
  },
  removeBtn: {
    background: 'transparent',
    color: 'var(--coral)',
    border: '1px solid #f3c9cc',
    borderRadius: 7,
    padding: '6px 11px',
    fontSize: 12.5,
    fontWeight: 600,
  },
};
