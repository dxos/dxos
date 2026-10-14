//
// Copyright 2026 DXOS.org
//

import { type HostedModule } from '../module-host-service.ts';
import { realm } from './realm.ts';

export const module: HostedModule = {
  name: 'math',
  methods: {
    add: (left: number, right: number) => left + right,
    fibonacci: (count: number) => {
      const sequence = [0, 1];
      while (sequence.length < count) {
        sequence.push(sequence[sequence.length - 1] + sequence[sequence.length - 2]);
      }
      return sequence.slice(0, count);
    },
    realm,
  },
};
