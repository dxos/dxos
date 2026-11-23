//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ExportOperation from '@dxos/app-toolkit/ExportOperation';
import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';
import { printHtml } from '@dxos/util';

import { SpaceOperationError } from './errors.ts';
import { getExporter } from './export-helpers.ts';

const handler: Operation.WithHandler<typeof ExportOperation.Print> = ExportOperation.Print.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject }) {
      const exporter = yield* getExporter(subject);
      if (!exporter?.print) {
        return yield* Effect.fail(new SpaceOperationError({ message: `No printer for ${Obj.getTypename(subject)}.` }));
      }

      const html = yield* exporter.print(subject);
      const title = Obj.getLabel(subject) ?? '';
      yield* Effect.promise(() => printHtml(html, { title }));
    }),
  ),
);

export default handler;
