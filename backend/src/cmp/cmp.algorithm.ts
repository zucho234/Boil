type CPMInput = {
  nodes: { id: string }[];
  activities: {
    id: string;
    from: string;
    to: string;
    duration: number;
    name?: string;
  }[];
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

export function calculateCPM(input: CPMInput): CPMResult {
  const nodeIds = new Set(input.nodes.map((node) => node.id));

  for (const activity of input.activities) {
    if (activity.duration < 0) {
      throw new Error(`Activity "${activity.id}" has negative duration.`);
    }
    if (!nodeIds.has(activity.from) || !nodeIds.has(activity.to)) {
      throw new Error(`Activity "${activity.id}" references a missing node.`);
    }
  }

  const incomingCount = new Map<string, number>();
  const outgoing = new Map<string, typeof input.activities>();
  const incoming = new Map<string, typeof input.activities>();

  for (const node of input.nodes) {
    incomingCount.set(node.id, 0);
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
  }

  for (const activity of input.activities) {
    outgoing.get(activity.from)!.push(activity);
    incoming.get(activity.to)!.push(activity);
    incomingCount.set(activity.to, (incomingCount.get(activity.to) || 0) + 1);
  }

  const startNodes = input.nodes.filter((node) => (incoming.get(node.id) || []).length === 0);
  const endNodes = input.nodes.filter((node) => (outgoing.get(node.id) || []).length === 0);

  if (startNodes.length === 0) {
    throw new Error('Graph must have a start node.');
  }
  if (endNodes.length === 0) {
    throw new Error('Graph must have an end node.');
  }

  const queue: string[] = [];
  for (const node of input.nodes) {
    if ((incomingCount.get(node.id) || 0) === 0) {
      queue.push(node.id);
    }
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    order.push(nodeId);

    for (const activity of outgoing.get(nodeId) || []) {
      const next = (incomingCount.get(activity.to) || 0) - 1;
      incomingCount.set(activity.to, next);
      if (next === 0) {
        queue.push(activity.to);
      }
    }
  }

  if (order.length !== input.nodes.length) {
    throw new Error('Graph contains a cycle.');
  }

  const earliest = new Map<string, number>();
  for (const node of input.nodes) {
    earliest.set(node.id, 0);
  }

  for (const nodeId of order) {
    for (const activity of outgoing.get(nodeId) || []) {
      const candidate = (earliest.get(nodeId) || 0) + activity.duration;
      if (candidate > (earliest.get(activity.to) || 0)) {
        earliest.set(activity.to, candidate);
      }
    }
  }

  let projectDuration = 0;
  for (const endNode of endNodes) {
    projectDuration = Math.max(projectDuration, earliest.get(endNode.id) || 0);
  }

  const latest = new Map<string, number>();
  for (const node of input.nodes) {
    latest.set(node.id, projectDuration);
  }

  for (let i = order.length - 1; i >= 0; i--) {
    const nodeId = order[i];
    const out = outgoing.get(nodeId) || [];

    if (out.length === 0) {
      latest.set(nodeId, projectDuration);
      continue;
    }

    let minValue = Infinity;
    for (const activity of out) {
      const value = (latest.get(activity.to) || 0) - activity.duration;
      if (value < minValue) {
        minValue = value;
      }
    }
    latest.set(nodeId, minValue);
  }

  const nodeTimes: NodeTime[] = input.nodes.map((node) => ({
    id: node.id,
    earliest: earliest.get(node.id) || 0,
    latest: latest.get(node.id) || 0,
    slack: (latest.get(node.id) || 0) - (earliest.get(node.id) || 0),
  }));

  const activities: ActivityResult[] = input.activities.map((activity) => {
    const ES = earliest.get(activity.from) || 0;
    const EF = ES + activity.duration;
    const LF = latest.get(activity.to) || 0;
    const LS = LF - activity.duration;
    const totalFloat = LS - ES;

    return {
      id: activity.id,
      name: activity.name || activity.id,
      from: activity.from,
      to: activity.to,
      duration: activity.duration,
      ES,
      EF,
      LS,
      LF,
      totalFloat,
      isCritical: totalFloat === 0,
    };
  });

  return {
    projectDuration,
    nodeTimes,
    activities,
    criticalActivities: activities.filter((a) => a.isCritical).map((a) => a.id),
  };
}
