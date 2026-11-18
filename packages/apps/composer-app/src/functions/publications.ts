//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import * as PublicationManifest from '@dxos/plugin-space/PublicationManifest';

import { PUBLICATIONS_PATH, edgePublicationUrl } from '../util/publication-paths.ts';
import { type Card } from './preview-image/index.ts';

const PUBLIC_FILES = new Set(['archive.json', 'manifest.json']);

const PREVIEW_FILE = 'preview.png';

const OBJECT_PARAM = 'object';

const isPublicId = (value: string | undefined): value is string => !!value && /^[\w-]+$/.test(value);

const MAX_AGE_SECONDS = 60;

const PREVIEW_MAX_AGE_SECONDS = 300;

const MANIFEST_TIMEOUT_MS = 2_000;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
};

export type RenderPreview = (card: Card) => Promise<Uint8Array<ArrayBuffer>>;

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
  if ((method !== 'GET' && method !== 'HEAD') || !isPublicId(publicId) || rest.length > 0) {
    return notFound();
  }
  if (!edgeUrl) {
    return unavailable();
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
    // Only EDGE's 404 means the publication is gone; the viewer says so on a 404 alone.
    return upstream.status === 404 ? notFound() : unavailable();
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

export const previewImageUrl = (origin: string, publicId: string, objectId?: string): URL => {
  const url = new URL(`${PUBLICATIONS_PATH}/${publicId}/${PREVIEW_FILE}`, origin);
  if (objectId) {
    url.searchParams.set(OBJECT_PARAM, objectId);
  }
  return url;
};

export const publicIdOf = (url: URL): string | undefined => {
  const kept = url.searchParams.get(PublicationManifest.VIEWER_PARAM) ?? undefined;
  const [first] = url.pathname.split('/').filter(Boolean);
  const publicId = kept ?? first;
  return isPublicId(publicId) && publicId !== 'w' ? publicId : undefined;
};

const ENTITY_ID = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i;

const TAIL_SEPARATOR = '+';

export const objectIdOf = (url: URL): string | undefined =>
  url.pathname
    .split('/')
    .map((segment) => segment.split(TAIL_SEPARATOR).at(-1) ?? '')
    .find((id) => ENTITY_ID.test(id));

export type Manifest = PublicationManifest.Manifest;

const decodeManifest = Schema.decodeUnknownOption(PublicationManifest.Manifest);

export const readManifest = async (edgeUrl: string, publicId: string): Promise<Manifest | undefined> => {
  try {
    const response = await fetch(publicationFileUrl(edgeUrl, publicId, 'manifest.json'), {
      signal: AbortSignal.timeout(MANIFEST_TIMEOUT_MS),
      cf: { cacheEverything: true, cacheTtl: MAX_AGE_SECONDS },
    });
    return response.ok ? Option.getOrUndefined(decodeManifest(await response.json())) : undefined;
  } catch {
    return undefined;
  }
};

export const cardOf = ({ name, preview }: Manifest, objectId?: string): Card => {
  const object =
    objectId !== undefined && preview && Object.hasOwn(preview.objects, objectId)
      ? preview.objects[objectId]
      : undefined;
  const space = { name, icon: preview?.icon, hue: preview?.hue };
  return object
    ? { kind: 'object', ...object, space }
    : { kind: 'space', ...space, description: preview?.description, types: preview?.types ?? [] };
};

const publicationFileUrl = (edgeUrl: string, publicId: string, file: string): URL =>
  edgePublicationUrl(`${PUBLICATIONS_PATH}/${publicId}/${file}`, edgeUrl);

const unavailable = () =>
  new Response('Unavailable', {
    status: 502,
    headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' },
  });

const notFound = () =>
  new Response('Not found', { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain' } });
