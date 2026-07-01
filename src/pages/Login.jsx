import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'admin' ? '/admin' : '/employee');
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.brand}>
          <div style={styles.logoMark}>A</div>
          <h1 style={styles.brandName}>Attendly</h1>
        </div>
        <p style={styles.subtitle}>Sign in to track attendance</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              style={styles.input}
              autoFocus
            />
          </label>

          <label style={styles.label}>
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={styles.input}
            />
          </label>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" disabled={submitting} style={styles.button}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={styles.hint}>
          Contact your admin if you don't have login details yet.
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background:
      'radial-gradient(circle at 20% 20%, #243966 0%, #1b2a4a 55%, #131d33 100%)',
    padding: 20,
  },
  card: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
    padding: '40px 36px',
    width: '100%',
    maxWidth: 380,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'linear-gradient(135deg, var(--mint), var(--slate))',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontSize: 18,
  },
  brandName: {
    fontSize: 22,
    fontWeight: 800,
    color: 'var(--navy)',
  },
  subtitle: {
    color: 'var(--text-secondary)',
    fontSize: 14,
    marginTop: 6,
    marginBottom: 28,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  input: {
    padding: '11px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    fontSize: 15,
    color: 'var(--text-primary)',
  },
  button: {
    marginTop: 6,
    padding: '12px 16px',
    background: 'var(--navy)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 700,
    fontSize: 15,
  },
  error: {
    background: '#fdeceb',
    color: 'var(--coral)',
    fontSize: 13,
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
  },
  hint: {
    marginTop: 22,
    fontSize: 12,
    color: 'var(--text-secondary)',
    textAlign: 'center',
  },
};
