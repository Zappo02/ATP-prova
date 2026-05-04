import { useState, useEffect } from 'react'

const RAPIDAPI_KEY = '61137ff3cfmsh3c349b4d3d87940p139f00jsn9c74e5c883b9'
const API_HOST = 'tennis-api-atp-wta-itf.p.rapidapi.com'

export default function App() {
  const [log, setLog] = useState([])

  useEffect(() => {
    const run = async () => {
      const tests = [
        'https://tennis-api-atp-wta-itf.p.rapidapi.com/tennis/v2/atp/player/profile/106421',
        'https://tennis-api-atp-wta-itf.p.rapidapi.com/tennis/v2/atp/player?pageSize=2',
        'https://tennis-api-atp-wta-itf.p.rapidapi.com/tennis/v2/atp/fixtures',
      ]

      for (const url of tests) {
        try {
          const res = await fetch(url, {
            headers: {
              'X-RapidAPI-Key': RAPIDAPI_KEY,
              'X-RapidAPI-Host': API_HOST,
            },
          })
          const text = await res.text()
          setLog(l => [...l, `[${res.status}] ${url.split('v2/')[1]}\n${text.slice(0, 300)}`])
        } catch (e) {
          setLog(l => [...l, `[ERR] ${url.split('v2/')[1]}\n${e.message}`])
        }
      }
    }
    run()
  }, [])

  return (
    <div style={{ fontFamily: 'monospace', background: '#050505', color: '#e8e8e8', padding: 20, minHeight: '100vh' }}>
      <h2 style={{ color: '#00c896', marginBottom: 16 }}>🔍 API Debug</h2>
      {log.length === 0 && <p style={{ color: '#666' }}>Testing...</p>}
      {log.map((entry, i) => (
        <pre key={i} style={{
          background: '#0a0a0a',
          border: `1px solid ${entry.startsWith('[200]') ? '#00c89633' : '#ff444433'}`,
          color: entry.startsWith('[200]') ? '#00c896' : '#ff6666',
          padding: 12,
          borderRadius: 8,
          marginBottom: 12,
          fontSize: 11,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}>
          {entry}
        </pre>
      ))}
    </div>
  )
}

