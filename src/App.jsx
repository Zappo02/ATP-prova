import { useState, useEffect } from 'react'

const KEY  = '61137ff3cfmsh3c349b4d3d87940p139f00jsn9c74e5c883b9'
const HOST = 'tennis-api-atp-wta-itf.p.rapidapi.com'
const BASE = 'https://tennis-api-atp-wta-itf.p.rapidapi.com/tennis/v2'

const get = async (url) => {
  const r = await fetch(url, { headers: { 'X-RapidAPI-Key': KEY, 'X-RapidAPI-Host': HOST } })
  if (!r.ok) throw new Error(`${r.status} ${url.split('v2')[1]}`)
  const j = await r.json()
  return j?.data ?? j
}

const TARGETS = [
  { surname:'Sinner',     name:'Jannik Sinner',     flag:'🇮🇹', tour:'atp' },
  { surname:'Djokovic',   name:'Novak Djokovic',    flag:'🇷🇸', tour:'atp' },
  { surname:'Berrettini', name:'Matteo Berrettini', flag:'🇮🇹', tour:'atp' },
]

export default function App() {
  const [players, setPlayers] = useState([])
  const [sel, setSel]         = useState(null)
  const [initDone, setInitDone] = useState(false)
  const [log, setLog]         = useState([])

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
          return m ? {...t, id:m.id, rank:m.rank, points:m.points} : {...t, id:null}
        })
        setPlayers(resolved); setSel(resolved[0])
        setLog([`Ranking loaded. Sinner=${resolved[0]?.id} rank=${resolved[0]?.rank} pts=${resolved[0]?.points}`])
      } catch(e) {
        setLog(['INIT ERR: '+e.message])
        setPlayers(TARGETS.map(t=>({...t,id:null}))); setSel({...TARGETS[0],id:null})
      } finally { setInitDone(true) }
    }
    init()
  }, [])

  useEffect(() => {
    if (!sel?.id || !initDone) return
    const load = async () => {
      setLog(['Loading ' + sel.name + ' id=' + sel.id])
      const entries = []
      try {
        const t = sel.tour

        // 1. Profile
        try {
          const p = await get(`${BASE}/${t}/player/profile/${sel.id}?include=ranking,country`)
          entries.push('PROFILE keys: ' + Object.keys(p).join(', '))
          entries.push('PROFILE: currentRank=' + p.currentRank + ' points=' + p.points + ' curRank=' + JSON.stringify(p.curRank) + ' ranking=' + JSON.stringify(p.ranking))
          entries.push('PROFILE birthday=' + p.birthday + ' height=' + p.height + ' turnedPro=' + p.turnedPro + ' country=' + JSON.stringify(p.country))
        } catch(e) { entries.push('PROFILE ERR: '+e.message) }

        // 2. Perf breakdown — anni e struttura rank
        try {
          const p = await get(`${BASE}/${t}/player/perf-breakdown/${sel.id}`)
          const years = Object.keys(p||{}).filter(k=>/^\d{4}$/.test(k)).sort()
          entries.push('PERF years: ' + years.join(', '))
          // Mostra struttura completa per 2023 e 2024
          for (const yr of ['2023','2024','2025']) {
            if (p[yr]) entries.push(`PERF ${yr}: ` + JSON.stringify(p[yr]).slice(0,400))
          }
        } catch(e) { entries.push('PERF ERR: '+e.message) }

        // 3. Fixtures — struttura completa primi 3
        try {
          const f = await get(`${BASE}/${t}/fixtures/player/${sel.id}?include=tournament,round&pageSize=10&filter=PlayerGroup:singles`)
          const arr = Array.isArray(f)?f:(f?.fixtures||f?.data||[])
          entries.push(`FIXTURES total=${arr.length}`)
          arr.slice(0,3).forEach((x,i) => entries.push(`FIX[${i}]: ` + JSON.stringify(x).slice(0,300)))
        } catch(e) { entries.push('FIX ERR: '+e.message) }

        // 4. H2H tra Sinner e Djokovic (IDs dinamici)
        if (players[0]?.id && players[1]?.id) {
          try {
            const h = await get(`${BASE}/${t}/h2h/info/${players[0].id}/${players[1].id}`)
            entries.push('H2H Sinner-Djokovic keys: ' + Object.keys(h||{}).join(', '))
            entries.push('H2H: ' + JSON.stringify(h).slice(0,400))
          } catch(e) { entries.push('H2H ERR: '+e.message) }

          // Prova anche endpoint alternativo
          try {
            const h2 = await get(`${BASE}/${t}/h2h/matches/${players[0].id}/${players[1].id}?pageSize=5`)
            entries.push('H2H MATCHES keys: ' + Object.keys(h2||{}).join(', '))
            entries.push('H2H MATCHES: ' + JSON.stringify(h2).slice(0,400))
          } catch(e) { entries.push('H2H MATCHES ERR: '+e.message) }
        }

      } catch(e) { entries.push('GLOBAL ERR: '+e.message) }
      setLog(entries)
    }
    load()
  }, [sel, initDone])

  if (!initDone) return <div style={{background:'#050505',color:'#444',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>loading...</div>

  return (
    <div style={{fontFamily:'monospace',background:'#050505',color:'#e8e8e8',padding:16,minHeight:'100vh',fontSize:11}}>
      <div style={{display:'flex',gap:8,marginBottom:12}}>
        {players.map(p=>(
          <button key={p.surname} onClick={()=>setSel(p)} style={{
            background:sel?.surname===p.surname?'#0d1f1a':'#0a0a0a',
            border:`1px solid ${sel?.surname===p.surname?'#00c896':'#222'}`,
            color:sel?.surname===p.surname?'#00c896':'#666',
            borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:11
          }}>{p.flag} {p.surname} {p.id?`#${p.id}`:''}</button>
        ))}
      </div>
      {log.map((l,i)=>(
        <pre key={i} style={{background:'#080808',border:'1px solid #111',padding:8,borderRadius:6,marginBottom:6,whiteSpace:'pre-wrap',wordBreak:'break-all',color:'#888',lineHeight:1.5}}>
          {l}
        </pre>
      ))}
    </div>
  )
}

