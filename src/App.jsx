import { useState, useEffect } from 'react'

const KEY  = '61137ff3cfmsh3c349b4d3d87940p139f00jsn9c74e5c883b9'
const HOST = 'tennis-api-atp-wta-itf.p.rapidapi.com'
const BASE = 'https://tennis-api-atp-wta-itf.p.rapidapi.com/tennis/v2'

const get = async (url) => {
  const r = await fetch(url, { headers: { 'X-RapidAPI-Key': KEY, 'X-RapidAPI-Host': HOST } })
  if (!r.ok) throw new Error(`${r.status}`)
  const j = await r.json()
  return j?.data ?? j
}

// Cognomi da cercare nel ranking top 200
const TARGETS = [
  { surname: 'Sinner',     name: 'Jannik Sinner',     flag: '🇮🇹', tour: 'atp' },
  { surname: 'Alcaraz',    name: 'Carlos Alcaraz',    flag: '🇪🇸', tour: 'atp' },
  { surname: 'Djokovic',   name: 'Novak Djokovic',    flag: '🇷🇸', tour: 'atp' },
  { surname: 'Musetti',    name: 'Lorenzo Musetti',   flag: '🇮🇹', tour: 'atp' },
  { surname: 'Berrettini', name: 'Matteo Berrettini', flag: '🇮🇹', tour: 'atp' },
]

const fmtDate = (s) => {
  if (!s) return '–'
  const d = new Date(s)
  return isNaN(d) ? s : d.toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'numeric' })
}

const MOCK = {
  profile: { full_name:'Jannik Sinner', country:'Italy', birth_date:'2001-08-16', height:188, plays:'Destro', turned_pro:2018, coach:'Simone Vagnozzi' },
  ranking: { rank:1, points:11330, movement:0 },
  titles:  { total:18, current_year:4, grand_slams:2 },
  recent: [
    { tournament:'Australian Open', result:'W', opponent:'Zverev A.',    score:'6-3 7-6 6-3', date:'2025-01-26' },
    { tournament:'US Open',         result:'W', opponent:'Fritz T.',     score:'6-3 6-4 7-5', date:'2024-09-08' },
    { tournament:'Rotterdam',       result:'W', opponent:'De Minaur A.', score:'7-5 6-4',     date:'2025-02-09' },
    { tournament:'Miami Open',      result:'L', opponent:'Alcaraz C.',   score:'2-6 6-7',     date:'2024-04-07' },
    { tournament:'Cincinnati',      result:'L', opponent:'Fritz T.',     score:'4-6 4-6',     date:'2024-08-17' },
  ],
  upcoming: [
    { tournament:"Internazionali BNL d'Italia", surface:'Clay',  start:'2025-05-07', category:'Masters 1000' },
    { tournament:'Roland Garros',               surface:'Clay',  start:'2025-05-25', category:'Grand Slam'   },
    { tournament:'Wimbledon',                   surface:'Grass', start:'2025-06-30', category:'Grand Slam'   },
  ],
}

const Pill = ({ label, value, color='#00c896' }) => (
  <div style={{ background:'#0a0a0a', border:`1px solid ${color}22`, borderRadius:8, padding:'12px 16px', textAlign:'center', flex:1, minWidth:90 }}>
    <div style={{ color, fontSize:22, fontWeight:700, fontFamily:"'DM Mono',monospace", letterSpacing:-1 }}>{value}</div>
    <div style={{ color:'#666', fontSize:11, marginTop:3, textTransform:'uppercase', letterSpacing:1 }}>{label}</div>
  </div>
)

const Sec = ({ title, children }) => (
  <div style={{ marginTop:24 }}>
    <div style={{ fontSize:11, color:'#444', textTransform:'uppercase', letterSpacing:2, marginBottom:12, paddingBottom:8, borderBottom:'1px solid #1a1a1a' }}>{title}</div>
    {children}
  </div>
)

const Badge = ({ r }) => {
  const c = { W:'#00c896', L:'#ff4444', F:'#f59e0b', SF:'#f59e0b', QF:'#888' }[r] || '#555'
  return <span style={{ display:'inline-block', background:c+'22', color:c, border:`1px solid ${c}44`, borderRadius:4, padding:'1px 7px', fontSize:11, fontWeight:700, fontFamily:"'DM Mono',monospace", minWidth:28, textAlign:'center' }}>{r}</span>
}

export default function App() {
  const [players, setPlayers]   = useState([])
  const [sel, setSel]           = useState(null)
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [initDone, setInitDone] = useState(false)
  const [mock, setMock]         = useState(false)
  const [err, setErr]           = useState(null)

  // Carica top 200 ranking e trova gli ID per cognome esatto
  useEffect(() => {
    const init = async () => {
      try {
        // Prendi le prime 2 pagine del ranking singolare (100+100)
        const [p1, p2] = await Promise.allSettled([
          get(`${BASE}/atp/ranking/singles?pageSize=100&pageNo=1`),
          get(`${BASE}/atp/ranking/singles?pageSize=100&pageNo=2`),
        ])
        const r1 = p1.status==='fulfilled' ? (Array.isArray(p1.value) ? p1.value : p1.value?.rankings || p1.value?.players || []) : []
        const r2 = p2.status==='fulfilled' ? (Array.isArray(p2.value) ? p2.value : p2.value?.rankings || p2.value?.players || []) : []
        const allRanked = [...r1, ...r2]

        if (allRanked.length === 0) throw new Error('Ranking vuoto')

        const resolved = TARGETS.map(t => {
          const match = allRanked.find(p =>
            (p.name || p.playerName || '').toLowerCase().includes(t.surname.toLowerCase())
          )
          if (match) return { ...t, id: match.id || match.playerId, name: match.name || match.playerName, rank: match.currentRank || match.rank }
          return null
        }).filter(Boolean)

        if (resolved.length === 0) throw new Error('Nessun giocatore trovato nel ranking')
        setPlayers(resolved)
        setSel(resolved[0])
      } catch(e) {
        // fallback visibile: mostra errore init
        setErr(`Init fallita: ${e.message}`)
        setPlayers(TARGETS.map(t => ({ ...t, id: null })))
        setSel({ ...TARGETS[0], id: null })
      } finally {
        setInitDone(true)
      }
    }
    init()
  }, [])

  // Carica dati giocatore selezionato
  useEffect(() => {
    if (!sel || !initDone) return
    if (!sel.id) { setData(MOCK); setMock(true); setLoading(false); return }

    const load = async () => {
      setLoading(true); setErr(null); setData(null); setMock(false)
      try {
        const t = sel.tour
        const [pR, tR, mR, fR] = await Promise.allSettled([
          get(`${BASE}/${t}/player/profile/${sel.id}?include=ranking,country`),
          get(`${BASE}/${t}/player/titles/${sel.id}`),
          get(`${BASE}/${t}/player/past-matches/${sel.id}?pageSize=5&filter=PlayerGroup:singles`),
          get(`${BASE}/${t}/fixtures/player/${sel.id}?include=tournament,round&pageSize=3&filter=PlayerGroup:singles`),
        ])

        const profile  = pR.status==='fulfilled' ? pR.value : null
        const titles   = tR.status==='fulfilled' ? (Array.isArray(tR.value)?tR.value:tR.value?.data||[]) : []
        const past     = mR.status==='fulfilled' ? (Array.isArray(mR.value)?mR.value:mR.value?.data||[]) : []
        const fixtures = fR.status==='fulfilled' ? (Array.isArray(fR.value)?fR.value:fR.value?.data||[]) : []

        if (!profile) throw new Error('Profilo non trovato')

        const yr    = new Date().getFullYear()
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
            rank:     profile.currentRank ?? sel.rank ?? '–',
            points:   profile.points ?? '–',
            movement: profile.progress ?? 0,
          },
          titles: {
            total:        titles.length || '–',
            current_year: titles.filter(tl => { const y=tl.year||(tl.date?new Date(tl.date).getFullYear():0); return y===yr }).length,
            grand_slams:  titles.filter(tl => slams.some(s => (tl.tournament?.name||tl.name||'').includes(s))).length,
          },
          recent: past.slice(0,5).map(m => {
            const won = String(m.player1Id)===String(sel.id)
            return {
              tournament: m.tournament?.name||'–',
              result:     won?'W':'L',
              opponent:   won?(m.player2?.name||'–'):(m.player1?.name||'–'),
              score:      m.result||'–',
              date:       m.date||'',
            }
          }),
          upcoming: fixtures.slice(0,3).map(f => ({
            tournament: f.tournament?.name||'–',
            surface:    f.tournament?.court?.name||'–',
            start:      f.date||'',
            category:   f.tournament?.rank?.name||'–',
          })),
        })
      } catch(e) {
        setData(MOCK); setMock(true); setErr(`Dati non disponibili — mostro dati demo`)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sel, initDone])

  if (!initDone) return (
    <div style={{ background:'#050505', color:'#444', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'monospace', fontSize:13 }}>
      🎾 Caricamento ranking...
    </div>
  )

  return (
    <div style={{ fontFamily:"'DM Sans',-apple-system,sans-serif", background:'#050505', color:'#e8e8e8', minHeight:'100vh', padding:'0 0 40px' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');*{box-sizing:border-box;margin:0;padding:0}.pb{transition:all .15s}.pb:hover{border-color:#00c89644!important;background:#0d1f1a!important}.mr:hover{background:#0d0d0d!important}`}</style>

      <div style={{ borderBottom:'1px solid #111', padding:'16px 20px', display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:18 }}>🎾</span>
        <span style={{ fontSize:13, color:'#444', letterSpacing:1, textTransform:'uppercase' }}>Tennis Player Stats</span>
        {mock && <span style={{ marginLeft:'auto', fontSize:10, background:'#f59e0b22', color:'#f59e0b', border:'1px solid #f59e0b33', borderRadius:4, padding:'2px 8px' }}>DEMO</span>}
      </div>

      <div style={{ padding:'16px 20px', overflowX:'auto' }}>
        <div style={{ display:'flex', gap:8, minWidth:'max-content' }}>
          {players.map(p => (
            <button key={p.surname} className="pb" onClick={() => setSel(p)} style={{
              background: sel?.surname===p.surname ? '#0d1f1a' : 'transparent',
              border: `1px solid ${sel?.surname===p.surname ? '#00c896' : '#1a1a1a'}`,
              color: sel?.surname===p.surname ? '#00c896' : '#666',
              borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:13,
              whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:6,
            }}>
              <span>{p.flag}</span><span>{p.surname}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:'0 20px' }}>
        {loading && (
          <div style={{ textAlign:'center', padding:60, color:'#333' }}>
            <div style={{ fontSize:28, marginBottom:12 }}>⏳</div>
            <div style={{ fontSize:13 }}>Caricamento...</div>
          </div>
        )}
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
              <Pill label="Titoli totali" value={data.titles.total}        color="#f59e0b" />
              <Pill label="Titoli 2025"   value={data.titles.current_year} color="#f59e0b" />
              <Pill label="Slam"          value={data.titles.grand_slams}  color="#f59e0b" />
            </div>
            {!!data.ranking.movement && (
              <div style={{ marginTop:10, fontSize:12, color:data.ranking.movement>0?'#00c896':'#ff4444' }}>
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

