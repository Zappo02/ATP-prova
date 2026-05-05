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

const CY = new Date().getFullYear()

const fmtDate = (s) => {
  if (!s) return '–'
  const d = new Date(s)
  return isNaN(d) ? s : d.toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'numeric' })
}

const fmtMoney = (n) => {
  if (!n && n!==0) return '–'
  if (n>=1_000_000) return `$${(n/1_000_000).toFixed(1)}M`
  if (n>=1_000)     return `$${(n/1_000).toFixed(0)}K`
  return `$${n}`
}

// ── UI ────────────────────────────────────────────────────────────────────────

const Pill = ({ label, value, color='#00c896' }) => (
  <div style={{background:'#0a0a0a',border:`1px solid ${color}22`,borderRadius:10,padding:'14px 12px',textAlign:'center',flex:1,minWidth:80}}>
    <div style={{color,fontSize:20,fontWeight:700,fontFamily:"'DM Mono',monospace",letterSpacing:-1,lineHeight:1}}>{value}</div>
    <div style={{color:'#444',fontSize:10,marginTop:5,textTransform:'uppercase',letterSpacing:1}}>{label}</div>
  </div>
)

const Sec = ({ title, icon, children }) => (
  <div style={{marginTop:28}}>
    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:12,paddingBottom:8,borderBottom:'1px solid #0f0f0f'}}>
      {icon && <span style={{fontSize:13}}>{icon}</span>}
      <span style={{fontSize:10,color:'#444',textTransform:'uppercase',letterSpacing:2}}>{title}</span>
    </div>
    {children}
  </div>
)

const Badge = ({ r }) => {
  const c = {W:'#00c896',L:'#ff4444',F:'#f59e0b',SF:'#f59e0b',QF:'#888'}[r]||'#555'
  return <span style={{display:'inline-block',background:c+'22',color:c,border:`1px solid ${c}44`,borderRadius:4,padding:'1px 7px',fontSize:11,fontWeight:700,fontFamily:"'DM Mono',monospace",minWidth:28,textAlign:'center'}}>{r}</span>
}

// Grafico ranking — usa aw (anno) dal perf breakdown
// Struttura perf[year].rank = {top1:{aw:X,al:Y}, top5:{aw:X,al:Y}...}
// aw = partite giocate quel anno quando era in quella fascia
const RankChart = ({ history }) => {
  if (!history || history.length < 2) return null
  const W=360, H=90, PX=20, PY=14
  const ranks = history.map(h=>h.rank)
  const minR  = Math.min(...ranks)
  const maxR  = Math.max(...ranks)
  const range = maxR - minR || 1
  const xs = history.map((_,i)=>PX+(i/(history.length-1))*(W-PX*2))
  // Rank basso = buono = alto nel grafico → invertiamo
  const ys = history.map(h=>PY+((h.rank-minR)/range)*(H-PY*2))
  const path = xs.map((x,i)=>`${i===0?'M':'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
  const area = path+` L${xs[xs.length-1]},${H} L${xs[0]},${H} Z`
  return (
    <div style={{background:'#0a0a0a',borderRadius:10,padding:'12px 4px 6px',border:'1px solid #111'}}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:'block'}}>
        <defs>
          <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00c896" stopOpacity="0.18"/>
            <stop offset="100%" stopColor="#00c896" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={area} fill="url(#rg)"/>
        <path d={path} fill="none" stroke="#00c896" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
        {history.map((h,i)=>(
          <g key={i}>
            <circle cx={xs[i]} cy={ys[i]} r="3" fill="#050505" stroke="#00c896" strokeWidth="1.5"/>
            <text x={xs[i]} y={H-1} textAnchor="middle" fontSize="7" fill="#2a2a2a">{h.year}</text>
            <text x={xs[i]} y={ys[i]-6} textAnchor="middle" fontSize="8" fill="#00c896">#{h.rank}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

// Donut W/L
const WLDonut = ({ wins, losses }) => {
  const total = wins+losses
  if (!total) return null
  const pct = wins/total
  const R=36, C=2*Math.PI*R, dash=pct*C
  return (
    <div style={{display:'flex',alignItems:'center',gap:20}}>
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={R} fill="none" stroke="#111" strokeWidth="10"/>
        <circle cx="44" cy="44" r={R} fill="none" stroke="#00c896" strokeWidth="10"
          strokeDasharray={`${dash} ${C-dash}`} strokeDashoffset={C/4} strokeLinecap="round"/>
        <text x="44" y="40" textAnchor="middle" fontSize="14" fontWeight="700" fill="#e8e8e8" fontFamily="'DM Mono',monospace">{Math.round(pct*100)}%</text>
        <text x="44" y="54" textAnchor="middle" fontSize="8" fill="#555">WIN RATE</text>
      </svg>
      <div style={{flex:1}}>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:8}}>
          <span style={{color:'#888'}}>Vittorie</span>
          <span style={{color:'#00c896',fontFamily:"'DM Mono',monospace"}}>{wins.toLocaleString('it-IT')}</span>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:8}}>
          <span style={{color:'#888'}}>Sconfitte</span>
          <span style={{color:'#ff4444',fontFamily:"'DM Mono',monospace"}}>{losses.toLocaleString('it-IT')}</span>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#333'}}>
          <span>Totale</span>
          <span style={{fontFamily:"'DM Mono',monospace"}}>{total.toLocaleString('it-IT')}</span>
        </div>
      </div>
    </div>
  )
}

// ── APP ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [players, setPlayers]       = useState([])
  const [sel, setSel]               = useState(null)
  const [data, setData]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [initDone, setInitDone]     = useState(false)
  const [mock, setMock]             = useState(false)
  const [tab, setTab]               = useState('stats')
  const [h2hTarget, setH2hTarget]   = useState(null)
  const [h2hData, setH2hData]       = useState(null)
  const [h2hLoad, setH2hLoad]       = useState(false)

  // Carica ranking e trova ID
  useEffect(() => {
    const init = async () => {
      try {
        const res  = await get(`${BASE}/atp/ranking/singles?pageSize=100&pageNo=1`)
        const raw  = Array.isArray(res)?res:(res?.rankings||res?.players||res?.data||[])
        // Struttura confermata: {position, point, player:{id,name}}
        const list = raw.map(row=>({
          id:     row.player?.id    ?? row.id,
          name:   row.player?.name  ?? row.name ?? row.playerName,
          rank:   row.position      ?? row.rank,
          points: row.point         ?? row.points,
        }))
        const resolved = TARGETS.map(t=>{
          const m = list.find(r=>(r.name||'').toLowerCase().includes(t.surname.toLowerCase()))
          return m ? {...t,id:m.id,name:m.name||t.name,rank:m.rank,points:m.points} : {...t,id:null}
        })
        setPlayers(resolved); setSel(resolved[0])
      } catch {
        setPlayers(TARGETS.map(t=>({...t,id:null}))); setSel({...TARGETS[0],id:null})
      } finally { setInitDone(true) }
    }
    init()
  }, [])

  // Carica dati giocatore
  useEffect(() => {
    if (!sel||!initDone) return
    setTab('stats'); setH2hData(null); setH2hTarget(null)
    const load = async () => {
      setLoading(true); setData(null); setMock(false)
      try {
        if (!sel.id) throw new Error('no id')
        const t = sel.tour

        const [titR,perfR,fixR,p1R,p2R,p3R] = await Promise.allSettled([
          get(`${BASE}/${t}/player/titles/${sel.id}`),
          get(`${BASE}/${t}/player/perf-breakdown/${sel.id}`),
          get(`${BASE}/${t}/fixtures/player/${sel.id}?include=tournament,round&pageSize=20&filter=PlayerGroup:singles`),
          get(`${BASE}/${t}/player/past-matches/${sel.id}?pageSize=30&pageNo=1&filter=PlayerGroup:singles&include=tournament`),
          get(`${BASE}/${t}/player/past-matches/${sel.id}?pageSize=30&pageNo=2&filter=PlayerGroup:singles&include=tournament`),
          get(`${BASE}/${t}/player/past-matches/${sel.id}?pageSize=30&pageNo=3&filter=PlayerGroup:singles&include=tournament`),
        ])

        // ── TITOLI ──────────────────────────────────────────────────────────
        const titlesRaw = titR.status==='fulfilled' ? titR.value : []
        const titArr    = Array.isArray(titlesRaw)?titlesRaw:(titlesRaw?.titles||titlesRaw?.data||[])
        const isATP = row => {
          const rk = (row.tourRank||'').toLowerCase()
          return !rk.match(/futures|satellite|itf|\$\d+k/i)
        }
        const titlesTotal = titArr.filter(isATP).reduce((s,r)=>s+(parseInt(r.titlesWon)||0), 0)
        const titlesSlam  = titArr.filter(r=>(r.tourRank||'').toLowerCase().includes('grand slam'))
                                   .reduce((s,r)=>s+(parseInt(r.titlesWon)||0), 0)

        // ── PERF BREAKDOWN ───────────────────────────────────────────────────
        // Struttura confermata: perf[year].rank.top1.aw = partite giocate in top1 quell'anno
        // Se aw > 0 in top1 → era #1; se top5 → era ~3-5 ecc.
        const perf = perfR.status==='fulfilled' ? perfR.value : null

        // Grafico: per ogni anno trova il rank migliore raggiunto (aw>0 = ci ha giocato)
        const rankHistory = []
        if (perf) {
          const years = Object.keys(perf).filter(k=>/^\d{4}$/.test(k)).sort()
          const bands = [
            {key:'top1',  rank:1},
            {key:'top5',  rank:3},
            {key:'top10', rank:7},
            {key:'top20', rank:15},
            {key:'top50', rank:35},
            {key:'top100',rank:75},
          ]
          for (const yr of years) {
            const rankObj = perf[yr]?.rank || {}
            // Trova la fascia migliore con aw > 0 (ha giocato almeno una partita lì)
            let bestRank = null
            for (const b of bands) {
              const aw = parseInt(rankObj[b.key]?.aw || 0)
              if (aw > 0) { bestRank = b.rank; break }
            }
            if (bestRank !== null) rankHistory.push({ year:yr, rank:bestRank })
          }
        }

        // W/L dall'anno corrente via perf
        let perfWins=0, perfLosses=0
        if (perf) {
          Object.keys(perf).filter(k=>/^\d{4}$/.test(k)).forEach(yr=>{
            const court = perf[yr]?.court||{}
            // court[0] = tutti i campi, w=vittorie aw=avversary wins (sconfitte)
            const all = court['0'] || court[0]
            if (all) { perfWins+=parseInt(all.w||0); perfLosses+=parseInt(all.l||0) }
          })
        }

        // Titoli anno corrente da perf
        let titlesYear = 0
        if (perf?.[String(CY)]) {
          const lvl = perf[String(CY)]?.level || {}
          titlesYear = Object.values(lvl).reduce((s,v)=>s+(parseInt(v?.titlesWon||0)), 0)
        }

        // ── PARTITE ──────────────────────────────────────────────────────────
        const allPast = [p1R,p2R,p3R]
          .filter(r=>r.status==='fulfilled')
          .flatMap(r=>{ const v=r.value; return Array.isArray(v)?v:(v?.matches||v?.data||[]) })
          .sort((a,b)=>new Date(b.date||0)-new Date(a.date||0))

        const recent = allPast
          .filter(m=>m.date && new Date(m.date).getFullYear()>=2024)
          .map(m=>{
            const won = String(m.player1Id)===String(sel.id)
            return {
              tournament: m.tournament?.name||`#${m.tournamentId}`,
              result:     won?'W':'L',
              opponent:   won?(m.player2?.name||'–'):(m.player1?.name||'–'),
              score:      m.result||'–',
              date:       m.date||'',
              year:       new Date(m.date).getFullYear(),
            }
          })

        // ── FIXTURE (prossimi tornei) ─────────────────────────────────────────
        // date è null su tutte → ordino per id crescente e prendo le prime N
        // con player2 = "Unknown Player" (id 3700) = è un draw futuro
        const fixArr = fixR.status==='fulfilled'
          ? (Array.isArray(fixR.value)?fixR.value:(fixR.value?.fixtures||fixR.value?.data||[]))
          : []
        // Filtra partite future: player2 è "Unknown Player" (id 3700) oppure date null
        // Deduplica per torneo, prendi le più recenti per ID (id più alto = più recente)
        const seenTournFix = new Set()
        const upcoming = fixArr
          .filter(f=>{
            // Considera "futuro" se date è null o se l'avversario è Unknown
            const isUnknown = f.player2?.id===3700 || f.player1?.id===3700
            const hasNoDate = !f.date
            return isUnknown || hasNoDate
          })
          .sort((a,b)=>b.id-a.id) // id più alto = schedulato più di recente
          .filter(f=>{
            if (seenTournFix.has(f.tournamentId)) return false
            seenTournFix.add(f.tournamentId); return true
          })
          .slice(0,4)
          .map(f=>({
            tournament: f.tournament?.name||`#${f.tournamentId}`,
            surface:    f.tournament?.court?.name||'–',
            start:      f.date||'',
            category:   f.tournament?.rank?.name||'–',
          }))

        setData({
          // Ranking dai dati del ranking (confermato: position e point)
          ranking:{ rank:sel.rank||'–', points:sel.points||'–', movement:0 },
          titles:{ total:titlesTotal||'–', current_year:titlesYear, grand_slams:titlesSlam||'–' },
          record:{ wins:perfWins||allPast.filter(m=>String(m.player1Id)===String(sel.id)).length, losses:perfLosses||allPast.filter(m=>String(m.player2Id)===String(sel.id)).length },
          rankHistory,
          recent,
          upcoming,
          allPastIds: allPast, // per H2H
        })
      } catch {
        setMock(true)
        const fb={Sinner:{rank:1,pts:14350,tot:22,yr:5,slam:3,w:600,l:120},Alcaraz:{rank:3,pts:8200,tot:16,yr:2,slam:3,w:320,l:80},Djokovic:{rank:7,pts:4200,tot:98,yr:0,slam:24,w:1100,l:220},Musetti:{rank:17,pts:2100,tot:4,yr:0,slam:0,w:200,l:140},Berrettini:{rank:35,pts:1200,tot:6,yr:0,slam:0,w:230,l:160}}[sel.surname]||{rank:'–',pts:'–',tot:'–',yr:0,slam:0,w:0,l:0}
        setData({ranking:{rank:fb.rank,points:fb.pts,movement:0},titles:{total:fb.tot,current_year:fb.yr,grand_slams:fb.slam},record:{wins:fb.w,losses:fb.l},rankHistory:[],recent:[],upcoming:[]})
      } finally { setLoading(false) }
    }
    load()
  }, [sel, initDone])

  // H2H
  const loadH2H = async (opp) => {
    if (!sel?.id||!opp?.id) return
    setH2hLoad(true); setH2hData(null)
    try {
      // info → per superficie; matches → lista partite
      const [infoR, matchesR] = await Promise.allSettled([
        get(`${BASE}/${sel.tour}/h2h/info/${sel.id}/${opp.id}`),
        get(`${BASE}/${sel.tour}/h2h/matches/${sel.id}/${opp.id}?pageSize=10`),
      ])
      const info    = infoR.status==='fulfilled'    ? infoR.value    : []
      const matches = matchesR.status==='fulfilled' ? matchesR.value : []
      const matchArr = Array.isArray(matches)?matches:(matches?.matches||matches?.data||[])

      // info è array per superficie: [{courtId,court,player1wins,player2wins}]
      // Totale = somma
      const infoArr = Array.isArray(info)?info:(info?.courts||info?.data||[])
      const p1wins  = infoArr.reduce((s,r)=>s+(parseInt(r.player1wins||r.player1Wins)||0), 0)
      const p2wins  = infoArr.reduce((s,r)=>s+(parseInt(r.player2wins||r.player2Wins)||0), 0)
      const bySurface = infoArr.map(r=>({
        surface: r.court,
        p1:      parseInt(r.player1wins||r.player1Wins)||0,
        p2:      parseInt(r.player2wins||r.player2Wins)||0,
      })).filter(r=>r.p1+r.p2>0)

      setH2hData({
        p1wins, p2wins, bySurface,
        matches: matchArr.map(m=>{
          const p1won = String(m.player1Id)===String(sel.id) || String(m.match_winner)===String(sel.id)
          return {
            tournament: m.player1?.name && m.tournament?.name ? m.tournament.name : (m.tournamentId?`#${m.tournamentId}`:'–'),
            result:     p1won?'W':'L',
            score:      m.result||'–',
            date:       m.date||'',
          }
        })
      })
    } catch { setH2hData({error:true}) }
    finally { setH2hLoad(false) }
  }

  if (!initDone) return (
    <div style={{background:'#050505',color:'#444',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'monospace',fontSize:13}}>
      🎾 Caricamento...
    </div>
  )

  const matchesByYear = {}
  if (data?.recent) for (const m of data.recent) {
    if (!matchesByYear[m.year]) matchesByYear[m.year]=[]
    matchesByYear[m.year].push(m)
  }

  const tStyle = (k) => ({
    background:tab===k?'#0d1f1a':'transparent',
    border:`1px solid ${tab===k?'#00c896':'#1a1a1a'}`,
    color:tab===k?'#00c896':'#444',
    borderRadius:6,padding:'5px 14px',cursor:'pointer',fontSize:11,
    fontFamily:"'DM Mono',monospace",letterSpacing:0.5,whiteSpace:'nowrap',
  })

  return (
    <div style={{fontFamily:"'DM Sans',-apple-system,sans-serif",background:'#050505',color:'#e8e8e8',minHeight:'100vh',padding:'0 0 60px'}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');*{box-sizing:border-box;margin:0;padding:0}.pb{transition:all .15s}.pb:hover{border-color:#00c89644!important;background:#0d1f1a!important}.mr:hover{background:#0a0a0a!important}.hb:hover{border-color:#7c3aed44!important;background:#120d1f!important}`}</style>

      {/* Header */}
      <div style={{borderBottom:'1px solid #0d0d0d',padding:'14px 20px',display:'flex',alignItems:'center',gap:10,background:'#030303'}}>
        <span>🎾</span>
        <span style={{fontSize:11,color:'#333',letterSpacing:2,textTransform:'uppercase',fontFamily:"'DM Mono',monospace"}}>Tennis Stats</span>
        {mock&&<span style={{marginLeft:'auto',fontSize:9,color:'#f59e0b66',letterSpacing:1}}>DEMO</span>}
      </div>

      {/* Selector */}
      <div style={{padding:'12px 20px',overflowX:'auto',borderBottom:'1px solid #0a0a0a'}}>
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
              {p.rank&&<span style={{fontSize:10,color:sel?.surname===p.surname?'#00c89655':'#2a2a2a'}}>#{p.rank}</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:'0 20px'}}>
        {loading&&<div style={{textAlign:'center',padding:60,color:'#222'}}><div style={{fontSize:22,marginBottom:8}}>⏳</div><div style={{fontSize:11,letterSpacing:1,textTransform:'uppercase',fontFamily:"'DM Mono',monospace"}}>Caricamento...</div></div>}

        {data&&!loading&&<>
          {/* Hero */}
          <div style={{padding:'20px 0 16px',borderBottom:'1px solid #0a0a0a'}}>
            <div style={{display:'flex',alignItems:'center',gap:14}}>
              <div style={{width:56,height:56,borderRadius:'50%',background:'#0a0a0a',border:'2px solid #00c89622',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,flexShrink:0}}>{sel.flag}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:22,fontWeight:600,letterSpacing:-0.5}}>{sel.name}</div>
                <div style={{fontSize:11,color:'#333',marginTop:3,letterSpacing:0.5}}>
                  {sel.country||TARGETS.find(t=>t.surname===sel.surname)?.name.split(' ')[0]}
                </div>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <div style={{fontSize:36,fontWeight:700,color:'#00c896',fontFamily:"'DM Mono',monospace",lineHeight:1}}>#{data.ranking.rank}</div>
                <div style={{fontSize:9,color:'#333',letterSpacing:1,textTransform:'uppercase',marginTop:2}}>
                  {typeof data.ranking.points==='number'?data.ranking.points.toLocaleString('it-IT'):data.ranking.points} pts
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{display:'flex',gap:8,padding:'14px 0 2px',overflowX:'auto'}}>
            {[['stats','📊 Stats'],['matches','📋 Partite'],['h2h','⚔️ H2H']].map(([k,l])=>(
              <button key={k} onClick={()=>setTab(k)} style={tStyle(k)}>{l}</button>
            ))}
          </div>

          {/* ── STATS ── */}
          {tab==='stats'&&<>
            <Sec title="Titoli" icon="🏆">
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <Pill label="Titoli ATP" value={data.titles.total} color="#f59e0b"/>
                <Pill label={`Titoli ${CY}`} value={data.titles.current_year} color="#f59e0b"/>
                <Pill label="Grand Slam" value={data.titles.grand_slams} color="#f59e0b"/>
              </div>
            </Sec>

            <Sec title="Record vittorie/sconfitte" icon="📈">
              <WLDonut wins={data.record.wins} losses={data.record.losses}/>
            </Sec>

            {data.rankHistory?.length>1&&(
              <Sec title="Andamento ranking" icon="📉">
                <RankChart history={data.rankHistory}/>
                <div style={{fontSize:9,color:'#222',marginTop:4,textAlign:'right'}}>fascia ranking migliore per anno</div>
              </Sec>
            )}

            {data.upcoming?.length>0&&(
              <Sec title="Prossimi tornei" icon="📅">
                {data.upcoming.map((t,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'#0a0a0a',border:'1px solid #111',borderRadius:10,marginBottom:8}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,color:'#ccc',fontWeight:500}}>{t.tournament}</div>
                      <div style={{fontSize:10,color:'#333',marginTop:3,display:'flex',gap:8}}>
                        {t.category!=='–'&&<span style={{color:'#f59e0b66'}}>{t.category}</span>}
                        {t.surface!=='–'&&<span>{t.surface}</span>}
                      </div>
                    </div>
                    {t.start&&<div style={{fontSize:11,color:'#00c89655',fontFamily:"'DM Mono',monospace"}}>{fmtDate(t.start)}</div>}
                  </div>
                ))}
              </Sec>
            )}
          </>}

          {/* ── PARTITE ── */}
          {tab==='matches'&&(
            Object.keys(matchesByYear).length>0
              ? Object.keys(matchesByYear).sort((a,b)=>b-a).map(yr=>(
                <Sec key={yr} title={`Risultati ${yr}`} icon={yr===String(CY)?'🔥':'📋'}>
                  {matchesByYear[yr].map((m,i)=>(
                    <div key={i} className="mr" style={{display:'flex',alignItems:'center',gap:8,padding:'8px 8px',borderRadius:8,fontSize:12,marginBottom:2}}>
                      <Badge r={m.result}/>
                      <span style={{color:'#888',flex:1,fontSize:11}}>{m.tournament}</span>
                      <span style={{color:'#333',fontSize:11}}>vs <span style={{color:'#666'}}>{m.opponent}</span></span>
                      {m.score&&m.score!=='–'&&<span style={{color:'#2a2a2a',fontSize:10,fontFamily:"'DM Mono',monospace"}}>{m.score}</span>}
                      <span style={{color:'#1a1a1a',fontSize:10,whiteSpace:'nowrap'}}>{fmtDate(m.date)}</span>
                    </div>
                  ))}
                </Sec>
              ))
              : <div style={{textAlign:'center',padding:40,color:'#333',fontSize:12}}>Nessun dato dal 2024</div>
          )}

          {/* ── H2H ── */}
          {tab==='h2h'&&<>
            <Sec title="Scegli avversario" icon="⚔️">
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {players.filter(p=>p.id&&p.surname!==sel.surname).map(p=>(
                  <button key={p.surname} className="hb" onClick={()=>{setH2hTarget(p);loadH2H(p)}} style={{
                    background:h2hTarget?.surname===p.surname?'#120d1f':'transparent',
                    border:`1px solid ${h2hTarget?.surname===p.surname?'#7c3aed':'#1a1a1a'}`,
                    color:h2hTarget?.surname===p.surname?'#a78bfa':'#555',
                    borderRadius:8,padding:'6px 14px',cursor:'pointer',fontSize:13,display:'flex',alignItems:'center',gap:6,
                  }}><span>{p.flag}</span><span>{p.surname}</span></button>
                ))}
              </div>
            </Sec>

            {h2hLoad&&<div style={{textAlign:'center',padding:24,color:'#333',fontSize:11}}>⏳ Caricamento H2H...</div>}

            {h2hData&&!h2hLoad&&!h2hData.error&&<>
              {/* Score totale */}
              <div style={{display:'flex',gap:12,marginTop:16,marginBottom:16}}>
                <div style={{flex:1,background:'#0a0a0a',border:'1px solid #00c89622',borderRadius:10,padding:'16px',textAlign:'center'}}>
                  <div style={{fontSize:10,color:'#444',letterSpacing:1,marginBottom:6}}>{sel.name.split(' ').pop().toUpperCase()}</div>
                  <div style={{fontSize:40,fontWeight:700,color:'#00c896',fontFamily:"'DM Mono',monospace"}}>{h2hData.p1wins}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',color:'#222',fontSize:18,fontWeight:700,fontFamily:"'DM Mono',monospace"}}>VS</div>
                <div style={{flex:1,background:'#0a0a0a',border:'1px solid #7c3aed22',borderRadius:10,padding:'16px',textAlign:'center'}}>
                  <div style={{fontSize:10,color:'#444',letterSpacing:1,marginBottom:6}}>{h2hTarget?.name.split(' ').pop().toUpperCase()}</div>
                  <div style={{fontSize:40,fontWeight:700,color:'#a78bfa',fontFamily:"'DM Mono',monospace"}}>{h2hData.p2wins}</div>
                </div>
              </div>

              {/* Per superficie */}
              {h2hData.bySurface?.length>0&&(
                <div style={{marginBottom:16,display:'flex',gap:8,flexWrap:'wrap'}}>
                  {h2hData.bySurface.map((s,i)=>(
                    <div key={i} style={{background:'#0a0a0a',border:'1px solid #111',borderRadius:8,padding:'8px 12px',flex:1,minWidth:80}}>
                      <div style={{fontSize:10,color:'#444',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>{s.surface}</div>
                      <div style={{fontSize:14,fontFamily:"'DM Mono',monospace',color:'#ccc"}}>
                        <span style={{color:'#00c896'}}>{s.p1}</span>
                        <span style={{color:'#333'}}> – </span>
                        <span style={{color:'#a78bfa'}}>{s.p2}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Match list */}
              {h2hData.matches?.length>0&&(
                <Sec title="Ultimi incontri" icon="📋">
                  {h2hData.matches.map((m,i)=>(
                    <div key={i} className="mr" style={{display:'flex',alignItems:'center',gap:8,padding:'8px 8px',borderRadius:8,fontSize:12,marginBottom:2}}>
                      <Badge r={m.result}/>
                      <span style={{color:'#888',flex:1,fontSize:11}}>{m.tournament}</span>
                      <span style={{color:'#333',fontSize:10,fontFamily:"'DM Mono',monospace"}}>{m.score}</span>
                      <span style={{color:'#1a1a1a',fontSize:10}}>{fmtDate(m.date)}</span>
                    </div>
                  ))}
                </Sec>
              )}
            </>}
            {h2hData?.error&&<div style={{padding:16,color:'#ff666688',fontSize:12,marginTop:12}}>⚠️ H2H non disponibile</div>}
          </>}
        </>}
      </div>

      <div style={{marginTop:40,padding:'12px 20px',borderTop:'1px solid #080808',display:'flex',justifyContent:'space-between'}}>
        <span style={{fontSize:9,color:'#151515',letterSpacing:1}}>UNIVERSOSPORTIVO.COM</span>
        <span style={{fontSize:9,color:'#151515',letterSpacing:1}}>TENNIS API · RAPIDAPI</span>
      </div>
    </div>
  )
}

