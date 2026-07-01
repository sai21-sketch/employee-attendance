import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import AdminLayout from '../components/AdminLayout';

export default function AdminSettings() {
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    supabase
      .from('company_settings')
      .select('*')
      .eq('id', 1)
      .single()
      .then(({ data }) => setForm(data));
  }, []);

  const useCurrentLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
        setLocating(false);
      },
      () => {
        setError('Could not get your current location. Enter coordinates manually.');
        setLocating(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from('company_settings')
        .update({
          name: form.name,
          latitude: form.latitude,
          longitude: form.longitude,
          radius_meters: form.radius_meters,
          work_start_time: form.work_start_time,
        })
        .eq('id', 1);

      if (updateError) throw updateError;
      setSuccess('Settings saved.');
    } catch (err) {
      setError(err.message || 'Could not save settings.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!form) return null;

  return (
    <AdminLayout title="Settings" subtitle="Set your office location and the geofence radius for check-in">
      <form onSubmit={handleSubmit} style={styles.card}>
        <label style={styles.label}>
          Office name
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={styles.input}
          />
        </label>

        <div style={styles.row}>
          <label style={styles.label}>
            Latitude
            <input
              type="number"
              step="0.000001"
              value={form.latitude}
              onChange={(e) => setForm({ ...form, latitude: parseFloat(e.target.value) })}
              style={styles.input}
            />
          </label>
          <label style={styles.label}>
            Longitude
            <input
              type="number"
              step="0.000001"
              value={form.longitude}
              onChange={(e) => setForm({ ...form, longitude: parseFloat(e.target.value) })}
              style={styles.input}
            />
          </label>
        </div>

        <button type="button" onClick={useCurrentLocation} style={styles.secondaryBtn}>
          {locating ? 'Locating…' : '📍 Use my current location'}
        </button>

        <label style={styles.label}>
          Check-in radius (meters)
          <input
            type="number"
            min="20"
            value={form.radius_meters}
            onChange={(e) => setForm({ ...form, radius_meters: parseInt(e.target.value, 10) })}
            style={styles.input}
          />
        </label>

        <label style={styles.label}>
          Work start time (used to mark "late")
          <input
            type="time"
            value={form.work_start_time}
            onChange={(e) => setForm({ ...form, work_start_time: e.target.value })}
            style={styles.input}
          />
        </label>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        <button type="submit" disabled={submitting} style={styles.submitBtn}>
          {submitting ? 'Saving…' : 'Save settings'}
        </button>
      </form>
    </AdminLayout>
  );
}

const styles = {
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: 26,
    maxWidth: 440,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  row: { display: 'flex', gap: 14 },
  label: { flex: 1, display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' },
  input: { padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14 },
  secondaryBtn: {
    background: '#eef1f6',
    color: 'var(--navy)',
    border: 'none',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13.5,
    fontWeight: 600,
  },
  submitBtn: { padding: '11px 14px', background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14 },
  error: { background: '#fdeceb', color: 'var(--coral)', fontSize: 12.5, padding: '8px 10px', borderRadius: 8 },
  success: { background: '#e8f6f1', color: 'var(--mint-dark)', fontSize: 12.5, padding: '8px 10px', borderRadius: 8 },
};
