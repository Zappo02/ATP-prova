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

export default function App() {
  const [players, setPlayers]   = useState([])
  const [sel, setSel]           = useState(null)
  const [initDone, setInitDone] = useState(false)
  const [log, setLog]           = useState([])

  useEffect(() => {
    const init = async () => {
      try {
        const res  = await get(`${BASE}/atp/ranking/singles?pageSize=100&pageNo=1`)
        const raw  = Array.isArray(res) ? res : (res?.rankings || res?.players || res?.data || [])
        const list = raw.map(row => row.player
          ? { id: row.player.id, name: row.player.name, rank: row.position, points: row.point }
          : { id: row.id, name: row.name||row.playerName, rank: row.position||row.currentRank, points: row.points||row.point }
        )
        const resolved = TARGETS.map(t => {
          const match = list.find(r => (r.name||'').toLowerCase().includes(t.surname.toLowerCase()))
          return match ? { ...t, id:match.id, name:match.name||t.name, rank:match.rank, points:match.points } : { ...t, id:null }
        })
        setPlayers(resolved)
        setSel(resolved[0])
      } catch(e) {
        setPlayers(TARGETS.map(t=>({...t,id:null})))
        setSel({...TARGETS[0],id:null})
      } finally { setInitDone(true) }
    }
    init()
  }, [])

  useEffect(() => {
    if (!sel?.id || !initDone) return
    const load = async () => {
      setLog(['Caricamento...'])
      try {
        const t = sel.tour
        const [statsR, titlesR, rankHistR, fixR] = await Promise.allSettled([
          get(`${BASE}/${t}/player/match-stats/${sel.id}`),
          get(`${BASE}/${t}/player/titles/${sel.id}`),
          get(`${BASE}/${t}/player/perf-breakdown/${sel.id}`),
          get(`${BASE}/${t}/fixtures/player/${sel.id}?include=tournament,round&pageSize=5&filter=PlayerGroup:singles`),
        ])

        const entries = []

        if (statsR.status==='fulfilled')
          entries.push('STATS: ' + JSON.stringify(statsR.value).slice(0,300))
        else entries.push('STATS ERR: ' + statsR.reason)

        if (titlesR.status==='fulfilled') {
          const v = titlesR.value
          const arr = Array.isArray(v) ? v : (v?.titles||v?.data||[])
          entries.push(`TITLES (${arr.length}): primo=` + JSON.stringify(arr[0]).slice(0,200))
          entries.push(`TITLES ultimo=` + JSON.stringify(arr[arr.length-1]).slice(0,200))
        } else entries.push('TITLES ERR: ' + titlesR.reason)

        if (rankHistR.status==='fulfilled')
          entries.push('PERF: ' + JSON.stringify(rankHistR.value).slice(0,300))
        else entries.push('PERF ERR: ' + rankHistR.reason)

        if (fixR.status==='fulfilled') {
          const v = fixR.value
          const arr = Array.isArray(v) ? v : (v?.fixtures||v?.data||[])
          entries.push(`FIX (${arr.length}): ` + JSON.stringify(arr[0]).slice(0,300))
        } else entries.push('FIX ERR: ' + fixR.reason)

        setLog(entries)
      } catch(e) { setLog(['ERR: '+e.message]) }
    }
    load()
  }, [sel, initDone])

  if (!initDone) return <div style={{background:'#050505',color:'#444',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'monospace',fontSize:13}}>🎾 init...</div>

  return (
    <div style={{fontFamily:'monospace',background:'#050505',color:'#e8e8e8',padding:20,minHeight:'100vh'}}>
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        {players.map(p=>(
          <button key={p.surname} onClick={()=>setSel(p)} style={{
            background:sel?.surname===p.surname?'#0d1f1a':'transparent',
            border:`1px solid ${sel?.surname===p.surname?'#00c896':'#333'}`,
            color:sel?.surname===p.surname?'#00c896':'#666',
            borderRadius:6,padding:'4px 12px',cursor:'pointer',fontSize:12
          }}>{p.flag} {p.surname} {p.id?`#${p.id}`:''}</button>
        ))}
      </div>
      {log.map((l,i)=>(
        <pre key={i} style={{background:'#0a0a0a',border:'1px solid #1a1a1a',padding:10,borderRadius:6,marginBottom:8,fontSize:10,whiteSpace:'pre-wrap',wordBreak:'break-all',color:'#aaa'}}>
          {l}
        </pre>
      ))}
    </div>
  )
}

