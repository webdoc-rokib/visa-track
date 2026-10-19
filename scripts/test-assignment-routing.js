import assert from 'node:assert/strict';
import { calculateProcessingAgentWorkloads, chooseProcessingAgent } from '../src/utils/assignmentRouting.js';

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
assert.equal(
  chooseProcessingAgent([], agents, {}, '', 'China', { China: [] }),
  'Alice'
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
