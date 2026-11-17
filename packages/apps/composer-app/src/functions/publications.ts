//
// Copyright 2026 DXOS.org
//

// A Worker leaf: it must not import `@dxos/plugin-space`, whose module graph would pull ECHO into the bundle.

import { type Card } from './preview-image/index.ts';

/** Mirrors `Publication.PUBLICATIONS_PATH`: the viewer host serves the public files of a publication under it. */
export const PUBLICATIONS_PATH = '/publications';

/** Mirrors `Publication.EDGE_PUBLICATIONS_PATH`: where EDGE serves those files. */
const EDGE_PUBLICATIONS_PATH = '/db/publications';

/** Mirrors `Publication.VIEWER_PARAM`: where the viewer keeps the public id once the URL names the local space. */
const VIEWER_PARAM = 'p';

const PUBLIC_FILES = new Set(['archive.json', 'manifest.json']);

/** The link-preview image, drawn here from the manifest rather than stored. */
const PREVIEW_FILE = 'preview.png';

/** Query param naming the object a preview image draws; without it the image draws the space. */
const OBJECT_PARAM = 'object';

/** EDGE issues base64url ids; anything else is not one, and must not reach EDGE as a path. */
const isPublicId = (value: string | undefined): value is string => !!value && /^[\w-]+$/.test(value);

/** How long the edge cache and browsers keep a publication; a republish shows within this. */
const MAX_AGE_SECONDS = 60;

/** Crawlers fetch an image once per share; drawing it again a few minutes later is cheap enough. */
const PREVIEW_MAX_AGE_SECONDS = 300;

/** A link preview waits this long for the manifest before serving the viewer without one. */
const MANIFEST_TIMEOUT_MS = 2_000;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
};

/** Draws a link-preview card as a PNG. */
export type RenderPreview = (card: Card) => Promise<Uint8Array<ArrayBuffer>>;

/**
 * Serves a publication's public files on the viewer host from EDGE, which stores them, and its preview
 * image, drawn from the manifest. Any origin may read them, so Composer can fetch a publication to fork it.
 */
export const handlePublicationRead = async (
  request: Request,
  edgeUrl: string | undefined,
  renderPreview?: RenderPreview,
): Promise<Response> => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  const url = new URL(request.url);
  const [publicId, file, ...rest] = url.pathname.slice(PUBLICATIONS_PATH.length + 1).split('/');
  const method = request.method;
  if (!edgeUrl || (method !== 'GET' && method !== 'HEAD') || !isPublicId(publicId) || rest.length > 0) {
    return notFound();
  }
  if (file === PREVIEW_FILE && renderPreview) {
    return handlePreviewImage(
      request,
      edgeUrl,
      publicId,
      url.searchParams.get(OBJECT_PARAM) ?? undefined,
      renderPreview,
    );
  }
  if (!PUBLIC_FILES.has(file)) {
    return notFound();
  }

  const upstream = await fetch(publicationFileUrl(edgeUrl, publicId, file), {
    method,
    cf: { cacheEverything: true, cacheTtl: MAX_AGE_SECONDS },
  });
  if (!upstream.ok) {
    return notFound();
  }
  return new Response(upstream.body, {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${MAX_AGE_SECONDS}`,
    },
  });
};

const handlePreviewImage = async (
  request: Request,
  edgeUrl: string,
  publicId: string,
  objectId: string | undefined,
  renderPreview: RenderPreview,
): Promise<Response> => {
  const manifest = await readManifest(edgeUrl, publicId);
  if (!manifest) {
    return notFound();
  }
  const png = await renderPreview(cardOf(manifest, objectId));
  return new Response(request.method === 'HEAD' ? null : png, {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'image/png',
      'Cache-Control': `public, max-age=${PREVIEW_MAX_AGE_SECONDS}`,
    },
  });
};

/** Where a publication's preview image is served, drawing `objectId` when given and the space otherwise. */
export const previewImageUrl = (origin: string, publicId: string, objectId?: string): URL => {
  const url = new URL(`${PUBLICATIONS_PATH}/${publicId}/${PREVIEW_FILE}`, origin);
  if (objectId) {
    url.searchParams.set(OBJECT_PARAM, objectId);
  }
  return url;
};

/** The public id a viewer URL names: `/<publicId>/…` as shared, or `?p=` once the viewer has opened it. */
export const publicIdOf = (url: URL): string | undefined => {
  const kept = url.searchParams.get(VIEWER_PARAM) ?? undefined;
  const [first] = url.pathname.split('/').filter(Boolean);
  const publicId = kept ?? first;
  return isPublicId(publicId) && publicId !== 'w' ? publicId : undefined;
};

/**
 * Mirrors `EntityId`'s shape. The URL grammar reserves it, so a segment of this shape is always an id,
 * never a key (`UrlPath.isReservedKey`).
 */
const ENTITY_ID = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i;

/** Mirrors `UrlPath.TAIL_SEPARATOR`, which joins the parts of one id segment (`<typeSlug>+<objectId>`). */
const TAIL_SEPARATOR = '+';

/**
 * The object a viewer URL opens: the first path segment that ends in an entity id, whichever key it
 * follows. `undefined` for a space link.
 */
export const objectIdOf = (url: URL): string | undefined =>
  url.pathname
    .split('/')
    .map((segment) => segment.split(TAIL_SEPARATOR).at(-1) ?? '')
    .find((id) => ENTITY_ID.test(id));

/** What the Worker reads of a manifest; plugin-space's `Publication.Manifest` is the full shape. */
export type Manifest = { name?: string; preview?: ManifestPreview };

type ManifestPreview = {
  description?: string;
  icon?: string;
  hue?: string;
  types: { label: string; icon?: string; hue?: string; count: number }[];
  objects: Record<string, { title: string; type?: string; icon?: string; hue?: string; description?: string }>;
};

/** A publication's manifest, for previews, or `undefined` when EDGE does not answer in time. */
export const readManifest = async (edgeUrl: string, publicId: string): Promise<Manifest | undefined> => {
  try {
    const response = await fetch(publicationFileUrl(edgeUrl, publicId, 'manifest.json'), {
      signal: AbortSignal.timeout(MANIFEST_TIMEOUT_MS),
      cf: { cacheEverything: true, cacheTtl: MAX_AGE_SECONDS },
    });
    return response.ok ? parseManifest(await response.json()) : undefined;
  } catch {
    return undefined;
  }
};

/** The card a link previews as: the object when the manifest titles it, else the space. */
export const cardOf = ({ name, preview }: Manifest, objectId?: string): Card => {
  const object = objectId === undefined ? undefined : preview?.objects[objectId];
  const space = { name, icon: preview?.icon, hue: preview?.hue };
  return object
    ? { kind: 'object', ...object, space }
    : { kind: 'space', ...space, description: preview?.description, types: preview?.types ?? [] };
};

/** Past this many, a type is too small a share of the bar to see. */
const MAX_TYPES = 24;

/** Any member can write a manifest, so each field is checked before a preview draws it. */
const parseManifest = (value: unknown): Manifest => {
  const manifest = record(value);
  const preview = manifest.preview === undefined ? undefined : record(manifest.preview);
  return {
    name: text(manifest.name),
    preview: preview && {
      description: text(preview.description),
      icon: text(preview.icon),
      hue: text(preview.hue),
      types: (Array.isArray(preview.types) ? preview.types.slice(0, MAX_TYPES) : []).flatMap((value) => {
        const type = record(value);
        const label = text(type.label);
        const count = typeof type.count === 'number' && Number.isFinite(type.count) ? type.count : undefined;
        return label && count && count > 0 ? [{ label, icon: text(type.icon), hue: text(type.hue), count }] : [];
      }),
      objects: Object.fromEntries(
        Object.entries(record(preview.objects)).flatMap(([id, value]) => {
          const object = record(value);
          const title = text(object.title);
          return title
            ? [
                [
                  id,
                  {
                    title,
                    type: text(object.type),
                    icon: text(object.icon),
                    hue: text(object.hue),
                    description: text(object.description),
                  },
                ],
              ]
            : [];
        }),
      ),
    },
  };
};

const record = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? Object.fromEntries(Object.entries(value)) : {};

/** Longer than any field a card shows; it bounds the layout work a crafted manifest can ask for. */
const MAX_TEXT_LENGTH = 400;

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, MAX_TEXT_LENGTH) : undefined;

const publicationFileUrl = (edgeUrl: string, publicId: string, file: string): URL =>
  new URL(`${EDGE_PUBLICATIONS_PATH}/${publicId}/${file}`, edgeUrl);

const notFound = () =>
  new Response('Not found', { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain' } });
