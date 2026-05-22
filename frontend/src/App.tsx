import { useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type ActivityForm = {
  id: string
  from: string
  to: string
  duration: string
}

type Activity = {
  id: string
  name: string
  from: string
  to: string
  duration: number
}

type NodeTime = {
  id: string
  earliest: number
  latest: number
  slack: number
}

type ActivityResult = {
  id: string
  name: string
  from: string
  to: string
  duration: number
  ES: number
  EF: number
  LS: number
  LF: number
  totalFloat: number
  isCritical: boolean
}

type CPMResult = {
  projectDuration: number
  nodeTimes: NodeTime[]
  activities: ActivityResult[]
  criticalActivities: string[]
}

const initialActivities: Activity[] = [
  { id: 'A', name: 'A', from: '1', to: '2', duration: 3 },
  { id: 'B', name: 'B', from: '1', to: '3', duration: 2 },
  { id: 'C', name: 'C', from: '2', to: '4', duration: 4 },
  { id: 'D', name: 'D', from: '3', to: '4', duration: 1 },
]

const emptyForm: ActivityForm = {
  id: '',
  from: '',
  to: '',
  duration: '',
}

function buildNodes(activities: Activity[]) {
  const nodeIds = new Set<string>()

  for (const activity of activities) {
    nodeIds.add(activity.from)
    nodeIds.add(activity.to)
  }

  return [...nodeIds]
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
    .map((id) => ({ id }))
}

function App() {
  const [form, setForm] = useState<ActivityForm>(emptyForm)
  const [activities, setActivities] = useState<Activity[]>([])
  const [result, setResult] = useState<CPMResult | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const nodes = buildNodes(activities)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmed = {
      id: form.id.trim(),
      from: form.from.trim(),
      to: form.to.trim(),
      duration: Number(form.duration),
    }

    if (!trimmed.id || !trimmed.from || !trimmed.to || Number.isNaN(trimmed.duration)) {
      setError('Wpisz id czynności, zdarzenia początkowe i końcowe oraz czas trwania.')
      return
    }

    setActivities((current) => [
      ...current,
      {
        ...trimmed,
        name: trimmed.id,
      },
    ])
    setForm(emptyForm)
    setError('')
    setResult(null)
  }

  const removeActivity = (id: string) => {
    setActivities((current) => current.filter((activity) => activity.id !== id))
    setResult(null)
  }

  const loadExample = () => {
    setActivities(initialActivities)
    setResult(null)
    setError('')
  }

  const calculate = async () => {
    if (activities.length === 0) {
      setError('Dodaj co najmniej jedną czynność przed uruchomieniem obliczeń.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/cpm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodes,
          activities,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.message ?? 'Nie udało się obliczyć CPM.')
      }

      setResult(payload)
    } catch (requestError) {
      setResult(null)
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Nie udało się połączyć z backendem.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Badania operacyjne i logistyka</p>
          <h1>Kalkulator CPM</h1>
        </div>

        <div className="hero-stats">
          <article>
            <span>Liczba czynności</span>
            <strong>{activities.length}</strong>
          </article>
          <article>
            <span>Liczba zdarzeń</span>
            <strong>{nodes.length}</strong>
          </article>
        </div>
      </section>

      <section className="workspace">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="panel-label">Dane wejściowe</p>
              <h2>Dodaj czynność</h2>
            </div>
            <button type="button" className="ghost-button" onClick={loadExample}>
              Załaduj przykład
            </button>
          </div>

          <form className="activity-form" onSubmit={handleSubmit}>
            <label>
              <span>ID</span>
              <input
                value={form.id}
                onChange={(event) => setForm((current) => ({ ...current, id: event.target.value }))}
                placeholder="A"
              />
            </label>
            <label>
              <span>Od zdarzenia</span>
              <input
                value={form.from}
                onChange={(event) =>
                  setForm((current) => ({ ...current, from: event.target.value }))
                }
                placeholder="1"
              />
            </label>
            <label>
              <span>Do zdarzenia</span>
              <input
                value={form.to}
                onChange={(event) => setForm((current) => ({ ...current, to: event.target.value }))}
                placeholder="2"
              />
            </label>
            <label>
              <span>Czas trwania</span>
              <input
                type="number"
                min="0"
                value={form.duration}
                onChange={(event) =>
                  setForm((current) => ({ ...current, duration: event.target.value }))
                }
                placeholder="3"
              />
            </label>
            <button type="submit" className="primary-button">
              Dodaj czynność
            </button>
          </form>

          {error ? <p className="message error">{error}</p> : null}

          <div className="panel-heading compact">
            <div>
              <p className="panel-label">Wysłane do API</p>
              <h2>Lista czynności</h2>
            </div>
            <button
              type="button"
              className="primary-button"
              onClick={calculate}
              disabled={isLoading}
            >
              {isLoading ? 'Liczenie...' : 'Oblicz CPM'}
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Od</th>
                  <th>Do</th>
                  <th>Czas</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity) => (
                  <tr key={activity.id}>
                    <td>{activity.id}</td>
                    <td>{activity.from}</td>
                    <td>{activity.to}</td>
                    <td>{activity.duration}</td>
                    <td>
                      <button
                        type="button"
                        className="table-action"
                        onClick={() => removeActivity(activity.id)}
                      >
                        Usuń
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel result-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-label">Wynik z backendu</p>
              <h2>Podsumowanie CPM</h2>
            </div>
          </div>

          {result ? (
            <>
              <div className="summary-grid">
                <article>
                  <span>Czas projektu</span>
                  <strong>{result.projectDuration}</strong>
                </article>
                <article>
                  <span>Ścieżka krytyczna</span>
                  <strong>{result.criticalActivities.join(' → ') || 'Brak'}</strong>
                </article>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>ES</th>
                      <th>EF</th>
                      <th>LS</th>
                      <th>LF</th>
                      <th>Rezerwa</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.activities.map((activity) => (
                      <tr key={activity.id}>
                        <td>{activity.id}</td>
                        <td>{activity.ES}</td>
                        <td>{activity.EF}</td>
                        <td>{activity.LS}</td>
                        <td>{activity.LF}</td>
                        <td>{activity.totalFloat}</td>
                        <td>
                          <span
                            className={activity.isCritical ? 'badge critical' : 'badge neutral'}
                          >
                            {activity.isCritical ? 'Krytyczna' : 'Niekrytyczna'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Zdarzenie</th>
                      <th>Najwcześniej</th>
                      <th>Najpóźniej</th>
                      <th>Luz</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.nodeTimes.map((node) => (
                      <tr key={node.id}>
                        <td>{node.id}</td>
                        <td>{node.earliest}</td>
                        <td>{node.latest}</td>
                        <td>{node.slack}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>
                Dodaj dane wejściowe i uruchom obliczenia. Wyniki z `POST /cpm` pojawią się
                tutaj.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

export default App
