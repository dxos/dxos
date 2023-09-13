//
// Copyright 2023 DXOS.org
//

import { Bag, Buildings, Calendar, Check, Envelope, FileText, UserCircle } from '@phosphor-icons/react';

import { frameDefs } from './frames';
import { SearchMeta } from '../registry';

// TODO(burdon): Inject into provider.
// TODO(burdon): Reconcile with type and frame system.
export const searchMeta: { [type: string]: SearchMeta } = {
  'dxos.experimental.kai.Organization': {
    rank: 3,
    Icon: Buildings,
  },
  'dxos.experimental.kai.Project': {
    rank: 1,
    Icon: Bag,
  },
  'dxos.experimental.kai.Task': {
    rank: 1,
    Icon: Check,
  },
  'dxos.experimental.kai.Contact': {
    rank: 3,
    Icon: UserCircle,
    frame: frameDefs.find(({ module: { id } }) => id === 'dxos.module.frame.contact'),
  },
  'dxos.experimental.kai.Event': {
    rank: 1,
    Icon: Calendar,
    frame: frameDefs.find(({ module: { id } }) => id === 'dxos.module.frame.calendar'),
  },
  'dxos.experimental.kai.Document': {
    rank: 2,
    Icon: FileText,
    frame: frameDefs.find(({ module: { id } }) => id === 'dxos.module.frame.document'),
  },
  'dxos.experimental.kai.DocumentStack': {
    rank: 2,
    Icon: FileText,
    frame: frameDefs.find(({ module: { id } }) => id === 'dxos.module.frame.stack'),
  },
  'dxos.experimental.kai.Message': {
    rank: 1,
    Icon: Envelope,
    frame: frameDefs.find(({ module: { id } }) => id === 'dxos.module.frame.inbox'),
  },
};
