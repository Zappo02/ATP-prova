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

const TARGETS = [
  { surname:'Sinner',     name:'Jannik Sinner',     flag:'🇮🇹', tour:'atp' },
  { surname:'Alcaraz',    name:'Carlos Alcaraz',    flag:'🇪🇸', tour:'atp' },
  { surname:'Djokovic',   name:'Novak Djokovic',    flag:'🇷🇸', tour:'atp' },
  { surname:'Musetti',    name:'Lorenzo Musetti',   flag:'🇮🇹', tour:'atp' },
  { surname:'Berrettini', name:'Matteo Berrettini', flag:'🇮🇹', tour:'atp' },
]

const CY   = new Date().getFullYear()
const TODAY = new Date(); TODAY.setHours(0,0,0,0)

const fmtDate = (s) => {
  if (!s) return '–'
  const d = new Date(s)
  return isNaN(d) ? s : d.toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'numeric' })
}

const fmtMoney = (n) => {
  if (!n && n!==0) return '–'
  if (n >= 1_000_000) return `$${(n/1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n/1_000).toFixed(0)}K`
  return `$${n}`
}

// ── UI ATOMS ─────────────────────────────────────────────────────────────────

const Pill = ({ label, value, color='#00c896', sub }) => (
  <div style={{ background:'#0a0a0a', border:`1px solid ${color}22`, borderRadius:10, padding:'14px 16px', textAlign:'center', flex:1, minWidth:88 }}>
    <div style={{ color, fontSize:20, fontWeight:700, fontFamily:"'DM Mono',monospace", letterSpacing:-1, lineHeight:1 }}>{value}</div>
    {sub && <div style={{ color:`${color}88`, fontSize:10, marginTop:2 }}>{sub}</div>}
    <div style={{ color:'#555', fontSize:10, marginTop:4, textTransform:'uppercase', letterSpacing:1 }}>{label}</div>
  </div>
)

const Sec = ({ title, icon, children, action }) => (
  <div style={{ marginTop:28 }}>
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, paddingBottom:8, borderBottom:'1px solid #111' }}>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        {icon && <span style={{ fontSize:14 }}>{icon}</span>}
        <span style={{ fontSize:11, color:'#444', textTransform:'uppercase', letterSpacing:2 }}>{title}</span>
      </div>
      {action}
    </div>
    {children}
  </div>
)

const Badge = ({ r }) => {
  const c = { W:'#00c896', L:'#ff4444', F:'#f59e0b', SF:'#f59e0b', QF:'#888', R16:'#666' }[r] || '#555'
  return <span style={{ display:'inline-block', background:c+'22', color:c, border:`1px solid ${c}44`, borderRadius:4, padding:'1px 7px', fontSize:11, fontWeight:700, fontFamily:"'DM Mono',monospace", minWidth:28, textAlign:'center' }}>{r}</span>
}

const StatBar = ({ label, value, max, color='#00c896' }) => {
  const pct = max > 0 ? Math.min(100, (value/max)*100) : 0
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
        <span style={{ color:'#888' }}>{label}</span>
        <span style={{ color, fontFamily:"'DM Mono',monospace", fontSize:11 }}>{value}</span>
      </div>
      <div style={{ background:'#111', borderRadius:4, height:4, overflow:'hidden' }}>
        <div style={{ background:color, width:`${pct}%`, height:'100%', borderRadius:4, transition:'width .5s' }}/>
      </div>
    </div>
  )
}

// Grafico ranking SVG — gestisce range ampio tipo Djokovic #1→#7
const RankChart = ({ history }) => {
  if (!history || history.length < 2) return null
  const W=360, H=90, PX=24, PY=12
  const ranks = history.map(h=>h.rank)
  const minR = Math.min(...ranks), maxR = Math.max(...ranks)
  const range = maxR - minR || 1
  const xs = history.map((_,i) => PX + (i/(history.length-1))*(W-PX*2))
  const ys = history.map(h => PY + ((h.rank-minR)/range)*(H-PY*2))
  const path = xs.map((x,i)=>`${i===0?'M':'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
  const area = path + ` L${xs[xs.length-1]},${H} L${xs[0]},${H} Z`
  return (
    <div style={{ background:'#0a0a0a', borderRadius:10, padding:'12px 8px 4px', border:'1px solid #111' }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display:'block' }}>
        <defs>
          <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00c896" stopOpacity="0.15"/>
            <stop offset="100%" stopColor="#00c896" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={area} fill="url(#rg)"/>
        <path d={path} fill="none" stroke="#00c896" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
        {history.map((h,i) => (
          <g key={i}>
            <circle cx={xs[i]} cy={ys[i]} r="3" fill="#050505" stroke="#00c896" strokeWidth="1.5"/>
            <text x={xs[i]} y={H-2} textAnchor="middle" fontSize="7" fill="#333">{h.year}</text>
            <text x={xs[i]} y={ys[i]-6} textAnchor="middle" fontSize="8" fill="#00c896">#{h.rank}</text>
          </g>
        ))}
        {/* Linea #1 di riferimento */}
        {minR <= 1 && (
          <line x1={PX} y1={PY} x2={W-PX} y2={PY} stroke="#00c89622" strokeWidth="1" strokeDasharray="4,4"/>
        )}
      </svg>
      <div style={{ fontSize:9, color:'#2a2a2a', textAlign:'right', paddingRight:8 }}>ranking fine anno (appross.)</div>
    </div>
  )
}

// Donut W/L
const WLDonut = ({ wins, losses }) => {
  const total = wins + losses
  if (!total) return null
  const pct = wins / total
  const R = 36, C = 2*Math.PI*R
  const dash = pct * C
  return (
    <div style={{ display:'flex', alignItems:'center', gap:16 }}>
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={R} fill="none" stroke="#111" strokeWidth="10"/>
        <circle cx="44" cy="44" r={R} fill="none" stroke="#00c896" strokeWidth="10"
          strokeDasharray={`${dash} ${C-dash}`} strokeDashoffset={C/4}
          strokeLinecap="round" style={{ transition:'stroke-dasharray .5s' }}/>
        <text x="44" y="40" textAnchor="middle" fontSize="14" fontWeight="700" fill="#e8e8e8" fontFamily="'DM Mono',monospace">{Math.round(pct*100)}%</text>
        <text x="44" y="54" textAnchor="middle" fontSize="8" fill="#555">WIN RATE</text>
      </svg>
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:'#00c896', display:'inline-block' }}/>
          <span style={{ fontSize:13, color:'#ccc' }}>{wins.toLocaleString('it-IT')} vittorie</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:'#ff4444', display:'inline-block' }}/>
          <span style={{ fontSize:13, color:'#ccc' }}>{losses.toLocaleString('it-IT')} sconfitte</span>
        </div>
        <div style={{ fontSize:11, color:'#333', marginTop:8 }}>{total.toLocaleString('it-IT')} totali</div>
      </div>
    </div>
  )
}

// ── APP ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [players, setPlayers]     = useState([])
  const [sel, setSel]             = useState(null)
  const [h2hTarget, setH2hTarget] = useState(null)
  const [data, setData]           = useState(null)
  const [h2hData, setH2hData]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [h2hLoading, setH2hLoading] = useState(false)
  const [initDone, setInitDone]   = useState(false)
  const [mock, setMock]           = useState(false)
  const [tab, setTab]             = useState('stats') // 'stats' | 'matches' | 'h2h'

  // ── INIT: trova ID dal ranking ─────────────────────────────────────────────
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

  // ── CARICA DATI GIOCATORE ──────────────────────────────────────────────────
  useEffect(() => {
    if (!sel || !initDone) return
    setTab('stats')
    setH2hData(null)
    setH2hTarget(null)
    const load = async () => {
      setLoading(true); setData(null); setMock(false)
      try {
        if (!sel.id) throw new Error('ID non trovato')
        const t = sel.tour

        const [pR, titR, statsR, perfR, fixR, p1R, p2R, p3R] = await Promise.allSettled([
          get(`${BASE}/${t}/player/profile/${sel.id}?include=ranking,country`),
          get(`${BASE}/${t}/player/titles/${sel.id}`),
          get(`${BASE}/${t}/player/match-stats/${sel.id}`),
          get(`${BASE}/${t}/player/perf-breakdown/${sel.id}`),
          get(`${BASE}/${t}/fixtures/player/${sel.id}?include=tournament,round&pageSize=20&filter=PlayerGroup:singles`),
          get(`${BASE}/${t}/player/past-matches/${sel.id}?pageSize=30&pageNo=1&filter=PlayerGroup:singles&include=tournament`),
          get(`${BASE}/${t}/player/past-matches/${sel.id}?pageSize=30&pageNo=2&filter=PlayerGroup:singles&include=tournament`),
          get(`${BASE}/${t}/player/past-matches/${sel.id}?pageSize=30&pageNo=3&filter=PlayerGroup:singles&include=tournament`),
        ])

        const profile   = pR.status==='fulfilled'    ? pR.value    : null
        const titlesRaw = titR.status==='fulfilled'   ? titR.value  : []
        const matchStats = statsR.status==='fulfilled' ? statsR.value : null
        const perf      = perfR.status==='fulfilled'  ? perfR.value : null
        const fixRaw    = fixR.status==='fulfilled'   ? fixR.value  : []

        if (!profile) throw new Error('Profilo non trovato')

        const allPast = [p1R,p2R,p3R]
          .filter(r=>r.status==='fulfilled')
          .flatMap(r=>{ const v=r.value; return Array.isArray(v)?v:(v?.matches||v?.data||[]) })
          .sort((a,b)=>new Date(b.date||0)-new Date(a.date||0))

        // ── TITOLI ──────────────────────────────────────────────────────────
        const titArr = Array.isArray(titlesRaw) ? titlesRaw : (titlesRaw?.titles||titlesRaw?.data||[])
        const isATP = row => {
          const rk = (row.tourRank||'').toLowerCase()
          return !rk.includes('futures') && !rk.includes('satellite') &&
                 !rk.includes('itf') && !rk.match(/\$\d+k/i)
        }
        const atpTitles  = titArr.filter(isATP)
        const titlesTotal = atpTitles.reduce((s,r)=>s+(parseInt(r.titlesWon)||0), 0)
        const titlesSlam  = titArr.filter(r=>(r.tourRank||'').toLowerCase().includes('grand slam'))
                                   .reduce((s,r)=>s+(parseInt(r.titlesWon)||0), 0)

        // Titoli anno corrente dalle partite
        const matchesCY = allPast.filter(m=>m.date && new Date(m.date).getFullYear()===CY)
        const wonTournsCY = new Set()
        for (const m of matchesCY) {
          if (String(m.player1Id)===String(sel.id)) {
            const tid = m.tournamentId
            const later = matchesCY.filter(x=>x.tournamentId===tid && new Date(x.date)>new Date(m.date))
            if (!wonTournsCY.has(tid) && later.length===0) wonTournsCY.add(tid)
          }
        }
        const titlesYear = wonTournsCY.size

        // ── W/L TOTALE (da match-stats) ──────────────────────────────────────
        // rtnStats e serviceStats contengono statistiche di gioco
        // Per W/L usiamo titlesWon/titlesLost non sono W/L match — usiamo perf-breakdown
        let totalWins = 0, totalLosses = 0
        if (perf) {
          Object.keys(perf).filter(k=>/^\d{4}$/.test(k)).forEach(yr => {
            const round = perf[yr]?.round || {}
            // round ha {1:{al:X}, 2:{al:X}...} dove al = partite giocate a quel turno
            // Non direttamente W/L — usiamo matchStats se disponibile
          })
        }
        // Match-stats ha titlesWon/titlesLost per categoria — sono finali vinte/perse
        // Per W/L totale usiamo il dataset past-matches
        const allWins   = allPast.filter(m=>String(m.player1Id)===String(sel.id)).length
        const allLosses = allPast.filter(m=>String(m.player2Id)===String(sel.id)).length

        // ── PRIZE MONEY (da match-stats o profilo) ──────────────────────────
        const prizeMoney = matchStats?.prizeMoney || matchStats?.prizeMoneyTotal ||
                           profile.prizeMoney || profile.prize_money || null

        // ── STATS SERVIZIO/RITORNO (da match-stats) ─────────────────────────
        const svc = matchStats?.serviceStats || matchStats?.rtnStats ? {
          aces:          matchStats.serviceStats?.acesGm,
          df:            matchStats.serviceStats?.doubleFaultsGm,
          firstServeIn:  matchStats.serviceStats?.firstServeOfGm,
          firstServeWin: matchStats.serviceStats?.winningOnFirstServeOfGm,
          secondServeWin:matchStats.serviceStats?.winningOnSecondServeOfGm,
        } : null

        // ── GRAFICO RANKING ──────────────────────────────────────────────────
        // Rank reale dal campo curRank se disponibile per ogni anno
        const rankHistory = []
        if (perf) {
          const years = Object.keys(perf).filter(k=>/^\d{4}$/.test(k)).sort()
          for (const yr of years) {
            const rankObj = perf[yr]?.rank || {}
            // Mappa flags → rank più preciso possibile
            const flags = ['top1','top5','top10','top20','top50','top100']
            const vals  = [1, 3, 7, 15, 35, 75]
            let rank = null
            for (let i=0; i<flags.length; i++) {
              const v = rankObj[flags[i]]?.al
              if (v===1 || v==='1' || v===true) { rank = vals[i]; break }
            }
            if (rank !== null) rankHistory.push({ year:yr, rank })
          }
        }

        // ── PROSSIMI TORNEI ──────────────────────────────────────────────────
        const fixArr = Array.isArray(fixRaw) ? fixRaw : (fixRaw?.fixtures||fixRaw?.data||[])
        // Ordina per data, prendi solo futuri, deduplica per torneo
        const seenFix = new Set()
        const upcoming = fixArr
          .filter(f => {
            if (!f.date) return false
            const d = new Date(f.date); d.setHours(0,0,0,0)
            return d >= TODAY
          })
          .sort((a,b)=>new Date(a.date)-new Date(b.date))
          .filter(f => {
            if (seenFix.has(f.tournamentId)) return false
            seenFix.add(f.tournamentId); return true
          })
          .slice(0,4)
          .map(f => ({
            tournament: f.tournament?.name || `Torneo #${f.tournamentId}`,
            surface:    f.tournament?.court?.name || '–',
            start:      f.date,
            category:   f.tournament?.rank?.name || '–',
          }))

        // ── PARTITE DAL 2024 ─────────────────────────────────────────────────
        const recent = allPast
          .filter(m=>m.date && new Date(m.date).getFullYear()>=2024)
          .map(m => {
            const won = String(m.player1Id)===String(sel.id)
            return {
              tournament: m.tournament?.name || `#${m.tournamentId}`,
              result:     won?'W':'L',
              opponent:   won?(m.player2?.name||'–'):(m.player1?.name||'–'),
              score:      m.result||'–',
              date:       m.date||'',
              year:       new Date(m.date).getFullYear(),
            }
          })

        setData({
          profile:{
            full_name: profile.name||sel.name,
            country:   profile.country?.name||profile.countryAcr||'',
            birth_date:profile.birthday||'',
            height:    profile.height||'',
            plays:     profile.plays||profile.hand||'',
            turned_pro:profile.turnedPro||'',
            coach:     profile.coach||'',
          },
          ranking:{
            rank:     profile.currentRank??sel.rank??'–',
            points:   (profile.curRank?.points??profile.ranking?.points??sel.points)??'–',
            movement: profile.progress??0,
          },
          titles:{ total:titlesTotal||'–', current_year:titlesYear, grand_slams:titlesSlam||'–' },
          record:{ wins:allWins, losses:allLosses },
          prizeMoney,
          svc,
          rankHistory,
          recent,
          upcoming,
          allMatches: allPast, // per H2H
        })
      } catch {
        setMock(true)
        const fb={Sinner:{rank:1,pts:14350,tot:22,yr:5,slam:3,w:500,l:100},Alcaraz:{rank:3,pts:8200,tot:16,yr:2,slam:3,w:300,l:80},Djokovic:{rank:7,pts:4200,tot:98,yr:0,slam:24,w:1100,l:200},Musetti:{rank:17,pts:2100,tot:4,yr:0,slam:0,w:180,l:120},Berrettini:{rank:35,pts:1200,tot:6,yr:0,slam:0,w:200,l:150}}[sel.surname]||{rank:'–',pts:'–',tot:'–',yr:0,slam:0,w:0,l:0}
        setData({profile:{full_name:sel.name,country:'',birth_date:'',height:'',plays:'',turned_pro:'',coach:''},ranking:{rank:fb.rank,points:fb.pts,movement:0},titles:{total:fb.tot,current_year:fb.yr,grand_slams:fb.slam},record:{wins:fb.w,losses:fb.l},prizeMoney:null,svc:null,rankHistory:[],recent:[],upcoming:[],allMatches:[]})
      } finally { setLoading(false) }
    }
    load()
  }, [sel, initDone])

  // ── H2H ───────────────────────────────────────────────────────────────────
  const loadH2H = async (opponent) => {
    if (!sel?.id || !opponent?.id) return
    setH2hLoading(true); setH2hData(null)
    try {
      const res = await get(`${BASE}/atp/h2h/info/${sel.id}/${opponent.id}`)
      setH2hData(res)
    } catch { setH2hData({ error: true }) }
    finally { setH2hLoading(false) }
  }

  if (!initDone) return (
    <div style={{background:'#050505',color:'#444',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'monospace',fontSize:13}}>
      🎾 Caricamento...
    </div>
  )

  const matchesByYear = {}
  if (data?.recent) {
    for (const m of data.recent) {
      if (!matchesByYear[m.year]) matchesByYear[m.year]=[]
      matchesByYear[m.year].push(m)
    }
  }

  const tabStyle = (t) => ({
    background: tab===t ? '#0d1f1a' : 'transparent',
    border: `1px solid ${tab===t ? '#00c896' : '#1a1a1a'}`,
    color: tab===t ? '#00c896' : '#555',
    borderRadius:6, padding:'5px 14px', cursor:'pointer', fontSize:12,
    fontFamily:"'DM Mono',monospace", letterSpacing:0.5,
  })

  return (
    <div style={{fontFamily:"'DM Sans',-apple-system,sans-serif",background:'#050505',color:'#e8e8e8',minHeight:'100vh',padding:'0 0 60px'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .pb{transition:all .15s}.pb:hover{border-color:#00c89644!important;background:#0d1f1a!important}
        .mr{transition:background .1s}.mr:hover{background:#0a0a0a!important}
        .h2h-btn{transition:all .15s}.h2h-btn:hover{border-color:#7c3aed44!important;background:#120d1f!important}
      `}</style>

      {/* Header */}
      <div style={{borderBottom:'1px solid #0d0d0d',padding:'14px 20px',display:'flex',alignItems:'center',gap:10,background:'#030303'}}>
        <span style={{fontSize:16}}>🎾</span>
        <span style={{fontSize:12,color:'#333',letterSpacing:2,textTransform:'uppercase',fontFamily:"'DM Mono',monospace"}}>Tennis Stats</span>
        {mock && <span style={{marginLeft:'auto',fontSize:9,background:'#f59e0b11',color:'#f59e0b88',border:'1px solid #f59e0b22',borderRadius:4,padding:'2px 8px',letterSpacing:1}}>DEMO</span>}
      </div>

      {/* Player selector */}
      <div style={{padding:'14px 20px',overflowX:'auto',borderBottom:'1px solid #0d0d0d'}}>
        <div style={{display:'flex',gap:8,minWidth:'max-content'}}>
          {players.map(p=>(
            <button key={p.surname} className="pb" onClick={()=>setSel(p)} style={{
              background:sel?.surname===p.surname?'#0d1f1a':'transparent',
              border:`1px solid ${sel?.surname===p.surname?'#00c896':'#1a1a1a'}`,
              color:sel?.surname===p.surname?'#00c896':'#555',
              borderRadius:8,padding:'6px 14px',cursor:'pointer',fontSize:13,
              whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:6,
            }}>
              <span>{p.flag}</span>
              <span style={{fontWeight:sel?.surname===p.surname?600:400}}>{p.surname}</span>
              {p.rank && <span style={{fontSize:10,color:sel?.surname===p.surname?'#00c89666':'#333'}}>#{p.rank}</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:'0 20px'}}>
        {loading && (
          <div style={{textAlign:'center',padding:60,color:'#222'}}>
            <div style={{fontSize:24,marginBottom:10}}>⏳</div>
            <div style={{fontSize:12,letterSpacing:1,textTransform:'uppercase',fontFamily:"'DM Mono',monospace"}}>Caricamento dati...</div>
          </div>
        )}

        {data && !loading && <>
          {/* Player hero */}
          <div style={{padding:'24px 0 20px',borderBottom:'1px solid #0d0d0d',marginBottom:4}}>
            <div style={{display:'flex',alignItems:'center',gap:16}}>
              <div style={{width:60,height:60,borderRadius:'50%',background:'linear-gradient(135deg,#0d1f1a,#051a12)',border:'2px solid #00c89633',display:'flex',alignItems:'center',justifyContent:'center',fontSize:30,flexShrink:0}}>
                {sel.flag}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:24,fontWeight:600,letterSpacing:-0.5,lineHeight:1.1}}>{data.profile.full_name}</div>
                <div style={{fontSize:12,color:'#444',marginTop:4,display:'flex',gap:12,flexWrap:'wrap'}}>
                  {data.profile.country && <span>{data.profile.country}</span>}
                  {data.profile.birth_date && <span>Nato {fmtDate(data.profile.birth_date)}</span>}
                  {data.profile.height && <span>{data.profile.height} cm</span>}
                  {data.profile.plays && <span>{data.profile.plays}</span>}
                </div>
              </div>
              {/* Ranking badge */}
              <div style={{textAlign:'center',flexShrink:0}}>
                <div style={{fontSize:32,fontWeight:700,color:'#00c896',fontFamily:"'DM Mono',monospace",lineHeight:1}}>
                  #{data.ranking.rank}
                </div>
                <div style={{fontSize:10,color:'#333',textTransform:'uppercase',letterSpacing:1,marginTop:2}}>ATP</div>
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div style={{display:'flex',gap:8,padding:'16px 0 4px',overflowX:'auto'}}>
            {[['stats','📊 Stats'],['matches','📋 Partite'],['h2h','⚔️ H2H']].map(([key,label])=>(
              <button key={key} onClick={()=>setTab(key)} style={tabStyle(key)}>{label}</button>
            ))}
          </div>

          {/* ── TAB STATS ── */}
          {tab==='stats' && <>
            {/* Pills principali */}
            <Sec title="Classifica & titoli" icon="🏆">
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <Pill label="Punti" value={typeof data.ranking.points==='number'?data.ranking.points.toLocaleString('it-IT'):data.ranking.points}/>
                <Pill label="Titoli ATP" value={data.titles.total} color="#f59e0b"/>
                <Pill label={`Titoli ${CY}`} value={data.titles.current_year} color="#f59e0b"/>
                <Pill label="Grand Slam" value={data.titles.grand_slams} color="#f59e0b"/>
              </div>
              {data.prizeMoney && (
                <div style={{marginTop:12,display:'flex',alignItems:'center',gap:8,padding:'10px 14px',background:'#0a0a0a',borderRadius:8,border:'1px solid #111'}}>
                  <span style={{fontSize:16}}>💰</span>
                  <div>
                    <div style={{fontSize:14,color:'#ccc'}}>Prize money career</div>
                    <div style={{fontSize:18,fontWeight:700,color:'#00c896',fontFamily:"'DM Mono',monospace"}}>{fmtMoney(data.prizeMoney)}</div>
                  </div>
                </div>
              )}
            </Sec>

            {/* Record W/L */}
            <Sec title="Record vittorie/sconfitte" icon="📈">
              <WLDonut wins={data.record.wins} losses={data.record.losses}/>
              <div style={{marginTop:12,fontSize:10,color:'#2a2a2a'}}>* Basato sulle ultime 90 partite caricate</div>
            </Sec>

            {/* Grafico ranking */}
            {data.rankHistory?.length > 1 && (
              <Sec title="Andamento ranking" icon="📉">
                <RankChart history={data.rankHistory}/>
              </Sec>
            )}

            {/* Stats servizio */}
            {data.svc && (data.svc.aces || data.svc.firstServeWin) && (
              <Sec title="Statistiche servizio" icon="🎯">
                {data.svc.firstServeIn!=null && <StatBar label="1° servizio in (%)" value={`${((data.svc.firstServeIn/(data.svc.firstServeIn+data.svc.df||1))*100).toFixed(0)}%`} max={100}/>}
                {data.svc.firstServeWin!=null && data.svc.firstServeIn!=null && <StatBar label="Punti vinti su 1° serv. (%)" value={`${((data.svc.firstServeWin/data.svc.firstServeIn)*100||0).toFixed(0)}%`} max={100}/>}
                {data.svc.aces!=null && <StatBar label="Ace per partita" value={(data.svc.aces/Math.max(data.record.wins+data.record.losses,1)).toFixed(1)} max={15}/>}
              </Sec>
            )}

            {/* Profilo */}
            {(data.profile.turned_pro||data.profile.coach) && (
              <Sec title="Profilo" icon="👤">
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {[['Pro dal',data.profile.turned_pro],['Coach',data.profile.coach]]
                    .filter(([,v])=>v)
                    .map(([k,v])=>(
                      <div key={k} style={{background:'#0a0a0a',borderRadius:8,padding:'10px 12px',border:'1px solid #111'}}>
                        <div style={{fontSize:10,color:'#444',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>{k}</div>
                        <div style={{fontSize:13,color:'#999'}}>{v}</div>
                      </div>
                    ))}
                </div>
              </Sec>
            )}

            {/* Prossimi tornei */}
            {data.upcoming?.length > 0 && (
              <Sec title="Prossimi tornei" icon="📅">
                {data.upcoming.map((t,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'#0a0a0a',border:'1px solid #111',borderRadius:10,marginBottom:8}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,color:'#ccc',fontWeight:500}}>{t.tournament}</div>
                      <div style={{fontSize:11,color:'#333',marginTop:3}}>
                        {t.category!=='–'&&<span style={{color:'#f59e0b88',marginRight:6}}>{t.category}</span>}
                        {t.surface!=='–'&&<span>{t.surface}</span>}
                      </div>
                    </div>
                    <div style={{fontSize:12,color:'#00c89666',fontFamily:"'DM Mono',monospace",whiteSpace:'nowrap'}}>{fmtDate(t.start)}</div>
                  </div>
                ))}
              </Sec>
            )}
          </>}

          {/* ── TAB PARTITE ── */}
          {tab==='matches' && (
            Object.keys(matchesByYear).length > 0
              ? Object.keys(matchesByYear).sort((a,b)=>b-a).map(yr=>(
                <Sec key={yr} title={`Risultati ${yr}`} icon={yr===String(CY)?'🔥':'📋'}>
                  {matchesByYear[yr].map((m,i)=>(
                    <div key={i} className="mr" style={{display:'flex',alignItems:'center',gap:10,padding:'9px 10px',borderRadius:8,fontSize:13,marginBottom:2}}>
                      <Badge r={m.result}/>
                      <span style={{color:'#aaa',flex:1,fontSize:12}}>{m.tournament}</span>
                      <span style={{color:'#444',fontSize:11}}>vs <span style={{color:'#777'}}>{m.opponent}</span></span>
                      {m.score&&m.score!=='–'&&<span style={{color:'#333',fontSize:10,fontFamily:"'DM Mono',monospace"}}>{m.score}</span>}
                      <span style={{color:'#222',fontSize:10,whiteSpace:'nowrap'}}>{fmtDate(m.date)}</span>
                    </div>
                  ))}
                </Sec>
              ))
              : <div style={{textAlign:'center',padding:40,color:'#333',fontSize:13}}>Nessun dato dal 2024</div>
          )}

          {/* ── TAB H2H ── */}
          {tab==='h2h' && (
            <div>
              <Sec title="Scegli avversario" icon="⚔️">
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {players.filter(p=>p.surname!==sel.surname).map(p=>(
                    <button key={p.surname} className="h2h-btn" onClick={()=>{ setH2hTarget(p); loadH2H(p) }} style={{
                      background:h2hTarget?.surname===p.surname?'#120d1f':'transparent',
                      border:`1px solid ${h2hTarget?.surname===p.surname?'#7c3aed':'#1a1a1a'}`,
                      color:h2hTarget?.surname===p.surname?'#a78bfa':'#555',
                      borderRadius:8,padding:'6px 14px',cursor:'pointer',fontSize:13,
                      display:'flex',alignItems:'center',gap:6,
                    }}>
                      <span>{p.flag}</span><span>{p.surname}</span>
                    </button>
                  ))}
                </div>
              </Sec>

              {h2hLoading && <div style={{textAlign:'center',padding:30,color:'#333',fontSize:12}}>⏳ Caricamento H2H...</div>}

              {h2hData && !h2hLoading && !h2hData.error && (
                <Sec title={`${sel.surname} vs ${h2hTarget?.surname}`} icon="⚔️">
                  {/* Punteggio H2H */}
                  <div style={{display:'flex',gap:12,marginBottom:16}}>
                    <div style={{flex:1,background:'#0a0a0a',border:'1px solid #00c89633',borderRadius:10,padding:'16px',textAlign:'center'}}>
                      <div style={{fontSize:10,color:'#444',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>{sel.name.split(' ').pop()}</div>
                      <div style={{fontSize:36,fontWeight:700,color:'#00c896',fontFamily:"'DM Mono',monospace"}}>
                        {h2hData.player1Wins ?? h2hData.player1?.wins ?? '–'}
                      </div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',color:'#333',fontSize:20,fontWeight:700}}>vs</div>
                    <div style={{flex:1,background:'#0a0a0a',border:'1px solid #7c3aed33',borderRadius:10,padding:'16px',textAlign:'center'}}>
                      <div style={{fontSize:10,color:'#444',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>{h2hTarget?.name.split(' ').pop()}</div>
                      <div style={{fontSize:36,fontWeight:700,color:'#a78bfa',fontFamily:"'DM Mono',monospace"}}>
                        {h2hData.player2Wins ?? h2hData.player2?.wins ?? '–'}
                      </div>
                    </div>
                  </div>
                  {/* Ultimi match H2H */}
                  {(h2hData.matches||h2hData.fixtures||[]).slice(0,8).map((m,i)=>{
                    const p1won = String(m.player1Id)===String(sel.id)
                    return (
                      <div key={i} className="mr" style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:8,fontSize:12,marginBottom:2}}>
                        <Badge r={p1won?'W':'L'}/>
                        <span style={{color:'#555',flex:1}}>{m.tournament?.name||fmtDate(m.date)}</span>
                        <span style={{color:'#333',fontFamily:"'DM Mono',monospace",fontSize:11}}>{m.result||'–'}</span>
                        <span style={{color:'#222',fontSize:10}}>{fmtDate(m.date)}</span>
                      </div>
                    )
                  })}
                </Sec>
              )}
              {h2hData?.error && <div style={{padding:16,color:'#ff6666',fontSize:12}}>⚠️ H2H non disponibile per questa coppia</div>}
            </div>
          )}
        </>}
      </div>

      <div style={{marginTop:40,padding:'14px 20px',borderTop:'1px solid #0a0a0a',display:'flex',justifyContent:'space-between'}}>
        <span style={{fontSize:10,color:'#1a1a1a',letterSpacing:1}}>UNIVERSOSPORTIVO.COM</span>
        <span style={{fontSize:10,color:'#1a1a1a',letterSpacing:1}}>TENNIS API · RAPIDAPI</span>
      </div>
    </div>
  )
}

