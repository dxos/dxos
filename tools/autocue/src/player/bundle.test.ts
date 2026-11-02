//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as Effect from 'effect/Effect';

import { BundleError, bundleRoot, loadBundle, manifestOf, rebaseManifest } from './bundle.ts';
import { type Manifest } from './types.ts';

const manifest: Manifest = {
  format: 'autocue@1',
  title: 'Chess',
  archive: 'bundle.zip',
  demos: [
    {
      id: 'opening',
      title: 'Play the opening',
      poster: 'opening/poster.jpg',
      videos: [
        { src: 'opening/demo.mp4', type: 'video/mp4' },
        { src: 'https://cdn.example.com/demo.webm', type: 'video/webm' },
      ],
      chapters: [],
      recording: {},
    },
  ],
};

describe('bundleRoot', () => {
  test('a folder, its page, and its manifest share one root', () => {
    const root = 'https://dx.pub/demo/2026-10-29-chess/';
    expect(bundleRoot('https://dx.pub/demo/2026-10-29-chess').href).toBe(root);
    expect(bundleRoot(root).href).toBe(root);
    expect(bundleRoot(`${root}index.html#opening`).href).toBe(root);
    expect(bundleRoot(`${root}autocue.json?v=2`).href).toBe(root);
  });
});

describe('manifestOf', () => {
  test('a folder or page reads autocue.json; a JSON URL is read as given', () => {
    expect(manifestOf('https://dx.pub/demo/chess/')).toBe('https://dx.pub/demo/chess/autocue.json');
    expect(manifestOf('https://dx.pub/demo/chess/index.html')).toBe('https://dx.pub/demo/chess/autocue.json');
    expect(manifestOf('http://localhost/assets/autocue.CFtW7ibn.json')).toBe(
      'http://localhost/assets/autocue.CFtW7ibn.json',
    );
  });
});

describe('rebaseManifest', () => {
  test('bundle paths become absolute and absolute URLs are kept', () => {
    const rebased = rebaseManifest(manifest, 'https://dx.pub/demo/chess/');
    expect(rebased.hosted).toBe('https://dx.pub/demo/chess/');
    expect(rebased.archive).toBe('https://dx.pub/demo/chess/bundle.zip');
    expect(rebased.demos[0].poster).toBe('https://dx.pub/demo/chess/opening/poster.jpg');
    expect(rebased.demos[0].videos.map((video) => video.src)).toEqual([
      'https://dx.pub/demo/chess/opening/demo.mp4',
      'https://cdn.example.com/demo.webm',
    ]);
  });

  test('a hosted address the manifest names wins', () => {
    const rebased = rebaseManifest({ ...manifest, hosted: 'https://dx.pub/demo/chess/' }, 'http://localhost/chess/');
    expect(rebased.hosted).toBe('https://dx.pub/demo/chess/');
  });

  test('only http and https URLs are kept', () => {
    expect(() => rebaseManifest({ ...manifest, archive: 'javascript:alert(1)' }, 'https://dx.pub/demo/chess/')).toThrow(
      'unsupported URL scheme',
    );
    expect(() => rebaseManifest({ ...manifest, hosted: 'data:text/html,x' }, 'https://dx.pub/demo/chess/')).toThrow(
      'unsupported URL scheme',
    );
  });
});

describe('loadBundle', () => {
  const load = (url: string, body: unknown) => {
    const fetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify(body));
    return Effect.runPromise(Effect.flip(loadBundle(url))).finally(() => {
      globalThis.fetch = fetch;
    });
  };

  test('a malformed URL fails with a BundleError', async () => {
    expect(await load('not a url', manifest)).toBeInstanceOf(BundleError);
  });

  test('a demo without videos fails with a BundleError', async () => {
    const error = await load('https://dx.pub/demo/chess/', { ...manifest, demos: [{ id: 'x', title: 'X' }] });
    expect(error.reason).toBe('not an autocue@1 manifest');
  });

  test('an unsafe link fails with a BundleError', async () => {
    const error = await load('https://dx.pub/demo/chess/', { ...manifest, archive: 'javascript:alert(1)' });
    expect(error.reason).toBe('unsupported URL scheme: javascript:');
  });
});
