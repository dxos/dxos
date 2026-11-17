//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Operation from '@dxos/compute/Operation';
import { Annotation, Filter, Obj } from '@dxos/echo';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { SpacesService } from '@dxos/protocols/rpc';

import { PublicationLink, PublicationManifest, SpaceOperation } from '#types';

import { PublishingDisabledError } from '../../errors.ts';
import { SpaceOperationConfig } from '../helpers.ts';
import { buildPreview } from './preview.ts';
import { scrubArchive, upload } from './publication-client.ts';

const handler: Operation.WithHandler<typeof SpaceOperation.PublishSpace> = SpaceOperation.PublishSpace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ space }) {
      const { publication } = yield* Capability.get(SpaceOperationConfig);
      if (!publication) {
        return yield* Effect.fail(new PublishingDisabledError());
      }
      const client = yield* Capability.get(ClientCapabilities.Client);

      yield* Effect.promise(() => space.waitUntilReady());
      const archive = yield* Effect.promise(() =>
        space.internal.export({ format: SpacesService.SpaceArchiveFormat.enums.JSON }),
      );
      const { text, objects } = scrubArchive(archive.contents);
      const previous = AppAnnotation.getPublication(space.properties);
      const resources = (yield* Capability.getAll(AppCapabilities.Translations)).flat();
      const baked = new Set(objects);
      const contents = yield* Effect.promise(() => space.db.query(Filter.everything()).run());
      const preview = buildPreview({
        properties: space.properties,
        objects: contents.filter((object) => baked.has(object.id)),
        resources,
      });
      const manifest: PublicationManifest.Manifest = {
        version: 1,
        name: space.properties.name?.slice(0, PublicationManifest.MAX_NAME_LENGTH),
        publishedAt: new Date().toISOString(),
        plugins: Object.keys((space.properties as { plugins?: Record<string, string> }).plugins ?? {}),
        objects,
        preview,
      };

      const published = yield* upload(client, { spaceId: space.id, manifest, archive: text }, previous?.publicId);
      Obj.update(space.properties, (properties) => {
        Annotation.set(properties, AppAnnotation.PublicationAnnotation, { ...published });
      });

      const url = PublicationLink.viewerUrl(publication.viewerOrigin, published.publicId).toString();
      yield* Effect.tryPromise(() => navigator.clipboard.writeText(url)).pipe(Effect.ignore);
      return { publicId: published.publicId, url };
    }),
  ),
);

export default handler;
