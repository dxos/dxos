//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as UrlPath from '@dxos/app-toolkit/UrlPath';
import * as Operation from '@dxos/compute/Operation';
import { Filter } from '@dxos/echo';

import { SpaceOperation } from '#types';

import { PublishingDisabledError } from '../../errors.ts';
import { SpaceOperationConfig } from '../helpers.ts';
import { fetchArchive, resolvePublicationsUrl } from './publication-client.ts';

const handler: Operation.WithHandler<typeof SpaceOperation.ForkPublication> = SpaceOperation.ForkPublication.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ publicId, path }) {
      const { publication } = yield* Capability.get(SpaceOperationConfig);
      if (!publication) {
        return yield* Effect.fail(new PublishingDisabledError());
      }
      const archive = yield* fetchArchive(resolvePublicationsUrl(publication), publicId);
      const { space } = yield* Operation.invoke(SpaceOperation.ImportSpace, { archive });
      yield* Operation.invoke(SpaceOperation.Migrate, { space });

      yield* Operation.invoke(LayoutOperation.SwitchWorkspace, { subject: GraphPath.getSpacePath(space.id) });
      const objectId = path
        ? UrlPath.readReferences(`/${UrlPath.WORKSPACE_KEY}/${space.id}/${path}`).at(-1)?.entityId
        : undefined;
      const object = objectId ? yield* Effect.promise(() => space.db.query(Filter.id(objectId)).first()) : undefined;
      if (object) {
        yield* Operation.invoke(LayoutOperation.Open, { subject: [GraphPath.getObjectPathFromObject(object)] });
      }
      return { space };
    }),
  ),
);

export default handler;
