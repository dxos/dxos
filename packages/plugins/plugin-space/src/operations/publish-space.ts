//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Operation from '@dxos/compute/Operation';
import { Annotation, Filter, Obj } from '@dxos/echo';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { SpacesService } from '@dxos/protocols/rpc';

import { Publication, SpaceOperation } from '#types';

import { PublishingDisabledError } from '../errors.ts';
import { buildPreview } from '../publication/preview.ts';
import { scrubArchive, upload } from '../publication/publication-client.ts';
import { SpaceOperationConfig } from './helpers.ts';

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
      const previous = Publication.getReceipt(space.properties);
      const resources = (yield* Capability.getAll(AppCapabilities.Translations)).flat();
      const baked = new Set(objects);
      const contents = yield* Effect.promise(() => space.db.query(Filter.everything()).run());
      const preview = buildPreview({
        properties: space.properties,
        objects: contents.filter((object) => baked.has(object.id)),
        resources,
      });
      const manifest: Publication.Manifest = {
        version: 1,
        name: space.properties.name?.slice(0, Publication.MAX_NAME_LENGTH),
        publishedAt: new Date().toISOString(),
        plugins: Object.keys((space.properties as { plugins?: Record<string, string> }).plugins ?? {}),
        objects,
        preview,
      };

      const receipt = yield* upload(client, { spaceId: space.id, manifest, archive: text }, previous?.publicId);
      Obj.update(space.properties, (properties) => {
        Annotation.set(properties, Publication.ReceiptAnnotation, { ...receipt });
      });

      const url = Publication.viewerUrl(publication.viewerOrigin, receipt.publicId).toString();
      yield* Effect.tryPromise(() => navigator.clipboard.writeText(url)).pipe(Effect.ignore);
      return { publicId: receipt.publicId, url };
    }),
  ),
);

export default handler;
