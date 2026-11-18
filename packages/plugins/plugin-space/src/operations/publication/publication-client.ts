//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import { type Client } from '@dxos/client';
import { Context } from '@dxos/context';
import { Format, Obj, Type } from '@dxos/echo';

import { PublicationLink, PublicationManifest, type SpaceSchema } from '#types';

import { PublicationNotFoundError } from '../../errors.ts';

const PRIVATE_ARCHIVE_FIELDS = ['originalSpaceId', 'exportedBy'] as const;

/** Whether a schema holds a password-format field anywhere: its objects are credentials, never published. */
export const isSecret = (schema: Schema.Top): boolean => hasPasswordField(schema.ast, new Set());

const hasPasswordField = (ast: SchemaAST.AST, seen: Set<SchemaAST.AST>): boolean => {
  // A recursive schema leads back to a node already walked.
  if (seen.has(ast)) {
    return false;
  }
  seen.add(ast);
  if (Option.contains(Format.FormatAnnotation.getFromAst(ast), Format.TypeFormat.Password)) {
    return true;
  }
  switch (ast._tag) {
    case 'Objects':
      return [...ast.propertySignatures, ...ast.indexSignatures].some(({ type }) => hasPasswordField(type, seen));
    case 'Arrays':
      return [...ast.elements, ...ast.rest].some((node) => hasPasswordField(node, seen));
    case 'Union':
      return ast.types.some((node) => hasPasswordField(node, seen));
    case 'Suspend':
      return hasPasswordField(ast.thunk(), seen);
    default:
      return false;
  }
};

/**
 * The ids a publication may carry: what the space's query shows as live, which ECHO has already cut to exclude
 * deleted objects and their dependents, and only objects whose type resolves to a schema with no password field.
 */
export const publishableIds = (objects: readonly Obj.Unknown[]): Set<string> => {
  const secretByType = new Map<Type.AnyObj, boolean>();
  const isPublishable = (object: Obj.Unknown) => {
    const type = Obj.getType(object);
    if (!type) {
      return false;
    }
    const secret = secretByType.get(type) ?? isSecret(Type.getSchema(type));
    secretByType.set(type, secret);
    return !secret;
  };
  return new Set(objects.filter(isPublishable).map((object) => object.id));
};

type ArchiveObject = { 'id'?: string; '@meta'?: { annotations?: Record<string, unknown> } };
type ArchiveFeed = { feedObjectId?: string; namespace?: string };

/**
 * Keeps only the `published` objects and their data feeds; anything else in the export, traces included, stays private.
 * The publication annotation stays behind too: it names the publisher's space.
 */
export const scrubArchive = (
  contents: Uint8Array,
  published: ReadonlySet<string>,
): { text: string; objects: string[] } => {
  const serialized = JSON.parse(new TextDecoder().decode(contents)) as Record<string, unknown> & {
    objects?: ArchiveObject[];
    feeds?: ArchiveFeed[];
  };
  for (const field of PRIVATE_ARCHIVE_FIELDS) {
    delete serialized[field];
  }
  serialized.objects = (serialized.objects ?? []).filter(
    (object) => object.id !== undefined && published.has(object.id),
  );
  for (const object of serialized.objects) {
    delete object['@meta']?.annotations?.[AppAnnotation.PublicationAnnotation.key];
  }
  const objects = serialized.objects.flatMap((object) => (object.id !== undefined ? [object.id] : []));
  if (serialized.feeds) {
    serialized.feeds = serialized.feeds.filter(
      (feed) => feed.namespace === 'data' && feed.feedObjectId !== undefined && published.has(feed.feedObjectId),
    );
  }
  return { text: JSON.stringify(serialized), objects };
};

export const resolvePublicationsUrl = (options: SpaceSchema.PublicationOptions): string =>
  options.publicationsUrl ?? new URL(PublicationManifest.PUBLICATIONS_PATH, options.viewerOrigin).toString();

/** What EDGE answers a publish with. */
const Receipt = Schema.Struct({ publicId: Schema.String, publishedAt: Schema.String });

export const upload = Effect.fnUntraced(function* (
  client: Client,
  body: { spaceId: string; manifest: PublicationManifest.Manifest; archive: string },
  publicId?: string,
) {
  const path = publicId
    ? `${PublicationManifest.EDGE_PUBLICATIONS_PATH}/${encodeURIComponent(publicId)}`
    : PublicationManifest.EDGE_PUBLICATIONS_PATH;
  const data = yield* Effect.tryPromise(() =>
    client.edge.http.request(Context.default(), path, { method: publicId ? 'PUT' : 'POST', body }),
  );
  return yield* Schema.decodeUnknownEffect(Receipt)(data);
});

export const remove = Effect.fnUntraced(function* (client: Client, publicId: string) {
  yield* Effect.tryPromise(() =>
    client.edge.http.request(
      Context.default(),
      `${PublicationManifest.EDGE_PUBLICATIONS_PATH}/${encodeURIComponent(publicId)}`,
      {
        method: 'DELETE',
      },
    ),
  );
});

export const fetchArchive = Effect.fnUntraced(function* (publicationsUrl: string, publicId: string) {
  const response = yield* Effect.tryPromise(() => fetch(PublicationLink.archiveUrl(publicationsUrl, publicId)));
  if (!response.ok) {
    return yield* Effect.fail(new PublicationNotFoundError({ context: { publicId, status: response.status } }));
  }
  const contents = new Uint8Array(yield* Effect.tryPromise(() => response.arrayBuffer()));
  return { filename: `${publicId}.dx.json`, contents };
});
