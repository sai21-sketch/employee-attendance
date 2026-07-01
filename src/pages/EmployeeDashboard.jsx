import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabaseClient';
import { uploadCheckInPhoto } from '../cloudinary';
import DistanceRing from '../components/DistanceRing';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function EmployeeDashboard() {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState(null);
  const [today, setToday] = useState(null);
  const [history, setHistory] = useState([]);
  const [coords, setCoords] = useState(null);
  const [geoStatus, setGeoStatus] = useState('locating'); // locating | ok | error
  const [geoError, setGeoError] = useState('');
  const [actionState, setActionState] = useState({ loading: false, error: '', success: '' });

  // Camera state for the check-in selfie
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null); // Blob
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const loadData = useCallback(async () => {
    const [{ data: settingsData }, { data: todayData }, { data: historyData }] = await Promise.all([
      supabase.from('company_settings').select('*').eq('id', 1).single(),
      supabase.from('attendance').select('*').eq('user_id', user.id).eq('date', todayStr()).maybeSingle(),
      supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(14),
    ]);
    setSettings(settingsData);
    setToday(todayData);
    setHistory(historyData || []);
  }, [user.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      setGeoError('Your browser does not support location services.');
      return;
    }

    const watcherId = navigator.geolocation.watchPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus('ok');
      },
      (err) => {
        setGeoStatus('error');
        setGeoError(
          err.code === 1
            ? 'Location access was denied. Enable it in your browser settings to check in.'
            : 'Could not determine your location. Try again.'
        );
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watcherId);
  }, []);

  const distance =
    coords && settings
      ? haversine(coords.lat, coords.lng, settings.latitude, settings.longitude)
      : null;

  const inRange = distance != null && distance <= (settings?.radius_meters ?? 0);
  const alreadyCheckedIn = !!today?.check_in_time;
  const alreadyCheckedOut = !!today?.check_out_time;

  // ---- Camera handling ----
  const openCamera = async () => {
    setActionState({ loading: false, error: '', success: '' });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });
      streamRef.current = stream;
      setCameraOpen(true);
      // Wait a tick for the video element to mount, then attach stream
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 0);
    } catch (err) {
      setActionState({
        loading: false,
        error: 'Could not access camera. Check your browser permissions.',
        success: '',
      });
    }
  };

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
  };

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        setCapturedPhoto(blob);
        setPhotoPreviewUrl(URL.createObjectURL(blob));
        closeCamera();
      },
      'image/jpeg',
      0.85
    );
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    setPhotoPreviewUrl(null);
    openCamera();
  };

  // ---- Check-in / check-out ----
  const handleCheckIn = async () => {
    if (!coords || !capturedPhoto) return;
    setActionState({ loading: true, error: '', success: '' });
    try {
      const photoUrl = await uploadCheckInPhoto(capturedPhoto);

      const nowIso = new Date().toISOString();
      const lateCutoff = settings?.work_start_time || '09:30';
      const nowTime = nowIso.slice(11, 16);
      const status = nowTime > lateCutoff ? 'late' : 'present';

      const { data, error } = await supabase
        .from('attendance')
        .insert({
          user_id: user.id,
          date: todayStr(),
          check_in_time: nowIso,
          check_in_lat: coords.lat,
          check_in_lng: coords.lng,
          check_in_distance_m: distance,
          photo_url: photoUrl,
          status,
        })
        .select()
        .single();

      if (error) throw error;

      setToday(data);
      setCapturedPhoto(null);
      setPhotoPreviewUrl(null);
      setActionState({ loading: false, error: '', success: 'Checked in successfully.' });
    } catch (err) {
      setActionState({
        loading: false,
        error: err.message || 'Check-in failed. Try again.',
        success: '',
      });
    }
  };

  const handleCheckOut = async () => {
    setActionState({ loading: true, error: '', success: '' });
    try {
      const { data, error } = await supabase
        .from('attendance')
        .update({ check_out_time: new Date().toISOString() })
        .eq('id', today.id)
        .select()
        .single();

      if (error) throw error;
      setToday(data);
      setActionState({ loading: false, error: '', success: 'Checked out. See you tomorrow!' });
    } catch (err) {
      setActionState({
        loading: false,
        error: err.message || 'Check-out failed. Try again.',
        success: '',
      });
    }
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.greeting}>Hello, {user.name.split(' ')[0]}</div>
          <div style={styles.date}>{formatToday()}</div>
        </div>
        <button onClick={logout} style={styles.logoutBtn}>
          Sign out
        </button>
      </header>

      <main style={styles.main}>
        <div style={styles.card}>
          {settings && (
            <DistanceRing
              distance={geoStatus === 'ok' ? distance : 0}
              radius={settings.radius_meters}
              status={geoStatus === 'ok' ? 'ready' : 'locating'}
            />
          )}

          {geoStatus === 'error' && <div style={styles.errorBox}>{geoError}</div>}

          <div style={{ marginTop: 20, width: '100%' }}>
            {alreadyCheckedOut ? (
              <StatusPill label="Day complete" sub={`Checked out at ${today.check_out_time?.slice(11, 16)}`} tone="mint" />
            ) : alreadyCheckedIn ? (
              <>
                <StatusPill
                  label={today.status === 'late' ? 'Checked in (late)' : 'Checked in'}
                  sub={`At ${today.check_in_time?.slice(11, 16)}`}
                  tone={today.status === 'late' ? 'amber' : 'mint'}
                />
                {today.photo_url && (
                  <img src={today.photo_url} alt="Check-in selfie" style={styles.checkinPhoto} />
                )}
                <button
                  onClick={handleCheckOut}
                  disabled={actionState.loading}
                  style={{ ...styles.actionBtn, background: 'var(--slate)' }}
                >
                  {actionState.loading ? 'Checking out…' : 'Check out'}
                </button>
              </>
            ) : cameraOpen ? (
              <div style={styles.cameraBox}>
                <video ref={videoRef} autoPlay playsInline muted style={styles.video} />
                <div style={styles.cameraControls}>
                  <button onClick={closeCamera} style={styles.cameraCancelBtn}>
                    Cancel
                  </button>
                  <button onClick={takePhoto} style={styles.captureBtn}>
                    Take photo
                  </button>
                </div>
              </div>
            ) : photoPreviewUrl ? (
              <div style={styles.cameraBox}>
                <img src={photoPreviewUrl} alt="Captured selfie" style={styles.video} />
                <div style={styles.cameraControls}>
                  <button onClick={retakePhoto} style={styles.cameraCancelBtn}>
                    Retake
                  </button>
                  <button
                    onClick={handleCheckIn}
                    disabled={!inRange || actionState.loading}
                    style={{
                      ...styles.captureBtn,
                      opacity: inRange ? 1 : 0.5,
                      cursor: inRange ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {actionState.loading ? 'Checking in…' : 'Confirm check-in'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={openCamera}
                disabled={!inRange || geoStatus !== 'ok'}
                style={{
                  ...styles.actionBtn,
                  background: inRange ? 'var(--navy)' : 'var(--border)',
                  color: inRange ? '#fff' : 'var(--text-secondary)',
                  cursor: inRange ? 'pointer' : 'not-allowed',
                }}
              >
                {inRange ? 'Check in now' : `Get within ${settings?.radius_meters}m to check in`}
              </button>
            )}

            {actionState.error && <div style={styles.errorBox}>{actionState.error}</div>}
            {actionState.success && <div style={styles.successBox}>{actionState.success}</div>}
          </div>
        </div>

        <section style={styles.historySection}>
          <h3 style={styles.historyTitle}>Recent attendance</h3>
          <div style={styles.historyList}>
            {history.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                No attendance recorded yet.
              </p>
            )}
            {history.map((rec) => (
              <div key={rec.id} style={styles.historyRow}>
                <span style={styles.historyDate}>{formatDate(rec.date)}</span>
                <span style={styles.historyTime}>
                  {rec.check_in_time?.slice(11, 16) || '—'}
                  {rec.check_out_time ? ` – ${rec.check_out_time.slice(11, 16)}` : ''}
                </span>
                <StatusBadge status={rec.status} />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function StatusPill({ label, sub, tone }) {
  const colors = { mint: 'var(--mint)', amber: 'var(--amber)' };
  return (
    <div style={{ textAlign: 'center', marginBottom: 16 }}>
      <div style={{ color: colors[tone], fontWeight: 700, fontSize: 16 }}>{label}</div>
      <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{sub}</div>
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
    <span
      style={{
        background: s.bg,
        color: s.color,
        fontSize: 12,
        fontWeight: 700,
        padding: '4px 10px',
        borderRadius: 20,
      }}
    >
      {s.label}
    </span>
  );
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatToday() {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

const styles = {
  page: { minHeight: '100vh', background: 'var(--bg)' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    background: 'var(--navy)',
    color: '#fff',
  },
  greeting: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19 },
  date: { fontSize: 13, opacity: 0.75, marginTop: 2 },
  logoutBtn: {
    background: 'rgba(255,255,255,0.12)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
  },
  main: {
    maxWidth: 480,
    margin: '0 auto',
    padding: '28px 20px 60px',
  },
  card: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-md)',
    padding: '32px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  actionBtn: {
    width: '100%',
    padding: '14px 16px',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 700,
    fontSize: 15,
    color: '#fff',
  },
  errorBox: {
    marginTop: 12,
    background: '#fdeceb',
    color: 'var(--coral)',
    fontSize: 13,
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    textAlign: 'center',
  },
  successBox: {
    marginTop: 12,
    background: '#e8f6f1',
    color: 'var(--mint-dark)',
    fontSize: 13,
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    textAlign: 'center',
  },
  historySection: { marginTop: 32 },
  historyTitle: { fontSize: 15, marginBottom: 12, color: 'var(--text-primary)' },
  historyList: { display: 'flex', flexDirection: 'column', gap: 8 },
  historyRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'var(--surface)',
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)',
    boxShadow: 'var(--shadow-sm)',
    fontSize: 13.5,
  },
  historyDate: { fontWeight: 600, flex: 1 },
  historyTime: { color: 'var(--text-secondary)', flex: 1, textAlign: 'center' },
  checkinPhoto: {
    width: 120,
    height: 120,
    borderRadius: '50%',
    objectFit: 'cover',
    margin: '0 auto 16px',
    display: 'block',
    border: '3px solid var(--mint)',
  },
  cameraBox: { width: '100%' },
  video: {
    width: '100%',
    borderRadius: 'var(--radius-md)',
    background: '#000',
    aspectRatio: '1 / 1',
    objectFit: 'cover',
  },
  cameraControls: { display: 'flex', gap: 10, marginTop: 12 },
  cameraCancelBtn: {
    flex: 1,
    padding: '12px 16px',
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text-primary)',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 600,
    fontSize: 14,
  },
  captureBtn: {
    flex: 1,
    padding: '12px 16px',
    border: 'none',
    background: 'var(--navy)',
    color: '#fff',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 700,
    fontSize: 14,
  },
};
