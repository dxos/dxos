//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { withBuild } from './build-version.ts';

const encode = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));
const manifestOf = (files: ReturnType<typeof withBuild>['files']) =>
  JSON.parse(new TextDecoder().decode(files.find((file) => file.path === 'manifest.json')?.content));

describe('withBuild', () => {
  const files = [
    { path: 'manifest.json', content: encode({ key: 'org.example.plugin', version: '0.16.0', name: 'Example' }) },
    { path: 'plugin.mjs', content: encode('export {}') },
  ];

  test('stamps the build onto the version and the manifest, leaving every other file as it was', ({ expect }) => {
    const stamped = withBuild(files, '0.16.0', 'main.fe3aaf6b');
    expect(stamped.version).toBe('0.16.0+main.fe3aaf6b');
    expect(manifestOf(stamped.files)).toEqual({
      key: 'org.example.plugin',
      version: '0.16.0+main.fe3aaf6b',
      name: 'Example',
    });
    expect(stamped.files[1]).toBe(files[1]);
  });

  test('replaces a build the version already carries', ({ expect }) => {
    expect(withBuild(files, '0.16.0+main.aaaa', 'main.bbbb').version).toBe('0.16.0+main.bbbb');
  });

  test('rejects an id that is not semver build metadata', ({ expect }) => {
    expect(() => withBuild(files, '0.16.0', 'main/fe3aaf6b')).toThrow(/Invalid build id/);
  });
});
