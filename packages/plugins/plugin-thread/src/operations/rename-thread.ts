//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { RENAME_POPOVER } from '@dxos/plugin-space/constants';

import { ThreadAnnotation, ThreadOperation } from '../types';

const handler: Operation.WithHandler<typeof ThreadOperation.RenameThread> = ThreadOperation.RenameThread.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ message, caller }) {
      const name = ThreadAnnotation.get(message)?.name;

      // The popover commits through a plain callback, so the write goes back through the operation
      // layer via the imperative invoker rather than being performed here.
      const { invokePromise } = yield* Capability.get(Capabilities.OperationInvoker);
      yield* Operation.invoke(LayoutOperation.UpdatePopover, {
        subject: RENAME_POPOVER,
        anchorId: caller ?? '',
        props: {
          initialValue: name ?? '',
          onRename: (next: string) => {
            void invokePromise(ThreadOperation.SetThreadName, { message, name: next });
          },
        },
        kind: 'rename',
      });
    }),
  ),
);

export default handler;
