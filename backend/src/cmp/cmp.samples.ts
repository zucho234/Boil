import { CPMInputDto } from './cmp.types';

export const sampleCPMInput: CPMInputDto = {
  nodes: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }],
  activities: [
    { id: 'A', name: 'A', from: '1', to: '2', duration: 3 },
    { id: 'B', name: 'B', from: '1', to: '3', duration: 2 },
    { id: 'C', name: 'C', from: '2', to: '4', duration: 4 },
    { id: 'D', name: 'D', from: '3', to: '4', duration: 1 },
  ],
};
