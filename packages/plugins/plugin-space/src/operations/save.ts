//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ExportOperation from '@dxos/app-toolkit/ExportOperation';
import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';
import { downloadBlob } from '@dxos/util';

import { SpaceOperationError } from './errors.ts';
import { getExporter } from './export-helpers.ts';

const handler: Operation.WithHandler<typeof ExportOperation.Save> = ExportOperation.Save.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject }) {
      const exporter = yield* getExporter(subject);
      if (!exporter?.save) {
        return yield* Effect.fail(new SpaceOperationError({ message: `No saver for ${Obj.getTypename(subject)}.` }));
      }

      const { content, mimeType, extension } = yield* exporter.save(subject);
      const blob = typeof content === 'string' ? new Blob([content], { type: mimeType }) : content;
      // Characters reserved by common file systems are replaced so the save dialog accepts the default name.
      const name = (Obj.getLabel(subject) ?? 'untitled').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'untitled';
      yield* Effect.tryPromise(() => downloadBlob(blob, `${name}.${extension}`));
    }),
  ),
);

export default handler;
