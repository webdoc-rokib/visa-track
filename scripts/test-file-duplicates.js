import assert from 'node:assert/strict';
import { findPossibleFileDuplicates, findPossibleFileDuplicatePairs } from '../src/utils/duplicateDetection.js';

const existingFiles = [
  {
    id: 'visa-1',
    fileType: 'Visa',
    passportNo: 'AB 123-456',
    destination: 'Canada'
  },
  {
    id: 'package-1',
    fileType: 'Package',
    mainPersonPassport: 'XY123456',
    packageCountries: ['Thailand', 'Malaysia']
  },
  {
    id: 'ticket-1',
    fileType: 'Air Ticket',
    applicantName: 'Jane Doe',
    contactNo: '+880 1712-345678',
    airlineRoute: 'Dhaka - Bangkok'
  },
  {
    id: 'pickup-1',
    fileType: 'Pick & Drop',
    applicantName: 'John Smith',
    contactNo: '01712 123456',
    pickupLocation: 'Hotel ABC, Dhaka',
    dropoffLocation: 'Airport'
  }
];

assert.deepEqual(
  findPossibleFileDuplicates({ fileType: 'Visa', passportNo: 'ab123456', destination: 'CANADA' }, existingFiles).map(file => file.id),
  ['visa-1']
);
assert.deepEqual(
  findPossibleFileDuplicates({ fileType: 'Visa', passportNo: 'AB123456', destination: 'UK' }, existingFiles),
  []
);
assert.deepEqual(
  findPossibleFileDuplicates({ fileType: 'Package', mainPersonPassport: 'xy-123456', packageCountries: ['Malaysia', 'Thailand'] }, existingFiles).map(file => file.id),
  ['package-1']
);
assert.deepEqual(
  findPossibleFileDuplicates({ fileType: 'Air Ticket', applicantName: 'Jane Doe', contactNo: '00880 1712 345678', airlineRoute: 'Dhaka-Bangkok' }, existingFiles).map(file => file.id),
  ['ticket-1']
);
assert.deepEqual(
  findPossibleFileDuplicates({ fileType: 'Pick & Drop', applicantName: 'John Smith', contactNo: '+880 1712 123456', pickupLocation: 'Hotel ABC Dhaka', dropoffLocation: 'Airport' }, existingFiles).map(file => file.id),
  ['pickup-1']
);
assert.deepEqual(
  findPossibleFileDuplicates({ fileType: 'Pick & Drop', applicantName: 'John Smith', contactNo: '01712 123456', pickupLocation: 'Hotel ABC Dhaka', dropoffLocation: 'Railway Station' }, existingFiles),
  []
);

const duplicatePairs = findPossibleFileDuplicatePairs([
  ...existingFiles,
  { ...existingFiles[0], id: 'visa-2', passportNo: 'AB123456', destination: 'CANADA' },
  { ...existingFiles[0], id: 'visa-other-destination', passportNo: 'AB123456', destination: 'UK' }
]);
assert.deepEqual(duplicatePairs.map(pair => pair.fileIds), [['visa-1', 'visa-2']]);

console.log('All duplicate detection checks passed.');
