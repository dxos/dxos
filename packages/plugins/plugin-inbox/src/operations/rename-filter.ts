// Copyright 2026 DXOS.org

import * as Effect from 'effect/Effect';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';
import * as SpaceSurface from '@dxos/plugin-space/SpaceSurface';

import { InboxOperation } from '#types';

export default InboxOperation.RenameFilter.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const { owner, name, caller } = input;
      yield* Operation.invoke(LayoutOperation.UpdatePopover, {
        subject: SpaceSurface.RENAME_POPOVER,
        anchorId: caller ?? '',
        props: {
          initialValue: name,
          onRename: (newName: string) => {
            Obj.update(owner, (owner) => {
              const filter = owner.filters?.find((entry: { name: string }) => entry.name === name);
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
