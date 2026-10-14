//
// Copyright 2026 DXOS.org
//

import { type HostedModule } from '../module-host-service.ts';
import { realm } from './realm.ts';

export const module: HostedModule = {
  name: 'text',
  methods: {
    upper: (value: string) => value.toUpperCase(),
    wordCount: (value: string) => value.split(/\s+/).filter(Boolean).length,
    realm,
  },
};
