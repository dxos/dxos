//
// Copyright 2026 DXOS.org
//

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, test } from 'vitest';

import { applyChannelFavicons, bootMarkPath, channelVariant } from './channel-branding';

const FAVICONS = [
  'favicon.svg',
  'favicon-96x96.png',
  'apple-touch-icon.png',
  'favicon.ico',
  'web-app-manifest-192x192.png',
  'web-app-manifest-512x512.png',
];

const scratches: string[] = [];

afterEach(() => {
  scratches.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }));
});

describe('channelVariant', () => {
  test('production ships the released mark', ({ expect }) => {
    expect(channelVariant('build', 'production')).toBeUndefined();
  });

  test('an unset environment is a local build, not a channel', ({ expect }) => {
    expect(channelVariant('build', '')).toBeUndefined();
    expect(channelVariant('build', undefined)).toBeUndefined();
  });

  test('preview is the one that runs beside production, so it gets its own mark', ({ expect }) => {
    expect(channelVariant('build', 'preview')).toEqual('purple');
  });

  test('every other channel shares the rust mark', ({ expect }) => {
    expect(channelVariant('build', 'dev')).toEqual('rust');
    expect(channelVariant('build', 'staging')).toEqual('rust');
  });

  // Only a deployed bundle is branded, so `DX_ENVIRONMENT` in a shell does not repaint localhost.
  test('a dev server keeps the released mark whatever the environment says', ({ expect }) => {
    expect(channelVariant('serve', 'preview')).toBeUndefined();
    expect(channelVariant('serve', 'dev')).toBeUndefined();
  });
});

describe('bootMarkPath', () => {
  test('falls back to the released mark when there is no channel', ({ expect }) => {
    expect(bootMarkPath('/app', undefined)).toBeUndefined();
  });

  test('names the variant the channel brands itself with', ({ expect }) => {
    expect(bootMarkPath('/app', 'purple')).toEqual(path.join('/app', 'assets', 'boot-mark-purple.svg'));
  });
});

// The artwork is generated and committed, so a channel added without re-running `pnpm icons:variants`
// would otherwise only surface as a failed deploy.
describe('generated artwork', () => {
  const appDir = path.resolve(import.meta.dirname, '..', '..');

  for (const variant of ['purple', 'rust'] as const) {
    test(`${variant} is committed in full`, ({ expect }) => {
      const missing = [
        path.join(appDir, 'assets', `boot-mark-${variant}.svg`),
        ...FAVICONS.map((favicon) => path.join(appDir, 'assets', `favicons-${variant}`, favicon)),
      ].filter((file) => !existsSync(file));
      expect(missing).toEqual([]);
    });
  }
});

describe('applyChannelFavicons', () => {
  test('replaces every favicon the html references', ({ expect }) => {
    const { appDir, outDir } = makeApp('rust');

    applyChannelFavicons(appDir, outDir, 'rust');

    for (const favicon of FAVICONS) {
      expect(readFileSync(path.join(outDir, favicon), 'utf8')).toEqual(`rust:${favicon}`);
    }
  });

  test('leaves the released favicons alone when there is no channel', ({ expect }) => {
    const { appDir, outDir } = makeApp('rust');

    applyChannelFavicons(appDir, outDir, undefined);

    for (const favicon of FAVICONS) {
      expect(readFileSync(path.join(outDir, favicon), 'utf8')).toEqual(`production:${favicon}`);
    }
  });

  // Shipping production's blue mark on a prerelease is the confusion this exists to prevent, so a variant
  // that was never generated has to fail the build rather than silently fall through to it.
  test('fails the build when the variant artwork is missing', ({ expect }) => {
    const { appDir, outDir } = makeApp('rust');
    rmSync(path.join(appDir, 'assets', 'favicons-rust', 'favicon.ico'));

    expect(() => applyChannelFavicons(appDir, outDir, 'rust')).toThrow('channel favicon missing');
  });
});

/** An app directory with generated variant artwork and an out directory holding the released favicons. */
const makeApp = (variant: string) => {
  const appDir = mkdtempSync(path.join(tmpdir(), 'channel-branding-'));
  scratches.push(appDir);
  const variantDir = path.join(appDir, 'assets', `favicons-${variant}`);
  const outDir = path.join(appDir, 'out', 'composer');
  mkdirSync(variantDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });
  for (const favicon of FAVICONS) {
    writeFileSync(path.join(variantDir, favicon), `${variant}:${favicon}`);
    writeFileSync(path.join(outDir, favicon), `production:${favicon}`);
  }
  return { appDir, outDir };
};
