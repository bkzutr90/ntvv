import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

export default function VideoPlayer({ room, socket }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [error, setError] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [localTime, setLocalTime] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || room?.mediaType !== 'direct' || !room?.mediaUrl) return;
    setError('');
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    if (room.mediaUrl.includes('.m3u8') && Hls.isSupported()) {
      const hls = new Hls(); hlsRef.current = hls; hls.loadSource(room.mediaUrl); hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_event, data) => { if (data.fatal) setError('Stream HLS gagal dimuat. Periksa URL, CORS, dan izin sumber.'); });
    } else if (room.mediaUrl.includes('.m3u8') && video.canPlayType('application/vnd.apple.mpegurl')) video.src = room.mediaUrl;
    else video.src = room.mediaUrl;
    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, [room?.mediaUrl, room?.mediaType]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !room?.state || room.mediaType !== 'direct') return;
    const target = room.state.currentTime + (room.state.playing ? Math.max(0, (Date.now() - room.state.updatedAt) / 1000) : 0);
    if (Number.isFinite(target) && Math.abs(video.currentTime - target) > 1.8) {
      try { video.currentTime = target; } catch {}
    }
    if (room.state.playing && enabled) video.play().catch(() => setError('Browser memblokir autoplay. Tekan tombol Aktifkan Player.'));
    else if (!room.state.playing) video.pause();
  }, [room?.state?.updatedAt, room?.state?.playing, enabled, room?.mediaType]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const update = () => setLocalTime(video.currentTime || 0);
    video.addEventListener('timeupdate', update);
    return () => video.removeEventListener('timeupdate', update);
  }, []);

  if (!room?.mediaUrl) return <div className="empty-player"><div className="play-orb">▶</div><h2>Player belum tersedia</h2><p>Host harus memasang sumber video melalui perintah Discord <code>/watch-source</code>.</p><p className="muted">Halaman sumber film tidak otomatis menjadi stream video.</p></div>;
  if (room.mediaType === 'embed') return <div className="embed-wrap"><iframe src={room.mediaUrl} title="Authorized video embed" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/><div className="embed-note">Embed dari penyedia eksternal. Kontrol Discord lintas situs tidak tersedia secara universal; integrasi API resmi penyedia diperlukan untuk sinkronisasi penuh.</div></div>;

  const duration = videoRef.current?.duration || 0;
  return <div className="player-shell">
    <video ref={videoRef} playsInline controls preload="metadata" onError={() => setError('Video gagal dimuat. Pastikan URL publik, format didukung, dan server mengizinkan CORS.')} />
    {!enabled && <button className="enable-player" onClick={() => { setEnabled(true); if (room?.state?.playing) videoRef.current?.play().catch(() => {}); }}>Aktifkan Player</button>}
    <div className="player-meta"><span>{format(localTime)}</span><span>{duration ? format(duration) : 'LIVE / —'}</span></div>
    {error && <p className="error">{error}</p>}
  </div>;
}
function format(value) { const n = Math.floor(value || 0); return `${String(Math.floor(n / 3600)).padStart(2,'0')}:${String(Math.floor(n / 60) % 60).padStart(2,'0')}:${String(n % 60).padStart(2,'0')}`; }
