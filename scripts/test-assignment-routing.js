import assert from 'node:assert/strict';
import {
  calculateProcessingAgentWorkloads,
  chooseProcessingAgent,
  isProcessingAgentEligibleForDestinations
} from '../src/utils/assignmentRouting.js';

const agents = [
  { role: 'Processing Agent', fullName: 'Alice' },
  { role: 'Processing Agent', fullName: 'Ben' },
  { role: 'Sales Rep', fullName: 'Sam' }
];

assert.equal(chooseProcessingAgent([], agents), 'Alice');
assert.equal(chooseProcessingAgent([], [{ role: 'Sales Rep', fullName: 'Sam' }]), null);

assert.equal(
  chooseProcessingAgent(
    [
      { fileType: 'Visa', status: 'SUBMITTED', destination: 'Canada', assignedTo: 'Alice' },
      { fileType: 'Visa', status: 'RECEIVED_SALES', destination: 'Canada', assignedTo: 'Ben' },
      { fileType: 'Visa', status: 'DONE', destination: 'Canada', assignedTo: 'Ben' },
      { fileType: 'Air Ticket', status: 'SUBMITTED', destination: 'Canada', assignedTo: 'Ben' }
    ],
    agents,
    { Canada: 'High' }
  ),
  'Ben'
);

const rankedWorkload = [
  { fileType: 'Visa', status: 'PROCESSING', destination: 'Canada', assignedTo: 'Alice' },
  { fileType: 'Visa', status: 'PROCESSING', destination: 'UK', assignedTo: 'Ben' }
];
assert.equal(
  chooseProcessingAgent(rankedWorkload, agents, { Canada: 'High', UK: 'Low' }),
  'Ben'
);
assert.equal(
  chooseProcessingAgent(
    [{ fileType: 'Visa', status: 'PROCESSING', destination: 'Canada', assignedTo: 'Alice' }],
    agents,
    { Canada: 'Unknown rank' }
  ),
  'Ben'
);
assert.equal(
  chooseProcessingAgent(
    [
      { fileType: 'Visa', status: 'PROCESSING', destination: 'UK', assignedTo: 'Alice' },
      { fileType: 'Visa', status: 'PROCESSING', destination: 'UK', assignedTo: 'Alice' },
      { fileType: 'Visa', status: 'PROCESSING', destination: 'Canada', assignedTo: 'Ben' }
    ],
    agents,
    { UK: 'Low', Canada: 'Moderate' }
  ),
  'Ben'
);

assert.equal(chooseProcessingAgent([], agents, {}, 'Alice'), 'Ben');
assert.equal(chooseProcessingAgent([], agents, {}, 'Ben'), 'Alice');
assert.equal(
  chooseProcessingAgent(
    [
      { fileType: 'Visa', status: 'PROCESSING', destination: 'Canada', assignedTo: 'Alice' },
      { fileType: 'Visa', status: 'PROCESSING', destination: 'UK', assignedTo: 'Ben' }
    ],
    agents,
    {},
    '',
    'China',
    { China: ['Ben'] }
  ),
  'Ben'
);
assert.equal(
  chooseProcessingAgent([], agents, {}, '', 'China', { China: ['Unavailable Agent'] }),
  null
);
const firstDestinationAgent = chooseProcessingAgent(
  [{ fileType: 'Visa', status: 'PROCESSING', destination: 'Canada', assignedTo: 'Alice' }],
  agents,
  {},
  '',
  'China',
  { China: ['Alice', 'Ben'], Singapore: ['Alice'] }
);
assert.equal(firstDestinationAgent, 'Ben');
assert.equal(
  isProcessingAgentEligibleForDestinations(firstDestinationAgent, ['China', 'Singapore'], {
    China: ['Alice', 'Ben'],
    Singapore: ['Alice']
  }),
  false
);
assert.equal(
  isProcessingAgentEligibleForDestinations('Alice', ['China', 'Singapore'], {
    China: ['Alice', 'Ben'],
    Singapore: ['Alice']
  }),
  true
);
assert.equal(
  chooseProcessingAgent([], agents, {}, '', 'China', { China: [] }),
  'Alice'
);
assert.equal(
  chooseProcessingAgent(
    [],
    agents,
    {},
    '',
    ['China', 'Singapore'],
    { China: ['Ben'], Singapore: ['Alice'] }
  ),
  null
);
assert.deepEqual(
  calculateProcessingAgentWorkloads(
    [
      { fileType: 'Visa', status: 'RECEIVED_SALES', destination: 'China', assignedTo: 'Sales Rep', familyGroupId: 'family-1', familyGroupAssignedTo: 'Alice' },
      { fileType: 'Visa', status: 'RECEIVED_SALES', destination: 'Singapore', assignedTo: 'Sales Rep' }
    ],
    agents,
    { China: 'High', Singapore: 'Moderate' }
  ),
  [
    { name: 'Alice', points: 3, activeFiles: 1 },
    { name: 'Ben', points: 0, activeFiles: 0 }
  ]
);

assert.deepEqual(
  calculateProcessingAgentWorkloads(
    [
      { fileType: 'Visa', status: 'PROCESSING', destination: 'Canada', assignedTo: 'Alice' },
      { fileType: 'Visa', status: 'DONE', destination: 'Canada', assignedTo: 'Alice' },
      { fileType: 'Visa', status: 'RECEIVED_SALES', destination: 'Canada', assignedTo: 'Ben' },
      { fileType: 'Air Ticket', status: 'PROCESSING', destination: 'Canada', assignedTo: 'Ben' },
      { fileType: 'Visa', status: 'PROCESSING', destination: 'UK', assignedTo: 'Ben' }
    ],
    agents,
    { Canada: 'High', UK: 'Low' }
  ),
  [
    { name: 'Alice', points: 3, activeFiles: 1 },
    { name: 'Ben', points: 1, activeFiles: 1 }
  ]
);

console.log('All assignment routing checks passed.');
