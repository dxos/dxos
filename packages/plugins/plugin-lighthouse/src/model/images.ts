//
// Copyright 2026 DXOS.org
//

// Images a person attached to a session's input, and what lighthouse read from each (lighthouse src/image): an
// lh:ImageQuery node per image with lh:ImageFeature nodes (marks, printed text, the product) and crops as run blobs.
// Lighthouse never crops a face; a feature that says it is one is left out anyway.

import { type Entity } from '../client/types.ts';

/** An input image as an input event references it: a blob of the run. */
export type InputImageRef = { blob: string; name?: string; type?: string; width?: number; height?: number };

/** What lighthouse read from an image, as the thread shows it. */
export type ImageRead = {
  title: string;
  features: Array<{ kind: string; label: string; crop?: string }>;
  queries: string[];
};

/** The lh:ImageQuery node lighthouse writes for an input image (src/image/ImageQuery.ts). */
export const imageQueryIri = (run: string, blob: string): string =>
  `urn:lh:image-query:${run}/${blob.replace(/^sha256:/, '').slice(0, 12)}`;

/** The images an input event's `images` carries; anything without a blob is dropped. */
export const toImageRefs = (raw: unknown): InputImageRef[] =>
  (Array.isArray(raw) ? raw : []).flatMap((value): InputImageRef[] => {
    if (!value || typeof value !== 'object' || typeof (value as { blob?: unknown }).blob !== 'string') {
      return [];
    }
    const { blob, name, type, width, height } = value as Record<string, unknown>;
    return [
      {
        blob: blob as string,
        ...(typeof name === 'string' ? { name } : {}),
        ...(typeof type === 'string' ? { type } : {}),
        ...(typeof width === 'number' && typeof height === 'number' ? { width, height } : {}),
      },
    ];
  });

const first = (entity: Entity | undefined, key: string): string | undefined => {
  const value = entity?.props[key]?.[0];
  return value === undefined ? undefined : String(value);
};

/** The query node and its feature nodes as the thread shows them: the product itself and any face are left out. */
export const toImageRead = (query: Entity, features: ReadonlyArray<Entity>): ImageRead => ({
  title: [first(query, 'schema:brand'), first(query, 'lh:itemCategory')].filter(Boolean).join(' '),
  features: features
    .filter((feature) => !['product', 'face', 'person'].includes(first(feature, 'lh:featureKind') ?? ''))
    .map((feature) => {
      const text = first(feature, 'schema:text');
      const crop = first(feature, 'lh:imageBlob');
      return {
        kind: first(feature, 'lh:featureKind') ?? 'mark',
        label: text ? `"${text}"` : (first(feature, 'schema:name') ?? ''),
        ...(crop ? { crop } : {}),
      };
    }),
  queries: (query.props['lh:suggestedQuery'] ?? []).slice(0, 3).map(String),
});
