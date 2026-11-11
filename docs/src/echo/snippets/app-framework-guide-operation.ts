//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { DXN } from '@dxos/echo';

// #region define
export const Slugify = Operation.make({
  meta: {
    // eslint-disable-next-line @dxos/rules/operation-key-shape -- a sample key.
    key: DXN.make('com.example.operation.text.slugify'),
    name: 'Slugify',
    description: 'Turn a title into a URL slug.',
  },
  input: Schema.Struct({ title: Schema.String }),
  output: Schema.Struct({ slug: Schema.String }),
}).pipe(Operation.mutation('none'));
// #endregion

// #region handler
export const SlugifyHandler = Slugify.pipe(
  Operation.withHandler(({ title }) =>
    Effect.succeed({
      slug: title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-'),
    }),
  ),
);
// #endregion

// #region set
export const TextHandlers = OperationHandlerSet.make(SlugifyHandler);

// Lazy: the handler's module loads the first time the operation runs.
export const LazyTextHandlers = OperationHandlerSet.lazy([
  Slugify.pipe(
    Operation.lazyHandler(async () => ({ default: SlugifyHandler })),
  ),
]);
// #endregion

// #region invoke
export const slugOf = (title: string) =>
  Operation.invoke(Slugify, { title }).pipe(
    Effect.map(({ slug }) => slug),
    Effect.catchTag('NoHandlerError', () => Effect.succeed(title)),
  );
// #endregion

// #region layout
export const openObject = (path: string) =>
  Operation.invoke(LayoutOperation.Open, { subject: [path] });
// #endregion
