import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./App.css";

type ActivityForm = {
  id: string;
  from: string;
  to: string;
  duration: string;
};

type Activity = {
  id: string;
  name: string;
  from: string;
  to: string;
  duration: number;
};

type NodeTime = {
  id: string;
  earliest: number;
  latest: number;
  slack: number;
};

type ActivityResult = {
  id: string;
  name: string;
  from: string;
  to: string;
  duration: number;
  ES: number;
  EF: number;
  LS: number;
  LF: number;
  totalFloat: number;
  isCritical: boolean;
};

type CPMResult = {
  projectDuration: number;
  nodeTimes: NodeTime[];
  activities: ActivityResult[];
  criticalActivities: string[];
};

const initialActivities: Activity[] = [
  { id: "A", name: "A", from: "1", to: "2", duration: 3 },
  { id: "B", name: "B", from: "1", to: "3", duration: 2 },
  { id: "C", name: "C", from: "2", to: "4", duration: 4 },
  { id: "D", name: "D", from: "3", to: "4", duration: 1 },
];

const emptyForm: ActivityForm = {
  id: "",
  from: "",
  to: "",
  duration: "",
};

function buildNodes(activities: Activity[]) {
  const nodeIds = new Set<string>();

  for (const activity of activities) {
    nodeIds.add(activity.from);
    nodeIds.add(activity.to);
  }

  return [...nodeIds]
    .sort((left, right) =>
      left.localeCompare(right, undefined, { numeric: true }),
    )
    .map((id) => ({ id }));
}

function buildGraphElements(
  cpmNodes: { id: string }[],
  activities: Activity[],
  result: CPMResult | null,
) {
  const levels = new Map<string, number>();
  for (const node of cpmNodes) {
    levels.set(node.id, 0);
  }

  for (let i = 0; i < cpmNodes.length; i += 1) {
    for (const activity of activities) {
      const fromLevel = levels.get(activity.from) ?? 0;
      const toLevel = levels.get(activity.to) ?? 0;

      if (fromLevel + 1 > toLevel) {
        levels.set(activity.to, fromLevel + 1);
      }
    }
  }

  const graphNodes: Node[] = cpmNodes.map((node) => {
    const level = levels.get(node.id) ?? 0;
    const levelNodes = cpmNodes.filter((item) => levels.get(item.id) === level);
    const row = levelNodes.findIndex((item) => item.id === node.id);
    const centeredRow = row - (levelNodes.length - 1) / 2;
    const nodeTime = result?.nodeTimes.find((item) => item.id === node.id);
    const isCritical = nodeTime ? nodeTime.slack === 0 : false;

    return {
      id: node.id,
      position: {
        x: level * 240,
        y: centeredRow * 150,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: {
        label: (
          <div className="cpm-node">
            <strong>{node.id}</strong>
            {nodeTime ? (
              <span>
                E: {nodeTime.earliest} | L: {nodeTime.latest}
              </span>
            ) : (
              <span>Zdarzenie</span>
            )}
          </div>
        ),
      },
      className: isCritical ? "critical-flow-node" : "flow-node",
    };
  });

  const graphEdges: Edge[] = activities.map((activity) => {
    const activityResult = result?.activities.find(
      (item) => item.id === activity.id,
    );
    const isCritical = activityResult ? activityResult.isCritical : false;
    const label = activityResult
      ? `${activity.id} (${activity.duration}) | R: ${activityResult.totalFloat}`
      : `${activity.id} (${activity.duration})`;

    return {
      id: activity.id,
      source: activity.from,
      target: activity.to,
      label,
      type: "smoothstep",
      animated: isCritical,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isCritical ? "#d94a4a" : "#afa7b5",
      },
      style: {
        stroke: isCritical ? "#d94a4a" : "#afa7b5",
        strokeWidth: isCritical ? 3 : 2,
      },
      labelStyle: {
        fill: isCritical ? "#ffe2e2" : "#faf7fd",
        fontWeight: 700,
      },
      labelBgStyle: {
        fill: isCritical ? "rgba(217, 74, 74, 0.92)" : "rgba(38, 24, 37, 0.92)",
      },
      labelBgPadding: [8, 5],
      labelBgBorderRadius: 8,
    };
  });

  return { graphNodes, graphEdges };
}

function App() {
  const [form, setForm] = useState<ActivityForm>(emptyForm);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [result, setResult] = useState<CPMResult | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const nodes = useMemo(() => buildNodes(activities), [activities]);
  const { graphNodes, graphEdges } = useMemo(
    () => buildGraphElements(nodes, activities, result),
    [activities, nodes, result],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = {
      id: form.id.trim(),
      from: form.from.trim(),
      to: form.to.trim(),
      duration: Number(form.duration),
    };

    if (
      !trimmed.id ||
      !trimmed.from ||
      !trimmed.to ||
      Number.isNaN(trimmed.duration)
    ) {
      setError(
        "Wpisz id czynności, zdarzenia początkowe i końcowe oraz czas trwania.",
      );
      return;
    }

    setActivities((current) => [
      ...current,
      {
        ...trimmed,
        name: trimmed.id,
      },
    ]);
    setForm(emptyForm);
    setError("");
    setResult(null);
  };

  const removeActivity = (id: string) => {
    setActivities((current) =>
      current.filter((activity) => activity.id !== id),
    );
    setResult(null);
  };

  const loadExample = () => {
    setActivities(initialActivities);
    setResult(null);
    setError("");
  };

  const calculate = async () => {
    if (activities.length === 0) {
      setError(
        "Dodaj co najmniej jedną czynność przed uruchomieniem obliczeń.",
      );
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/cpm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nodes,
          activities,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Nie udało się obliczyć CPM.");
      }

      setResult(payload);
    } catch (requestError) {
      setResult(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nie udało się połączyć z backendem.",
      );
    } finally {
      setIsLoading(false);
    }
  };

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
            <button
              type="button"
              className="ghost-button"
              onClick={loadExample}
            >
              Załaduj przykład
            </button>
          </div>

          <form className="activity-form" onSubmit={handleSubmit}>
            <label>
              <span>ID</span>
              <input
                value={form.id}
                onChange={(event) =>
                  setForm((current) => ({ ...current, id: event.target.value }))
                }
                placeholder="A"
              />
            </label>
            <label>
              <span>Od zdarzenia</span>
              <input
                value={form.from}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    from: event.target.value,
                  }))
                }
                placeholder="1"
              />
            </label>
            <label>
              <span>Do zdarzenia</span>
              <input
                value={form.to}
                onChange={(event) =>
                  setForm((current) => ({ ...current, to: event.target.value }))
                }
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
                  setForm((current) => ({
                    ...current,
                    duration: event.target.value,
                  }))
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
              {isLoading ? "Liczenie..." : "Oblicz CPM"}
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
                  <strong>
                    {result.criticalActivities.join(" → ") || "Brak"}
                  </strong>
                </article>
              </div>

              <div className="graph-panel">
                <div className="panel-heading compact">
                  <div>
                    <h2>Wykres CPM</h2>
                  </div>
                  <span className="graph-legend">
                    Czerwone = ścieżka krytyczna
                  </span>
                </div>

                <div className="flow-canvas">
                  <ReactFlow
                    nodes={graphNodes}
                    edges={graphEdges}
                    fitView
                    fitViewOptions={{ padding: 0.25 }}
                    minZoom={0.35}
                    maxZoom={1.4}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={false}
                  >
                    <Background gap={22} color="rgba(250, 247, 253, 0.12)" />
                    <MiniMap pannable zoomable />
                    <Controls showInteractive={false} />
                  </ReactFlow>
                </div>
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
                            className={
                              activity.isCritical
                                ? "badge critical"
                                : "badge neutral"
                            }
                          >
                            {activity.isCritical ? "Krytyczna" : "Niekrytyczna"}
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
                Dodaj dane wejściowe i uruchom obliczenia. Wyniki z `POST /cpm`
                pojawią się tutaj.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
