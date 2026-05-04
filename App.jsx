import { useState, useEffect, useCallback } from 'react'

// ─── CONFIGURAZIONE ──────────────────────────────────────────────────────────
// Inserisci qui la tua chiave RapidAPI dopo essersi iscritto su:
// https://rapidapi.com/jjrm365-kIFr3Nx_odV/api/tennis-api-atp-wta-itf
const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY || 'INSERISCI_LA_TUA_CHIAVE_QUI'
const API_HOST = 'tennis-api-atp-wta-itf.p.rapidapi.com'
const BASE_URL = 'https://tennis-api-atp-wta-itf.p.rapidapi.com/tennis/v2'

// ─── ROSTER GIOCATORI ────────────────────────────────────────────────────────
// player_id = ID numerico usato dall'API (recuperabile via /search)
const PLAYERS = [
  { id: '207989', name: 'Jannik Sinner',    country: 'ITA', flag: '🇮🇹', tour: 'atp' },
  { id: '126774', name: 'Carlos Alcaraz',   country: 'ESP', flag: '🇪🇸', tour: 'atp' },
  { id: '144716', name: 'Novak Djokovic',   country: 'SRB', flag: '🇷🇸', tour: 'atp' },
  { id: '111474', name: 'Rafael Nadal',     country: 'ESP', flag: '🇪🇸', tour: 'atp' },
  { id: '106401', name: 'Roger Federer',    country: 'SUI', flag: '🇨🇭', tour: 'atp' },
  { id: '155116', name: 'Lorenzo Musetti',  country: 'ITA', flag: '🇮🇹', tour: 'atp' },
  { id: '229910', name: 'Matteo Berrettini',country: 'ITA', flag: '🇮🇹', tour: 'atp' },
]

// ─── HELPERS API ─────────────────────────────────────────────────────────────
const apiFetch = async (endpoint) => {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': API_HOST,
    },
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

// Formatta data ISO → DD/MM/YYYY
const fmtDate = (str) => {
  if (!str) return '–'
  const d = new Date(str)
  return isNaN(d) ? str : d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ─── MOCK DATA (usato quando API key non configurata) ─────────────────────────
const MOCK_DATA = {
  profile: {
    full_name: 'Jannik Sinner',
    country: 'Italy',
    birth_date: '2001-08-16',
    height: 188,
    plays: 'Right-handed',
    turned_pro: 2018,
    coach: 'Simone Vagnozzi',
  },
  ranking: { rank: 1, points: 11030, movement: '+0' },
  titles: { total: 18, current_year: 4, grand_slams: 2 },
  recent: [
    { tournament: 'Australian Open', result: 'W', opponent: 'Zverev A.', score: '6-3 7-6 6-3', date: '2025-01-26' },
    { tournament: 'US Open', result: 'W', opponent: 'Fritz T.', score: '6-3 6-4 7-5', date: '2024-09-08' },
    { tournament: 'Miami Open', result: 'F', opponent: 'Alcaraz C.', score: '7-6 6-2', date: '2024-04-07' },
    { tournament: 'Rotterdam', result: 'W', opponent: 'De Minaur A.', score: '7-5 6-4', date: '2025-02-09' },
    { tournament: 'Cincinnati', result: 'SF', opponent: 'Fritz T.', score: '6-4 6-4', date: '2024-08-17' },
  ],
  upcoming: [
    { tournament: 'Roland Garros', surface: 'Terra', start: '2025-05-25', category: 'Grand Slam' },
    { tournament: 'Internazionali BNL', surface: 'Terra', start: '2025-05-07', category: 'Masters 1000' },
    { tournament: 'Wimbledon', surface: 'Erba', start: '2025-06-30', category: 'Grand Slam' },
  ],
  prize_money: '€ 22.4M career',
}

// ─── COMPONENTI UI ───────────────────────────────────────────────────────────

const Pill = ({ label, value, color = '#00c896' }) => (
  <div style={{
    background: '#0a0a0a',
    border: `1px solid ${color}22`,
    borderRadius: 8,
    padding: '12px 16px',
    textAlign: 'center',
    flex: 1,
    minWidth: 90,
  }}>
    <div style={{ color, fontSize: 22, fontWeight: 700, fontFamily: "'DM Mono', monospace", letterSpacing: -1 }}>
      {value}
    </div>
    <div style={{ color: '#666', fontSize: 11, marginTop: 3, textTransform: 'uppercase', letterSpacing: 1 }}>
      {label}
    </div>
  </div>
)

const Section = ({ title, children }) => (
  <div style={{ marginTop: 24 }}>
    <div style={{
      fontSize: 11,
      color: '#444',
      textTransform: 'uppercase',
      letterSpacing: 2,
      marginBottom: 12,
      paddingBottom: 8,
      borderBottom: '1px solid #1a1a1a',
    }}>
      {title}
    </div>
    {children}
  </div>
)

const ResultBadge = ({ r }) => {
  const colors = { W: '#00c896', F: '#f59e0b', SF: '#f59e0b', QF: '#888', R16: '#555' }
  const color = colors[r] || '#555'
  return (
    <span style={{
      display: 'inline-block',
      background: color + '22',
      color,
      border: `1px solid ${color}44`,
      borderRadius: 4,
      padding: '1px 7px',
      fontSize: 11,
      fontWeight: 700,
      fontFamily: "'DM Mono', monospace",
    }}>
      {r}
    </span>
  )
}

// ─── APP PRINCIPALE ───────────────────────────────────────────────────────────
export default function App() {
  const [selectedPlayer, setSelectedPlayer] = useState(PLAYERS[0])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [usingMock, setUsingMock] = useState(false)

  const loadPlayer = useCallback(async (player) => {
    setLoading(true)
    setError(null)
    setData(null)
    setUsingMock(false)

    // Se API key non configurata → usa mock
    if (!RAPIDAPI_KEY || RAPIDAPI_KEY === 'INSERISCI_LA_TUA_CHIAVE_QUI') {
      await new Promise(r => setTimeout(r, 600))
      setData(MOCK_DATA)
      setUsingMock(true)
      setLoading(false)
      return
    }

    try {
      const tour = player.tour

      // Chiamate parallele
      const [profileRes, rankingRes, statsRes] = await Promise.allSettled([
        apiFetch(`/${tour}/player/${player.id}`),
        apiFetch(`/${tour}/rankings/singles`),
        apiFetch(`/${tour}/player/${player.id}/stats`),
      ])

      const profile = profileRes.status === 'fulfilled' ? profileRes.value : {}
      const rankingList = rankingRes.status === 'fulfilled' ? rankingRes.value?.rankings || [] : []
      const stats = statsRes.status === 'fulfilled' ? statsRes.value : {}

      // Trova ranking del giocatore nella lista
      const rankEntry = rankingList.find(r => String(r.player_id) === String(player.id)) || {}

      // Partite recenti (ultime 5)
      const matchesRes = await apiFetch(`/${tour}/player/${player.id}/matches?limit=5`)
      const recent = matchesRes?.matches || []

      // Prossimi tornei
      const fixturesRes = await apiFetch(`/${tour}/fixtures/player/${player.id}?limit=3`)
      const upcoming = fixturesRes?.fixtures || []

      setData({
        profile: profile?.player || profile,
        ranking: {
          rank: rankEntry.ranking || '–',
          points: rankEntry.ranking_points || stats?.ranking_points || '–',
          movement: rankEntry.movement || '0',
        },
        titles: {
          total: stats?.titles || profile?.titles || '–',
          current_year: stats?.titles_year || '–',
          grand_slams: stats?.grand_slams || '–',
        },
        recent: recent.slice(0, 5).map(m => ({
          tournament: m.tournament_name || m.tournament || '–',
          result: m.result || m.round || '–',
          opponent: m.opponent_name || '–',
          score: m.score || '–',
          date: m.date || '',
        })),
        upcoming: upcoming.slice(0, 3).map(f => ({
          tournament: f.tournament_name || f.name || '–',
          surface: f.surface || '–',
          start: f.start_date || f.date || '',
          category: f.category || f.level || '–',
        })),
        prize_money: stats?.prize_money || profile?.prize_money || '–',
      })
    } catch (err) {
      setError(`Errore nel caricamento: ${err.message}. Verifica la tua API key.`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPlayer(selectedPlayer)
  }, [selectedPlayer, loadPlayer])

  return (
    <div style={{
      fontFamily: "'DM Sans', -apple-system, sans-serif",
      background: '#050505',
      color: '#e8e8e8',
      minHeight: '100vh',
      padding: '0 0 40px',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } 
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 2px; }
        .player-btn { transition: all .15s; }
        .player-btn:hover { border-color: #00c89644 !important; background: #0d1f1a !important; }
        .match-row:hover { background: #0d0d0d !important; }
      `}</style>

      {/* Header */}
      <div style={{
        borderBottom: '1px solid #111',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <span style={{ fontSize: 18 }}>🎾</span>
        <span style={{ fontSize: 13, color: '#444', letterSpacing: 1, textTransform: 'uppercase' }}>
          Tennis Player Stats
        </span>
        {usingMock && (
          <span style={{
            marginLeft: 'auto',
            fontSize: 10,
            background: '#f59e0b22',
            color: '#f59e0b',
            border: '1px solid #f59e0b33',
            borderRadius: 4,
            padding: '2px 8px',
            letterSpacing: 0.5,
          }}>
            DEMO — dati simulati
          </span>
        )}
      </div>

      {/* Player selector */}
      <div style={{ padding: '16px 20px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 8, minWidth: 'max-content' }}>
          {PLAYERS.map(p => (
            <button
              key={p.id}
              className="player-btn"
              onClick={() => setSelectedPlayer(p)}
              style={{
                background: selectedPlayer.id === p.id ? '#0d1f1a' : 'transparent',
                border: `1px solid ${selectedPlayer.id === p.id ? '#00c896' : '#1a1a1a'}`,
                color: selectedPlayer.id === p.id ? '#00c896' : '#666',
                borderRadius: 8,
                padding: '6px 14px',
                cursor: 'pointer',
                fontSize: 13,
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>{p.flag}</span>
              <span>{p.name.split(' ').pop()}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '0 20px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#333' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>⏳</div>
            <div style={{ fontSize: 13 }}>Caricamento dati...</div>
          </div>
        )}

        {error && (
          <div style={{
            background: '#1a0a0a',
            border: '1px solid #ff444422',
            borderRadius: 8,
            padding: 16,
            color: '#ff6666',
            fontSize: 13,
          }}>
            ⚠️ {error}
          </div>
        )}

        {data && !loading && (
          <>
            {/* Player header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '20px 0 0',
            }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: '#0d1f1a',
                border: '2px solid #00c89633',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                flexShrink: 0,
              }}>
                {selectedPlayer.flag}
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.5 }}>
                  {data.profile?.full_name || selectedPlayer.name}
                </div>
                <div style={{ fontSize: 12, color: '#444', marginTop: 2 }}>
                  {data.profile?.country || selectedPlayer.country}
                  {data.profile?.birth_date && ` · Nato il ${fmtDate(data.profile.birth_date)}`}
                  {data.profile?.height && ` · ${data.profile.height} cm`}
                </div>
              </div>
            </div>

            {/* Stat pills */}
            <Section title="Classifica & statistiche">
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Pill label="Ranking ATP" value={`#${data.ranking.rank}`} color="#00c896" />
                <Pill label="Punti" value={data.ranking.points?.toLocaleString?.() || data.ranking.points} color="#00c896" />
                <Pill label="Titoli totali" value={data.titles.total} color="#f59e0b" />
                <Pill label="Titoli 2025" value={data.titles.current_year} color="#f59e0b" />
                <Pill label="Slam" value={data.titles.grand_slams} color="#f59e0b" />
              </div>
              {data.prize_money && data.prize_money !== '–' && (
                <div style={{ marginTop: 12, fontSize: 12, color: '#444' }}>
                  Prize money: <span style={{ color: '#888' }}>{data.prize_money}</span>
                </div>
              )}
            </Section>

            {/* Ultimi risultati */}
            {data.recent?.length > 0 && (
              <Section title="Ultimi risultati">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {data.recent.map((m, i) => (
                    <div key={i} className="match-row" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 10px',
                      borderRadius: 6,
                      fontSize: 13,
                    }}>
                      <ResultBadge r={m.result} />
                      <span style={{ color: '#ccc', flex: 1 }}>{m.tournament}</span>
                      <span style={{ color: '#555', fontSize: 12 }}>vs {m.opponent}</span>
                      {m.score && m.score !== '–' && (
                        <span style={{
                          color: '#444',
                          fontSize: 11,
                          fontFamily: "'DM Mono', monospace",
                        }}>
                          {m.score}
                        </span>
                      )}
                      {m.date && (
                        <span style={{ color: '#2a2a2a', fontSize: 11 }}>{fmtDate(m.date)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Prossimi tornei */}
            {data.upcoming?.length > 0 && (
              <Section title="Prossimi tornei">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data.upcoming.map((t, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      background: '#0a0a0a',
                      border: '1px solid #111',
                      borderRadius: 8,
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: '#ccc' }}>{t.tournament}</div>
                        <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>
                          {t.category}
                          {t.surface && t.surface !== '–' && ` · ${t.surface}`}
                        </div>
                      </div>
                      {t.start && (
                        <div style={{
                          fontSize: 12,
                          color: '#00c89688',
                          fontFamily: "'DM Mono', monospace",
                          whiteSpace: 'nowrap',
                        }}>
                          {fmtDate(t.start)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Info aggiuntive */}
            {(data.profile?.plays || data.profile?.turned_pro || data.profile?.coach) && (
              <Section title="Profilo">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    ['Gioco', data.profile.plays],
                    ['Pro dal', data.profile.turned_pro],
                    ['Coach', data.profile.coach],
                  ].filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', gap: 12, fontSize: 13 }}>
                      <span style={{ color: '#333', minWidth: 80 }}>{k}</span>
                      <span style={{ color: '#999' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 32,
        padding: '0 20px',
        borderTop: '1px solid #0d0d0d',
        paddingTop: 16,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 11, color: '#222' }}>
          universosportivo.com
        </span>
        <span style={{ fontSize: 11, color: '#222' }}>
          Dati via Tennis API · RapidAPI
        </span>
      </div>
    </div>
  )
}
