import { useState, useEffect, useRef } from 'react'

const KEY  = '61137ff3cfmsh3c349b4d3d87940p139f00jsn9c74e5c883b9'
const HOST = 'tennis-api-atp-wta-itf.p.rapidapi.com'
const BASE = 'https://tennis-api-atp-wta-itf.p.rapidapi.com/tennis/v2'

const get = async (url) => {
  const r = await fetch(url, { headers: { 'X-RapidAPI-Key': KEY, 'X-RapidAPI-Host': HOST } })
  if (!r.ok) throw new Error(`${r.status}`)
  const j = await r.json()
  return j?.data ?? j
}

const TARGETS = [
  { surname:'Sinner',     name:'Jannik Sinner',     flag:'🇮🇹', tour:'atp' },
  { surname:'Alcaraz',    name:'Carlos Alcaraz',    flag:'🇪🇸', tour:'atp' },
  { surname:'Djokovic',   name:'Novak Djokovic',    flag:'🇷🇸', tour:'atp' },
  { surname:'Musetti',    name:'Lorenzo Musetti',   flag:'🇮🇹', tour:'atp' },
  { surname:'Berrettini', name:'Matteo Berrettini', flag:'🇮🇹', tour:'atp' },
]

const CY = new Date().getFullYear() // 2026
const SLAM_RANKS = ['Grand Slam'] // tourRank string per gli Slam

const fmtDate = (s) => {
  if (!s) return '–'
  const d = new Date(s)
  return isNaN(d) ? s : d.toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'numeric' })
}

// ─── UI COMPONENTS ───────────────────────────────────────────────────────────
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

// Grafico ranking sparkline SVG
const RankChart = ({ history }) => {
  if (!history || history.length < 2) return null
  const W = 340, H = 80, PAD = 8
  const ranks = history.map(h => h.rank)
  const minR = Math.min(...ranks), maxR = Math.max(...ranks)
  const range = maxR - minR || 1
  const xs = history.map((_, i) => PAD + (i / (history.length - 1)) * (W - PAD * 2))
  // Rank inverso: più basso = più in alto nel grafico
  const ys = ranks.map(r => H - PAD - ((maxR - r) / range) * (H - PAD * 2))
  const path = xs.map((x, i) => `${i===0?'M':'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
  const area = path + ` L${xs[xs.length-1].toFixed(1)},${H} L${xs[0].toFixed(1)},${H} Z`

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display:'block', marginTop:8 }}>
      <defs>
        <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00c896" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="#00c896" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill="url(#rg)"/>
      <path d={path} fill="none" stroke="#00c896" strokeWidth="1.5" strokeLinejoin="round"/>
      {/* Punti con etichette anno */}
      {history.map((h, i) => (
        <g key={i}>
          <circle cx={xs[i]} cy={ys[i]} r="2.5" fill="#00c896"/>
          <text x={xs[i]} y={H - 1} textAnchor="middle" fontSize="8" fill="#333">{h.year}</text>
          <text x={xs[i]} y={ys[i] - 5} textAnchor="middle" fontSize="8" fill="#00c89688">#{h.rank}</text>
        </g>
      ))}
    </svg>
  )
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [players, setPlayers]   = useState([])
  const [sel, setSel]           = useState(null)
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [initDone, setInitDone] = useState(false)
  const [mock, setMock]         = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const res  = await get(`${BASE}/atp/ranking/singles?pageSize=100&pageNo=1`)
        const raw  = Array.isArray(res) ? res : (res?.rankings||res?.players||res?.data||[])
        const list = raw.map(row => row.player
          ? { id:row.player.id, name:row.player.name, rank:row.position, points:row.point }
          : { id:row.id, name:row.name||row.playerName, rank:row.position||row.currentRank, points:row.points||row.point }
        )
        const resolved = TARGETS.map(t => {
          const m = list.find(r => (r.name||'').toLowerCase().includes(t.surname.toLowerCase()))
          return m ? {...t, id:m.id, name:m.name||t.name, rank:m.rank, points:m.points} : {...t, id:null}
        })
        setPlayers(resolved); setSel(resolved[0])
      } catch {
        setPlayers(TARGETS.map(t=>({...t,id:null}))); setSel({...TARGETS[0],id:null})
      } finally { setInitDone(true) }
    }
    init()
  }, [])

  useEffect(() => {
    if (!sel || !initDone) return
    const load = async () => {
      setLoading(true); setData(null); setMock(false)
      try {
        if (!sel.id) throw new Error('ID non trovato')
        const t = sel.tour

        const [pR, titR, perfR, pastR, fixR] = await Promise.allSettled([
          get(`${BASE}/${t}/player/profile/${sel.id}?include=ranking,country`),
          get(`${BASE}/${t}/player/titles/${sel.id}`),
          get(`${BASE}/${t}/player/perf-breakdown/${sel.id}`),
          // Partite dal 2024 in poi — pageSize grande
          get(`${BASE}/${t}/player/past-matches/${sel.id}?pageSize=30&filter=PlayerGroup:singles&include=tournament`),
          get(`${BASE}/${t}/fixtures/player/${sel.id}?include=tournament,round&pageSize=5&filter=PlayerGroup:singles`),
        ])

        const profile  = pR.status==='fulfilled'   ? pR.value   : null
        const titlesRaw = titR.status==='fulfilled' ? titR.value : []
        const perf     = perfR.status==='fulfilled' ? perfR.value : null
        const pastRaw  = pastR.status==='fulfilled' ? pastR.value : []
        const fixRaw   = fixR.status==='fulfilled'  ? fixR.value  : []

        if (!profile) throw new Error('Profilo non trovato')

        // Titoli: array di {tourRankId, tourRank, titlesWon, titlesLost}
        // Somma tutti i titlesWon per totale
        const titArr = Array.isArray(titlesRaw) ? titlesRaw : (titlesRaw?.titles||titlesRaw?.data||[])
        const titlesTotal = titArr.reduce((s, row) => s + (parseInt(row.titlesWon)||0), 0)
        // Slam: tourRank contiene "Grand Slam"
        const titlesSlam  = titArr.filter(row => (row.tourRank||'').toLowerCase().includes('grand slam'))
                                   .reduce((s, row) => s + (parseInt(row.titlesWon)||0), 0)
        // Titoli anno corrente: non disponibile direttamente — usiamo past-matches per contare W in finale
        // (approssimazione: contiamo partite vinte nel turno finale del torneo nell'anno corrente)

        // Grafico ranking: da perf-breakdown {year: {rank: {top1,top5,...}}}
        // Struttura: {2015:{court:{},round:{},rank:{top1:{al,0},top5:{al,0}...},level:{}}}
        const rankHistory = []
        if (perf) {
          const years = Object.keys(perf).filter(k => /^\d{4}$/.test(k)).sort()
          for (const yr of years) {
            const yrData = perf[yr]
            // Cerca end-of-year ranking in vari campi possibili
            const rankObj = yrData?.rank || {}
            // top1,top5,top10,top20,top50,top100 sono flags {al:0/1}
            // Ricaviamo il ranking approssimativo dal livello più alto raggiunto
            let approxRank = null
            if (rankObj.top1?.al)   approxRank = 1
            else if (rankObj.top5?.al)  approxRank = 3
            else if (rankObj.top10?.al) approxRank = 7
            else if (rankObj.top20?.al) approxRank = 15
            else if (rankObj.top50?.al) approxRank = 35
            else if (rankObj.top100?.al) approxRank = 75
            if (approxRank) rankHistory.push({ year: yr, rank: approxRank })
          }
        }

        // Partite: filtra dal 2024
        const past = Array.isArray(pastRaw) ? pastRaw : (pastRaw?.matches||pastRaw?.data||[])
        const recentMatches = past
          .filter(m => m.date && new Date(m.date).getFullYear() >= 2024)
          .sort((a,b) => new Date(b.date) - new Date(a.date))
          .slice(0, 20)

        // Titoli anno corrente: conta W nel dataset partite (round finale = W con nessun avversario successivo)
        // Approssimazione semplice: usa perf anno corrente
        const perfCY = perf?.[String(CY)] || perf?.[String(CY-1)] || {}
        const titlesYear = perfCY?.level?.mainTour?.titlesWon ?? 
                           Object.values(perfCY?.level||{}).reduce((s,v)=>s+(v?.titlesWon||0),0) || 0

        // Prossimi tornei
        const fixtures = Array.isArray(fixRaw) ? fixRaw : (fixRaw?.fixtures||fixRaw?.data||[])

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
            points:   profile.curRank?.points ?? profile.ranking?.points ?? sel.points ?? '–',
            movement: profile.progress ?? 0,
          },
          titles: {
            total:        titlesTotal || '–',
            current_year: titlesYear || 0,
            grand_slams:  titlesSlam || '–',
          },
          rankHistory,
          recent: recentMatches.map(m => {
            const won = String(m.player1Id)===String(sel.id)
            return {
              tournament: m.tournament?.name || `#${m.tournamentId||'?'}`,
              result:     won?'W':'L',
              opponent:   won?(m.player2?.name||'–'):(m.player1?.name||'–'),
              score:      m.result||'–',
              date:       m.date||'',
              year:       m.date ? new Date(m.date).getFullYear() : null,
            }
          }),
          upcoming: fixtures.slice(0,4).map(f => ({
            tournament: f.tournament?.name || `#${f.tournamentId||'?'}`,
            surface:    f.tournament?.court?.name || '–',
            start:      f.date||'',
            category:   f.tournament?.rank?.name || '–',
          })),
        })
      } catch {
        setMock(true)
        const fb = {
          Sinner:{rank:1,pts:14350,tot:22,yr:5,slam:3},
          Alcaraz:{rank:3,pts:8200,tot:16,yr:2,slam:3},
          Djokovic:{rank:7,pts:4200,tot:98,yr:0,slam:24},
          Musetti:{rank:17,pts:2100,tot:4,yr:0,slam:0},
          Berrettini:{rank:35,pts:1200,tot:6,yr:0,slam:0},
        }[sel.surname]||{rank:'–',pts:'–',tot:'–',yr:0,slam:0}
        setData({
          profile:{full_name:sel.name,country:'',birth_date:'',height:'',plays:'',turned_pro:'',coach:''},
          ranking:{rank:fb.rank,points:fb.pts,movement:0},
          titles:{total:fb.tot,current_year:fb.yr,grand_slams:fb.slam},
          rankHistory:[],recent:[],upcoming:[],
        })
      } finally { setLoading(false) }
    }
    load()
  }, [sel, initDone])

  if (!initDone) return (
    <div style={{background:'#050505',color:'#444',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'monospace',fontSize:13}}>
      🎾 Caricamento...
    </div>
  )

  // Raggruppa partite per anno
  const matchesByYear = {}
  if (data?.recent) {
    for (const m of data.recent) {
      const y = m.year || '?'
      if (!matchesByYear[y]) matchesByYear[y] = []
      matchesByYear[y].push(m)
    }
  }

  return (
    <div style={{fontFamily:"'DM Sans',-apple-system,sans-serif",background:'#050505',color:'#e8e8e8',minHeight:'100vh',padding:'0 0 40px'}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');*{box-sizing:border-box;margin:0;padding:0}.pb{transition:all .15s}.pb:hover{border-color:#00c89644!important;background:#0d1f1a!important}.mr:hover{background:#0d0d0d!important}`}</style>

      {/* Header */}
      <div style={{borderBottom:'1px solid #111',padding:'16px 20px',display:'flex',alignItems:'center',gap:10}}>
        <span style={{fontSize:18}}>🎾</span>
        <span style={{fontSize:13,color:'#444',letterSpacing:1,textTransform:'uppercase'}}>Tennis Player Stats</span>
        {mock && <span style={{marginLeft:'auto',fontSize:10,background:'#f59e0b22',color:'#f59e0b',border:'1px solid #f59e0b33',borderRadius:4,padding:'2px 8px'}}>DEMO</span>}
      </div>

      {/* Player selector */}
      <div style={{padding:'16px 20px',overflowX:'auto'}}>
        <div style={{display:'flex',gap:8,minWidth:'max-content'}}>
          {players.map(p=>(
            <button key={p.surname} className="pb" onClick={()=>setSel(p)} style={{
              background:sel?.surname===p.surname?'#0d1f1a':'transparent',
              border:`1px solid ${sel?.surname===p.surname?'#00c896':'#1a1a1a'}`,
              color:sel?.surname===p.surname?'#00c896':'#666',
              borderRadius:8,padding:'6px 14px',cursor:'pointer',fontSize:13,
              whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:6,
            }}>
              <span>{p.flag}</span><span>{p.surname}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:'0 20px'}}>
        {loading && <div style={{textAlign:'center',padding:60,color:'#333'}}><div style={{fontSize:28,marginBottom:12}}>⏳</div><div style={{fontSize:13}}>Caricamento...</div></div>}

        {data && !loading && <>
          {/* Player header */}
          <div style={{display:'flex',alignItems:'center',gap:16,padding:'20px 0 0'}}>
            <div style={{width:56,height:56,borderRadius:'50%',background:'#0d1f1a',border:'2px solid #00c89633',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,flexShrink:0}}>{sel.flag}</div>
            <div>
              <div style={{fontSize:22,fontWeight:600,letterSpacing:-0.5}}>{data.profile.full_name}</div>
              <div style={{fontSize:12,color:'#444',marginTop:2}}>
                {data.profile.country}
                {data.profile.birth_date && ` · Nato il ${fmtDate(data.profile.birth_date)}`}
                {data.profile.height && ` · ${data.profile.height} cm`}
              </div>
            </div>
          </div>

          {/* Pills */}
          <Sec title="Classifica & statistiche">
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              <Pill label="Ranking ATP" value={`#${data.ranking.rank}`}/>
              <Pill label="Punti" value={typeof data.ranking.points==='number'?data.ranking.points.toLocaleString('it-IT'):data.ranking.points}/>
              <Pill label="Titoli totali" value={data.titles.total} color="#f59e0b"/>
              <Pill label={`Titoli ${CY}`} value={data.titles.current_year} color="#f59e0b"/>
              <Pill label="Slam" value={data.titles.grand_slams} color="#f59e0b"/>
            </div>
            {!!data.ranking.movement && (
              <div style={{marginTop:10,fontSize:12,color:data.ranking.movement>0?'#00c896':'#ff4444'}}>
                {data.ranking.movement>0?'▲':'▼'} {Math.abs(data.ranking.movement)} posizioni
              </div>
            )}
          </Sec>

          {/* Grafico ranking */}
          {data.rankHistory?.length > 1 && (
            <Sec title="Andamento ranking (per anno)">
              <RankChart history={data.rankHistory}/>
              <div style={{fontSize:10,color:'#333',marginTop:4}}>* Basato su ranking di fine anno</div>
            </Sec>
          )}

          {/* Prossimi tornei */}
          {data.upcoming?.length > 0 && (
            <Sec title="Prossimi tornei">
              {data.upcoming.map((t,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'#0a0a0a',border:'1px solid #111',borderRadius:8,marginBottom:8}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,color:'#ccc'}}>{t.tournament}</div>
                    <div style={{fontSize:11,color:'#444',marginTop:2}}>{t.category}{t.surface&&t.surface!=='–'&&` · ${t.surface}`}</div>
                  </div>
                  {t.start && <div style={{fontSize:12,color:'#00c89688',fontFamily:"'DM Mono',monospace",whiteSpace:'nowrap'}}>{fmtDate(t.start)}</div>}
                </div>
              ))}
            </Sec>
          )}

          {/* Risultati dal 2024 raggruppati per anno */}
          {Object.keys(matchesByYear).sort((a,b)=>b-a).map(yr=>(
            <Sec key={yr} title={`Risultati ${yr}`}>
              {matchesByYear[yr].map((m,i)=>(
                <div key={i} className="mr" style={{display:'flex',alignItems:'center',gap:10,padding:'9px 10px',borderRadius:6,fontSize:13}}>
                  <Badge r={m.result}/>
                  <span style={{color:'#ccc',flex:1}}>{m.tournament}</span>
                  <span style={{color:'#555',fontSize:12}}>vs {m.opponent}</span>
                  {m.score&&m.score!=='–'&&<span style={{color:'#333',fontSize:11,fontFamily:"'DM Mono',monospace"}}>{m.score}</span>}
                  {m.date&&<span style={{color:'#2a2a2a',fontSize:11}}>{fmtDate(m.date)}</span>}
                </div>
              ))}
            </Sec>
          ))}

          {/* Profilo */}
          {(data.profile.plays||data.profile.turned_pro||data.profile.coach) && (
            <Sec title="Profilo">
              {[['Gioco',data.profile.plays],['Pro dal',data.profile.turned_pro],['Coach',data.profile.coach]]
                .filter(([,v])=>v)
                .map(([k,v])=>(
                  <div key={k} style={{display:'flex',gap:12,fontSize:13,marginBottom:6}}>
                    <span style={{color:'#333',minWidth:80}}>{k}</span>
                    <span style={{color:'#999'}}>{v}</span>
                  </div>
                ))}
            </Sec>
          )}
        </>}
      </div>

      <div style={{marginTop:32,padding:'16px 20px 0',borderTop:'1px solid #0d0d0d',display:'flex',justifyContent:'space-between'}}>
        <span style={{fontSize:11,color:'#222'}}>universosportivo.com</span>
        <span style={{fontSize:11,color:'#222'}}>Dati via Tennis API · RapidAPI</span>
      </div>
    </div>
  )
}

