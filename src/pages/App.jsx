import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { Clapperboard, Users, Radio, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import VideoPlayer from '../components/VideoPlayer.jsx';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const SOCKET = import.meta.env.VITE_SOCKET_URL || API;
export default function App() {
  const roomId = useMemo(() => window.location.pathname.match(/\/room\/([a-z0-9]+)/i)?.[1]?.toUpperCase(), []);
  const [room, setRoom] = useState(null); const [error, setError] = useState(''); const [connected, setConnected] = useState(false);
  const socket = useMemo(() => io(SOCKET, { autoConnect: false, transports: ['websocket', 'polling'] }), []);
  useEffect(() => {
    if (!roomId) { setError('Room ID tidak ditemukan pada URL.'); return; }
    fetch(`${API}/api/rooms/${roomId}`).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setRoom(d.room); }).catch(e => setError(e.message));
    socket.connect(); socket.on('connect', () => { setConnected(true); socket.emit('room:join', { roomId, name: 'Guest' }); });
    socket.on('disconnect', () => setConnected(false)); socket.on('room:state', setRoom); socket.on('room:update', setRoom); socket.on('room:error', setError); socket.on('room:closed', () => { setRoom(null); setError('Host telah menutup Watch Party ini.'); });
    return () => { socket.disconnect(); socket.removeAllListeners(); };
  }, [roomId, socket]);
  const copyLink = () => navigator.clipboard?.writeText(window.location.href);
  if (error && !room) return <main className="center"><div className="brand"><Clapperboard/> WATCH PARTY</div><h1>Room tidak tersedia</h1><p>{error}</p></main>;
  return <main className="app">
    <header className="topbar"><a className="brand" href="/"><Clapperboard size={22}/> WATCH PARTY <span>V2</span></a><div className="connection"><i className={connected ? 'online' : ''}/>{connected ? 'Connected' : 'Connecting'}</div></header>
    {!room ? <div className="center"><div className="loader"/><p>Memuat room…</p></div> : <>
      <section className="room-heading"><div><div className="eyebrow"><Radio size={14}/> WATCH ROOM · {room.id}</div><h1>{room.title}</h1><p>Watch together, from your browser.</p></div><button className="ghost" onClick={copyLink}><Copy size={16}/> Salin link</button></section>
      <div className="layout"><section className="main-column"><VideoPlayer room={room} socket={socket}/><div className="source-line"><ShieldCheck size={15}/><span>Gunakan hanya sumber video yang kamu punya hak akses atau izin untuk putar dan bagikan.</span>{room.sourcePageUrl && <a href={room.sourcePageUrl} target="_blank" rel="noreferrer">Halaman sumber <ExternalLink size={13}/></a>}</div></section>
      <aside className="sidebar"><div className="side-title"><div><Users size={18}/> <b>Penonton</b></div><strong>{room.viewers?.length || 0}</strong></div><div className="viewer-list">{(room.viewers || []).map(v => <div className="viewer" key={v.id}><div className="avatar">{(v.name || '?').slice(0,1).toUpperCase()}</div><span>{v.name}</span>{v.discordUserId === undefined ? null : null}</div>)}{!room.viewers?.length && <p className="muted">Belum ada penonton terhubung.</p>}</div><div className="room-status"><span>Status player</span><b className={room.state?.playing ? 'playing' : ''}>{room.state?.playing ? '● Playing' : 'Ⅱ Paused'}</b></div><div className="hint"><b>Kontrol melalui Discord</b><p><code>/watch-control</code> untuk Play, Pause, Resume, Seek, dan Stop. Host room adalah pembuat room.</p></div></aside></div>
      {error && <p className="error">{error}</p>}
    </>}
    <footer>Watch Party v2 <span>•</span> Browser-based synchronized viewing</footer>
  </main>;
}
