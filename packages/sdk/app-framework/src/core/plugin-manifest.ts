//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/**
 * Schema for a third-party plugin manifest.
 *
 * The manifest is published as a sibling of the plugin's entry module and
 * advertises every file the plugin needs at runtime so that the host can
 * eagerly cache them for offline use.
 */
export const Manifest = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  version: Schema.String,
  entry: Schema.String,
  assets: Schema.Array(Schema.String),
});

export type Manifest = Schema.Schema.Type<typeof Manifest>;

/**
 * Resolved manifest with all asset paths converted to absolute URLs.
 */
export type ResolvedManifest = {
  id: string;
  name: string;
  version: string;
  entryUrl: string;
  assetUrls: readonly string[];
};

/**
 * Parses and validates a manifest payload, then resolves all asset paths against the manifest URL.
 */
export const parse = (manifestUrl: string, payload: unknown): ResolvedManifest => {
  const manifest = Schema.decodeUnknownSync(Manifest)(payload);
  const entryUrl = new URL(manifest.entry, manifestUrl).toString();
  const assetUrls = manifest.assets.map((asset) => new URL(asset, manifestUrl).toString());
  if (!assetUrls.includes(entryUrl)) {
    throw new Error(`Manifest at ${manifestUrl} does not list the entry (${manifest.entry}) in assets.`);
  }
  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    entryUrl,
    assetUrls,
  };
};

/**
 * Fetches and parses a manifest from the given URL.
 */
export const fetchManifest = async (manifestUrl: string): Promise<ResolvedManifest> => {
  const response = await fetch(manifestUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch plugin manifest at ${manifestUrl}: ${response.status} ${response.statusText}`);
  }
  const payload: unknown = await response.json();
  return parse(manifestUrl, payload);
};
