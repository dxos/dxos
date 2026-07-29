//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { RENAME_POPOVER } from '@dxos/plugin-space/constants';

import { ThreadAnnotation, ThreadOperation } from '../types';

const handler: Operation.WithHandler<typeof ThreadOperation.RenameThread> = ThreadOperation.RenameThread.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ root, caller }) {
      yield* Operation.invoke(LayoutOperation.UpdatePopover, {
        subject: RENAME_POPOVER,
        anchorId: caller ?? '',
        props: {
          initialValue: ThreadAnnotation.getName(root) ?? '',
          onRename: (name: string) => ThreadAnnotation.setName(root, name),
        },
        kind: 'rename',
      });
    }),
  ),
);

export default handler;
