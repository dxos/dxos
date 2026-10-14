// Copyright 2026 DXOS.org

import * as Effect from 'effect/Effect';

import * as CollectionOperation from '@dxos/app-toolkit/CollectionOperation';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';

import { ADD_TO_COLLECTION_DIALOG } from '../constants.ts';

const handler: Operation.WithHandler<typeof CollectionOperation.OpenAddToCollection> =
  CollectionOperation.OpenAddToCollection.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ object }) {
        yield* Operation.invoke(LayoutOperation.UpdateDialog, {
          subject: ADD_TO_COLLECTION_DIALOG,
          blockAlign: 'start',
          props: { object },
        });
      }),
    ),
  );
export default handler;
