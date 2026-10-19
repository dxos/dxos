//
// Copyright 2026 DXOS.org
//

import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import { spawn } from 'node:child_process';
import path from 'node:path';

import { DxSvg } from '@dxos/diagram';

import { source } from './render.ts';

/** The drawing app, whose share API turns a diagram's source into a link that opens it on a canvas. */
export const DEFAULT_APP_URL = 'https://app.drawing.sh';

/** A diagram could not be shared or its link could not be made. */
export class OpenError extends Data.TaggedError('OpenError')<{ readonly message: string }> {}

/** What the share API answers a `POST /api/share` with. */
export type Share = { readonly id: string; readonly url: string };

const isSvg = (file: string, content: string) => file.endsWith('.svg') || content.trimStart().startsWith('<');

/** The drawing's name: the one a `.dx.svg` carries, else the file name without its extensions. */
export const diagramName = (file: string, content: string): string => {
  const payload = isSvg(file, content) ? DxSvg.extract(content) : undefined;
  if (typeof payload === 'object' && payload !== null && 'name' in payload && typeof payload.name === 'string') {
    return payload.name;
  }
  return (file !== '-' && path.basename(file).replace(/(\.dx)?(\.svg)?$/, '')) || 'diagram';
};

/** The `.dx` source of a `.dx` file, or the one a `.dx.svg` embeds; a plain SVG carries none. */
export const diagramSource = (file: string, content: string): Effect.Effect<string, OpenError> => {
  if (!isSvg(file, content)) {
    return Effect.succeed(content);
  }
  const text = source(content);
  return text === undefined
    ? Effect.fail(
        new OpenError({ message: `${file}: carries no diagram source (a plain SVG, or exported with --plain).` }),
      )
    : Effect.succeed(text);
};

/** Stores the source with the drawing app's share API and returns the link that opens it. */
export const share = Effect.fn('share')(function* (text: string, { name, appUrl }: { name: string; appUrl: string }) {
  const endpoint = new URL('/api/share', appUrl);
  endpoint.searchParams.set('name', name);
  const response = yield* Effect.tryPromise({
    try: () =>
      fetch(endpoint, { method: 'POST', body: text, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }),
    catch: (error) => new OpenError({ message: `Could not reach ${endpoint.origin}: ${String(error)}` }),
  });
  const body = yield* Effect.tryPromise({
    try: () => response.text(),
    catch: (error) => new OpenError({ message: `Could not read the reply from ${endpoint.origin}: ${String(error)}` }),
  });
  if (!response.ok) {
    return yield* Effect.fail(
      new OpenError({ message: `${endpoint.origin} refused the diagram (${response.status}): ${body}` }),
    );
  }
  const value: unknown = yield* Effect.try({
    try: () => JSON.parse(body),
    catch: () => new OpenError({ message: `Unexpected reply from ${endpoint.origin}: ${body}` }),
  });
  if (typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'string') {
    // The link is built on the origin posted to, which a local `wrangler dev` reports as its route's host instead.
    return { id: value.id, url: new URL(`/?d=${encodeURIComponent(value.id)}`, appUrl).href } satisfies Share;
  }
  return yield* Effect.fail(new OpenError({ message: `Unexpected reply from ${endpoint.origin}: ${body}` }));
});

/** The platform's command for opening a URL in the default browser, or undefined where there is no display. */
export const openerCommand = (
  url: string,
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
): readonly [string, readonly string[]] | undefined => {
  switch (platform) {
    case 'darwin':
      return ['open', [url]];
    case 'win32':
      // `start` treats its first quoted argument as the window title, so an empty one keeps the URL the target.
      return ['cmd', ['/c', 'start', '""', url.replaceAll('&', '^&')]];
    default:
      return env.DISPLAY || env.WAYLAND_DISPLAY ? ['xdg-open', [url]] : undefined;
  }
};

/** Opens the URL in the default browser; true when the opener started, false when there is none to start. */
export const launch = (url: string): Effect.Effect<boolean> => {
  const command = openerCommand(url);
  if (!command) {
    return Effect.succeed(false);
  }
  const [file, args] = command;
  return Effect.callback<boolean>((resume) => {
    const child = spawn(file, [...args], { detached: true, stdio: 'ignore', windowsVerbatimArguments: true });
    child.once('error', () => resume(Effect.succeed(false)));
    child.once('spawn', () => {
      child.unref();
      resume(Effect.succeed(true));
    });
  });
};
