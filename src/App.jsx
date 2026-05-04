import { useState, useEffect } from 'react'

const RAPIDAPI_KEY = '61137ff3cfmsh3c349b4d3d87940p139f00jsn9c74e5c883b9'
const API_HOST = 'tennis-api-atp-wta-itf.p.rapidapi.com'
const BASE = 'https://tennis-api-atp-wta-itf.p.rapidapi.com/tennis/v2'

const get = async (url) => {
  const r = await fetch(url, { headers: { 'X-RapidAPI-Key': RAPIDAPI_KEY, 'X-RapidAPI-Host': API_HOST } })
  if (!r.ok) throw new Error(`${r.status}`)
  const j = await r.json()
  // L'API wrappa tutto in {"data": ...}
  return j?.data ?? j
}

// Giocatori — gli ID reali li troviamo via search al primo caricamento
const PLAYER_NAMES = [
  { query: 'Sinner',     name: 'Jannik Sinner',     flag: '🇮🇹', tour: 'atp' },
  { query: 'Alcaraz',    name: 'Carlos Alcaraz',    flag: '🇪🇸', tour: 'atp' },
  { query: 'Djokovic',   name: 'Novak Djokovic',    flag: '🇷🇸', tour: 'atp' },
  { query: 'Musetti',    name: 'Lorenzo Musetti',   flag: '🇮🇹', tour: 'atp' },
  { query: 'Berrettini', name: 'Matteo Berrettini', flag: '🇮🇹', tour: 'atp' },
]

const fmtDate = (s) => {
  if (!s) return '–'
  const d = new Date(s)
  return isNaN(d) ? s : d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const MOCK = {
  profile: { full_name: 'Jannik Sinner', country: 'Italy', birth_date: '2001-08-16', height: 188, plays: 'Destro', turned_pro: 2018, coach: 'Simone Vagnozzi' },
  ranking: { rank: 1, points: 11330, movement: 0 },
  titles: { total: 18, current_year: 4, grand_slams: 2 },
  recent: [
    { tournament: 'Australian Open', result: 'W', opponent: 'Zverev A.', score: '6-3 7-6 6-3', date: '2025-01-26' },
    { tournament: 'US Open',         result: 'W', opponent: 'Fritz T.',  score: '6-3 6-4 7-5', date: '2024-09-08' },
    { tournament: 'Rotterdam',       result: 'W', opponent: 'De Minaur A.', score: '7-5 6-4', date: '2025-02-09' },
    { tournament: 'Miami Open',      result: 'L', opponent: 'Alcaraz C.', score: '2-6 6-7',  date: '2024-04-07' },
    { tournament: 'Cincinnati',      result: 'L', opponent: 'Fritz T.',  score: '4-6 4-6',   date: '2024-08-17' },
  ],
  upcoming: [
    { tournament: "Internazionali BNL d'Italia", surface: 'Clay',  start: '2025-05-07', category: 'Masters 1000' },
    { tournament: 'Roland Garros',               surface: 'Clay',  start: '2025-05-25', category: 'Grand Slam'   },
    { tournament: 'Wimbledon',                   surface: 'Grass', start: '2025-06-30', category: 'Grand Slam'   },
  ],
}

const Pill = ({ label, value, color = '#00c896' }) => (
  <div style={{ background: '#0a0a0a', border: `1px solid ${color}22`, borderRadius: 8, padding: '12px 16px', textAlign: 'center', flex: 1, minWidth: 90 }}>
    <div style={{ color, fontSize: 22, fontWeight: 700, fontFamily: "'DM Mono',monospace", letterSpacing: -1 }}>{value}</div>
    <div style={{ color: '#666', fontSize: 11, marginTop: 3, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
  </div>
)

const Sec = ({ title, children }) => (
  <div style={{ marginTop: 24 }}>
    <div style={{ fontSize: 11, color: '#444', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #1a1a1a' }}>{title}</div>
    {children}
  </div>
)

const Badge = ({ r }) => {
  const c = { W: '#00c896', L: '#ff4444', F: '#f59e0b', SF: '#f59e0b', QF: '#888' }[r] || '#555'
  return <span style={{ display: 'inline-block', background: c+'22', color: c, border: `1px solid ${c}44`, borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono',monospace", minWidth: 28, textAlign: 'center' }}>{r}</span>
}

export default function App() {
  const [players, setPlayers] = useState([])   // con ID reali dopo search
  const [sel, setSel] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mock, setMock] = useState(false)
  const [err, setErr] = useState(null)

  // Step 1: cerca gli ID reali via /search
  useEffect(() => {
    const resolveIds = async () => {
      try {
        const resolved = await Promise.all(
          PLAYER_NAMES.map(async (p) => {
            try {
              const res = await get(`${BASE}/atp/search?query=${encodeURIComponent(p.query)}`)
              const list = Array.isArray(res) ? res : (res?.players || [])
              // Trova il match per cognome esatto
              const match = list.find(r =>
                r.name?.toLowerCase().includes(p.query.toLowerCase())
              )
              return match ? { ...p, id: match.id, name: match.name } : null
            } catch { return null }
          })
        )
        const valid = resolved.filter(Boolean)
        if (valid.length === 0) throw new Error('Nessun giocatore trovato')
        setPlayers(valid)
        setSel(valid[0])
      } catch (e) {
        // Fallback: usa MOCK con ID noti dalla doc
        const fallback = PLAYER_NAMES.map((p, i) => ({ ...p, id: [106421,104925,100644,103819,105526][i] }))
        setPlayers(fallback)
        setSel(fallback[0])
      }
    }
    resolveIds()
  }, [])

  // Step 2: carica dati giocatore selezionato
  useEffect(() => {
    if (!sel) return
    const load = async () => {
      setLoading(true); setErr(null); setData(null); setMock(false)
      try {
        const t = sel.tour
        const [profileRaw, titlesRaw, pastRaw, fixRaw] = await Promise.allSettled([
          get(`${BASE}/${t}/player/profile/${sel.id}?include=ranking,country`),
          get(`${BASE}/${t}/player/titles/${sel.id}`),
          get(`${BASE}/${t}/player/past-matches/${sel.id}?pageSize=5`),
          get(`${BASE}/${t}/fixtures/player/${sel.id}?include=tournament,round&pageSize=3`),
        ])

        const profile = profileRaw.status === 'fulfilled' ? profileRaw.value : null
        if (!profile || profile.playerStatus === 'Inactive' && !profile.currentRank) {
          throw new Error(`ID ${sel.id} non valido per questo giocatore`)
        }

        const titles   = titlesRaw.status === 'fulfilled' ? (Array.isArray(titlesRaw.value) ? titlesRaw.value : titlesRaw.value?.data || []) : []
        const past     = pastRaw.status   === 'fulfilled' ? (Array.isArray(pastRaw.value)   ? pastRaw.value   : pastRaw.value?.data   || []) : []
        const fixtures = fixRaw.status    === 'fulfilled' ? (Array.isArray(fixRaw.value)    ? fixRaw.value    : fixRaw.value?.data    || []) : []

        const yr = new Date().getFullYear()
        const slams = ['Australian Open','Roland Garros','Wimbledon','US Open']

        setData({
          profile: {
            full_name:  profile.name || sel.name,
            country:    profile.country?.name || profile.countryAcr || '',
            birth_date: profile.birthday || '',
            height:     profile.height || '',
            plays:      profile.plays || profile.hand || '',
            turned_pro: profile.turnedPro || '',
            coach:      profile.coach || '',
          },
          ranking: {
            rank:     profile.currentRank ?? '–',
            points:   profile.points ?? '–',
            movement: profile.progress ?? 0,
          },
          titles: {
            total:        titles.length || '–',
            current_year: titles.filter(t => { const y = t.year || (t.date ? new Date(t.date).getFullYear() : 0); return y === yr }).length,
            grand_slams:  titles.filter(t => slams.some(s => (t.tournament?.name || t.name || '').includes(s))).length,
          },
          recent: past.slice(0,5).map(m => {
            const won = String(m.player1Id) === String(sel.id)
            return {
              tournament: m.tournament?.name || '–',
              result:     won ? 'W' : 'L',
              opponent:   won ? (m.player2?.name||'–') : (m.player1?.name||'–'),
              score:      m.result || '–',
              date:       m.date || '',
            }
          }),
          upcoming: fixtures.slice(0,3).map(f => ({
            tournament: f.tournament?.name || '–',
            surface:    f.tournament?.court?.name || '–',
            start:      f.date || '',
            category:   f.tournament?.rank?.name || '–',
          })),
        })
      } catch (e) {
        setData(MOCK); setMock(true); setErr(`API: ${e.message} — dati demo`)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sel])

  if (!sel) return <div style={{ background:'#050505', color:'#444', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'monospace' }}>Inizializzazione...</div>

  return (
    <div style={{ fontFamily:"'DM Sans',-apple-system,sans-serif", background:'#050505', color:'#e8e8e8', minHeight:'100vh', padding:'0 0 40px' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');*{box-sizing:border-box;margin:0;padding:0}.pb:hover{border-color:#00c89644!important;background:#0d1f1a!important}.mr:hover{background:#0d0d0d!important}`}</style>

      <div style={{ borderBottom:'1px solid #111', padding:'16px 20px', display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:18 }}>🎾</span>
        <span style={{ fontSize:13, color:'#444', letterSpacing:1, textTransform:'uppercase' }}>Tennis Player Stats</span>
        {mock && <span style={{ marginLeft:'auto', fontSize:10, background:'#f59e0b22', color:'#f59e0b', border:'1px solid #f59e0b33', borderRadius:4, padding:'2px 8px' }}>DEMO</span>}
      </div>

      <div style={{ padding:'16px 20px', overflowX:'auto' }}>
        <div style={{ display:'flex', gap:8, minWidth:'max-content' }}>
          {players.map(p => (
            <button key={p.id} className="pb" onClick={() => setSel(p)} style={{
              background: sel.id===p.id ? '#0d1f1a' : 'transparent',
              border: `1px solid ${sel.id===p.id ? '#00c896' : '#1a1a1a'}`,
              color: sel.id===p.id ? '#00c896' : '#666',
              borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:13,
              whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:6,
            }}>
              <span>{p.flag}</span><span>{p.name.split(' ').pop()}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:'0 20px' }}>
        {loading && <div style={{ textAlign:'center', padding:60, color:'#333' }}><div style={{ fontSize:28, marginBottom:12 }}>⏳</div><div style={{ fontSize:13 }}>Caricamento...</div></div>}
        {err && <div style={{ background:'#1a0a0a', border:'1px solid #ff444422', borderRadius:8, padding:12, color:'#ff6666', fontSize:12, marginBottom:12 }}>⚠️ {err}</div>}

        {data && !loading && <>
          <div style={{ display:'flex', alignItems:'center', gap:16, padding:'20px 0 0' }}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:'#0d1f1a', border:'2px solid #00c89633', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0 }}>{sel.flag}</div>
            <div>
              <div style={{ fontSize:22, fontWeight:600, letterSpacing:-0.5 }}>{data.profile.full_name}</div>
              <div style={{ fontSize:12, color:'#444', marginTop:2 }}>
                {data.profile.country}
                {data.profile.birth_date && ` · Nato il ${fmtDate(data.profile.birth_date)}`}
                {data.profile.height && ` · ${data.profile.height} cm`}
              </div>
            </div>
          </div>

          <Sec title="Classifica & statistiche">
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <Pill label="Ranking ATP" value={`#${data.ranking.rank}`} />
              <Pill label="Punti" value={typeof data.ranking.points==='number' ? data.ranking.points.toLocaleString('it-IT') : data.ranking.points} />
              <Pill label="Titoli totali" value={data.titles.total} color="#f59e0b" />
              <Pill label="Titoli 2025"  value={data.titles.current_year} color="#f59e0b" />
              <Pill label="Slam"         value={data.titles.grand_slams}  color="#f59e0b" />
            </div>
            {data.ranking.movement !== 0 && (
              <div style={{ marginTop:10, fontSize:12, color: data.ranking.movement>0?'#00c896':'#ff4444' }}>
                {data.ranking.movement>0?'▲':'▼'} {Math.abs(data.ranking.movement)} posizioni questa settimana
              </div>
            )}
          </Sec>

          {data.recent?.length > 0 && (
            <Sec title="Ultimi risultati">
              {data.recent.map((m,i) => (
                <div key={i} className="mr" style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:6, fontSize:13 }}>
                  <Badge r={m.result} />
                  <span style={{ color:'#ccc', flex:1 }}>{m.tournament}</span>
                  <span style={{ color:'#555', fontSize:12 }}>vs {m.opponent}</span>
                  {m.score && m.score!=='–' && <span style={{ color:'#333', fontSize:11, fontFamily:"'DM Mono',monospace" }}>{m.score}</span>}
                  {m.date && <span style={{ color:'#2a2a2a', fontSize:11 }}>{fmtDate(m.date)}</span>}
                </div>
              ))}
            </Sec>
          )}

          {data.upcoming?.length > 0 && (
            <Sec title="Prossimi tornei">
              {data.upcoming.map((t,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'#0a0a0a', border:'1px solid #111', borderRadius:8, marginBottom:8 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, color:'#ccc' }}>{t.tournament}</div>
                    <div style={{ fontSize:11, color:'#444', marginTop:2 }}>{t.category}{t.surface&&t.surface!=='–'&&` · ${t.surface}`}</div>
                  </div>
                  {t.start && <div style={{ fontSize:12, color:'#00c89688', fontFamily:"'DM Mono',monospace", whiteSpace:'nowrap' }}>{fmtDate(t.start)}</div>}
                </div>
              ))}
            </Sec>
          )}

          {(data.profile.plays||data.profile.turned_pro||data.profile.coach) && (
            <Sec title="Profilo">
              {[['Gioco',data.profile.plays],['Pro dal',data.profile.turned_pro],['Coach',data.profile.coach]]
                .filter(([,v])=>v)
                .map(([k,v]) => (
                  <div key={k} style={{ display:'flex', gap:12, fontSize:13, marginBottom:6 }}>
                    <span style={{ color:'#333', minWidth:80 }}>{k}</span>
                    <span style={{ color:'#999' }}>{v}</span>
                  </div>
                ))}
            </Sec>
          )}
        </>}
      </div>

      <div style={{ marginTop:32, padding:'16px 20px 0', borderTop:'1px solid #0d0d0d', display:'flex', justifyContent:'space-between' }}>
        <span style={{ fontSize:11, color:'#222' }}>universosportivo.com</span>
        <span style={{ fontSize:11, color:'#222' }}>Dati via Tennis API · RapidAPI</span>
      </div>
    </div>
  )
}

