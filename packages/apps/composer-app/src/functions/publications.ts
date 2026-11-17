//
// Copyright 2026 DXOS.org
//

import { PUBLICATIONS_PATH, edgePublicationUrl } from '../util/publication-paths.ts';
import { type Card } from './preview-image/index.ts';

const VIEWER_PARAM = 'p';

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

export const previewImageUrl = (origin: string, publicId: string, objectId?: string): URL => {
  const url = new URL(`${PUBLICATIONS_PATH}/${publicId}/${PREVIEW_FILE}`, origin);
  if (objectId) {
    url.searchParams.set(OBJECT_PARAM, objectId);
  }
  return url;
};

export const publicIdOf = (url: URL): string | undefined => {
  const kept = url.searchParams.get(VIEWER_PARAM) ?? undefined;
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

export type Manifest = { name?: string; preview?: ManifestPreview };

type ManifestPreview = {
  description?: string;
  icon?: string;
  hue?: string;
  types: { label: string; icon?: string; hue?: string; count: number }[];
  objects: Record<string, { title: string; type?: string; icon?: string; hue?: string; description?: string }>;
};

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

export const cardOf = ({ name, preview }: Manifest, objectId?: string): Card => {
  const object = objectId === undefined ? undefined : preview?.objects[objectId];
  const space = { name, icon: preview?.icon, hue: preview?.hue };
  return object
    ? { kind: 'object', ...object, space }
    : { kind: 'space', ...space, description: preview?.description, types: preview?.types ?? [] };
};

const MAX_TYPES = 24;

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

const MAX_TEXT_LENGTH = 400;

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, MAX_TEXT_LENGTH) : undefined;

const publicationFileUrl = (edgeUrl: string, publicId: string, file: string): URL =>
  edgePublicationUrl(`${PUBLICATIONS_PATH}/${publicId}/${file}`, edgeUrl);

const notFound = () =>
  new Response('Not found', { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain' } });
