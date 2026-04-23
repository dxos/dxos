//
// Copyright 2026 DXOS.org
//

/**
 * Payload shape sent from the extension to Composer over the
 * `window` `CustomEvent('composer:clip')` bridge.
 *
 * Source of truth for the envelope shape. The Composer-side receiver
 * (`@dxos/plugin-crx-bridge`) keeps a schema-validated mirror and will
 * reject anything that doesn't decode.
 */
export type Clip = {
  version: 1;
  kind: ClipKind;
  source: ClipSource;
  selection: ClipSelection;
  hints?: ClipHints;
};

export type ClipKind = 'person' | 'organization';

export type ClipSource = {
  url: string;
  title: string;
  favicon?: string;
  clippedAt: string;
};

export type ClipSelection = {
  text: string;
  html?: string;
  htmlTruncated?: boolean;
  rect?: { x: number; y: number; width: number; height: number };
};

export type ClipHints = {
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  jsonLd?: unknown[];
  h1?: string;
  firstImage?: string;
};

export type ClipAck = { ok: true; id: string } | { ok: false; error: string };

export const CLIP_EVENT = 'composer:clip';
export const CLIP_ACK_EVENT = 'composer:clip:ack';
