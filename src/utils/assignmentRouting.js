export const WORK_RANK_WEIGHTS = {
  High: 3,
  Moderate: 2,
  Low: 1
};

export const calculateProcessingAgentWorkloads = (files, agents, workRanks = {}) => {
  const eligibleAgents = (agents || [])
    .filter(agent => agent?.role === 'Processing Agent')
    .map(agent => agent.fullName || agent.name || agent.username)
    .filter(Boolean);
  const uniqueAgents = [...new Set(eligibleAgents)].sort((left, right) => left.localeCompare(right));

  const workloads = new Map(uniqueAgents.map(name => [name, { points: 0, activeFiles: 0 }]));
  for (const file of files || []) {
    const assignee = file?.assignedTo;
    const workload = workloads.get(assignee);
    if (!workload || (file.fileType && file.fileType !== 'Visa') || file.status === 'DONE' || file.status === 'RECEIVED_SALES') continue;

    const rank = workRanks[file.destination] || 'Moderate';
    workload.points += WORK_RANK_WEIGHTS[rank] || WORK_RANK_WEIGHTS.Moderate;
    workload.activeFiles++;
  }

  return uniqueAgents.map(name => ({
    name,
    ...workloads.get(name)
  }));
};

export const chooseProcessingAgent = (
  files,
  agents,
  workRanks = {},
  lastAssignedAgent = '',
  destination = '',
  destinationAgents = {}
) => {
  const configuredAgents = destinationAgents[destination];
  const eligibleAgents = Array.isArray(configuredAgents) && configuredAgents.length > 0
    ? (agents || []).filter(agent => configuredAgents.includes(agent.fullName || agent.name || agent.username))
    : agents || [];
  const workloads = calculateProcessingAgentWorkloads(files, eligibleAgents, workRanks);
  if (workloads.length === 0) return null;

  const minimumPoints = Math.min(...workloads.map(workload => workload.points));
  const leastLoaded = workloads.filter(workload => workload.points === minimumPoints);
  const minimumFileCount = Math.min(...leastLoaded.map(workload => workload.activeFiles));
  const tiedAgents = leastLoaded
    .filter(workload => workload.activeFiles === minimumFileCount)
    .map(workload => workload.name);
  const nextAfterLast = tiedAgents.find(name => name.localeCompare(lastAssignedAgent) > 0);
  return nextAfterLast || tiedAgents[0];
};
