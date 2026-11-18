//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import * as Operation from '@dxos/compute/Operation';
import { Annotation, Obj } from '@dxos/echo';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { SpaceOperation } from '#types';

import { NotPublishedError } from '../../errors.ts';
import { remove } from './publication-client.ts';

const handler: Operation.WithHandler<typeof SpaceOperation.UnpublishSpace> = SpaceOperation.UnpublishSpace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ space }) {
      const published = AppAnnotation.getPublication(space.properties, space.id);
      if (!published) {
        return yield* Effect.fail(new NotPublishedError());
      }
      const client = yield* Capability.get(ClientCapabilities.Client);
      yield* remove(client, published.publicId);
      Obj.update(space.properties, (properties) => {
        Annotation.set(properties, AppAnnotation.PublicationAnnotation, null);
      });
    }),
  ),
);

export default handler;
