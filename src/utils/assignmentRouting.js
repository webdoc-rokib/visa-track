export const WORK_RANK_WEIGHTS = {
  High: 3,
  Moderate: 2,
  Low: 1
};

export const MAX_VISA_FAMILY_SIZE = 100;

export const calculateProcessingAgentWorkloads = (files, agents, workRanks = {}) => {
  const eligibleAgents = (agents || [])
    .filter(agent => agent?.role === 'Processing Agent')
    .map(agent => agent.fullName || agent.name || agent.username)
    .filter(Boolean);
  const uniqueAgents = [...new Set(eligibleAgents)].sort((left, right) => left.localeCompare(right));

  const workloads = new Map(uniqueAgents.map(name => [name, { points: 0, activeFiles: 0 }]));
  for (const file of files || []) {
    const reservedFamilyAssignee = file?.familyGroupId ? file.familyGroupAssignedTo : '';
    const assignee = reservedFamilyAssignee || file?.assignedTo;
    const workload = workloads.get(assignee);
    if (!workload || (file.fileType && file.fileType !== 'Visa') || file.status === 'DONE' || (
      file.status === 'RECEIVED_SALES' && !reservedFamilyAssignee
    )) continue;

    const rank = workRanks[file.destination] || 'Moderate';
    workload.points += WORK_RANK_WEIGHTS[rank] || WORK_RANK_WEIGHTS.Moderate;
    workload.activeFiles++;
  }

  return uniqueAgents.map(name => ({
    name,
    ...workloads.get(name)
  }));
};

export const isProcessingAgentEligibleForDestinations = (agentName, destinations, destinationAgents = {}) => {
  const destinationList = Array.isArray(destinations) ? destinations : [destinations];
  return destinationList.every(destination => {
    const configuredAgents = destinationAgents[destination];
    return !Array.isArray(configuredAgents) || configuredAgents.length === 0 || configuredAgents.includes(agentName);
  });
};

export const chooseProcessingAgent = (
  files,
  agents,
  workRanks = {},
  lastAssignedAgent = '',
  destinations = '',
  destinationAgents = {}
) => {
  const destinationList = Array.isArray(destinations) ? destinations : [destinations];
  const eligibleAgents = (agents || []).filter(agent => {
    const name = agent.fullName || agent.name || agent.username;
    return isProcessingAgentEligibleForDestinations(name, destinationList, destinationAgents);
  });
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
