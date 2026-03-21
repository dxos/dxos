//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import type { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { Calendar, Mailbox } from '../types';

import { OnCreateSpace } from './definitions';

export default OnCreateSpace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ space, isDefault }) {
      if (!isDefault) {
        return;
      }

      const mailbox = Mailbox.make({ name: 'Mail' });
      space.db.add(mailbox);

      const calendar = Calendar.make({ name: 'Calendar' });
      space.db.add(calendar);
    }),
  ),
);
