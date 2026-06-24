// Copyright 2026 DXOS.org

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { RENAME_POPOVER } from '@dxos/plugin-space';

import { InboxOperation } from '../types';

export default InboxOperation.RenameFilter.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const { mailbox, name, caller } = input;
      yield* Operation.invoke(LayoutOperation.UpdatePopover, {
        subject: RENAME_POPOVER,
        anchorId: caller ?? '',
        props: {
          initialValue: name,
          onRename: (newName: string) => {
            Obj.update(mailbox, (draft) => {
              const filter = draft.filters?.find((entry: { name: string }) => entry.name === name);
              if (filter) {
                filter.name = newName;
              }
            });
          },
        },
        kind: 'rename',
      });
    }),
  ),
);
