//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { type Client } from '@dxos/client';
import { Context } from '@dxos/context';

import { Publication, type SpaceSchema } from '#types';

import { PublicationNotFoundError } from '../errors.ts';

const PRIVATE_ARCHIVE_FIELDS = ['originalSpaceId', 'exportedBy'] as const;

export const scrubArchive = (contents: Uint8Array): { text: string; objects: string[] } => {
  const serialized = JSON.parse(new TextDecoder().decode(contents)) as Record<string, unknown> & {
    objects?: { 'id'?: string; '@meta'?: { annotations?: Record<string, unknown> } }[];
  };
  for (const field of PRIVATE_ARCHIVE_FIELDS) {
    delete serialized[field];
  }
  // The publisher's receipt is not the copy's: a fork that kept it would show as published.
  for (const object of serialized.objects ?? []) {
    delete object['@meta']?.annotations?.[Publication.ReceiptAnnotation.key];
  }
  const objects = (serialized.objects ?? []).flatMap((object) => (typeof object.id === 'string' ? [object.id] : []));
  return { text: JSON.stringify(serialized), objects };
};

export const resolvePublicationsUrl = (options: SpaceSchema.PublicationOptions): string =>
  options.publicationsUrl ?? new URL(Publication.PUBLICATIONS_PATH, options.viewerOrigin).toString();

export const upload = Effect.fnUntraced(function* (
  client: Client,
  body: { spaceId: string; manifest: Publication.Manifest; archive: string },
  publicId?: string,
) {
  const path = publicId
    ? `${Publication.EDGE_PUBLICATIONS_PATH}/${encodeURIComponent(publicId)}`
    : Publication.EDGE_PUBLICATIONS_PATH;
  const data = yield* Effect.tryPromise(() =>
    client.edge.http.request(Context.default(), path, { method: publicId ? 'PUT' : 'POST', body }),
  );
  return yield* Schema.decodeUnknownEffect(Publication.Receipt)(data);
});

export const remove = Effect.fnUntraced(function* (client: Client, publicId: string) {
  yield* Effect.tryPromise(() =>
    client.edge.http.request(
      Context.default(),
      `${Publication.EDGE_PUBLICATIONS_PATH}/${encodeURIComponent(publicId)}`,
      {
        method: 'DELETE',
      },
    ),
  );
});

export const fetchArchive = Effect.fnUntraced(function* (publicationsUrl: string, publicId: string) {
  const response = yield* Effect.tryPromise(() => fetch(Publication.archiveUrl(publicationsUrl, publicId)));
  if (!response.ok) {
    return yield* Effect.fail(new PublicationNotFoundError({ context: { publicId, status: response.status } }));
  }
  const contents = new Uint8Array(yield* Effect.tryPromise(() => response.arrayBuffer()));
  return { filename: `${publicId}.dx.json`, contents };
});
