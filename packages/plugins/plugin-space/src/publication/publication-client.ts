//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { type Client } from '@dxos/client';
import { Context } from '@dxos/context';

import { Publication, type SpaceSchema } from '#types';

import { PublicationNotFoundError } from '../errors.ts';

/** Fields the JSON export records about where it came from, which a public copy must not reveal. */
const PRIVATE_ARCHIVE_FIELDS = ['originalSpaceId', 'exportedBy'] as const;

/** The JSON archive with its provenance removed, as UTF-8 text. */
export const scrubArchive = (contents: Uint8Array): { text: string; objects: string[] } => {
  const serialized = JSON.parse(new TextDecoder().decode(contents)) as Record<string, unknown> & {
    objects?: { id?: string }[];
  };
  for (const field of PRIVATE_ARCHIVE_FIELDS) {
    delete serialized[field];
  }
  const objects = (serialized.objects ?? []).flatMap((object) => (typeof object.id === 'string' ? [object.id] : []));
  return { text: JSON.stringify(serialized), objects };
};

/** Where publications are read from: the host's override, else `/publications` on the viewer origin. */
export const resolvePublicationsUrl = (options: SpaceSchema.PublicationOptions): string =>
  options.publicationsUrl ?? new URL(Publication.PUBLICATIONS_PATH, options.viewerOrigin).toString();

/** Uploads a bake; a `publicId` replaces that publication in place. */
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
    client.edge.http.request(Context.default(), `${Publication.EDGE_PUBLICATIONS_PATH}/${encodeURIComponent(publicId)}`, {
      method: 'DELETE',
    }),
  );
});

/** Reads a publication's archive over the public route; no identity is needed. */
export const fetchArchive = Effect.fnUntraced(function* (publicationsUrl: string, publicId: string) {
  const response = yield* Effect.tryPromise(() => fetch(Publication.archiveUrl(publicationsUrl, publicId)));
  if (!response.ok) {
    return yield* Effect.fail(new PublicationNotFoundError({ context: { publicId, status: response.status } }));
  }
  const contents = new Uint8Array(yield* Effect.tryPromise(() => response.arrayBuffer()));
  return { filename: `${publicId}.dx.json`, contents };
});
