//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { isBinaryPatch, isGeneratedFile, isGeneratedPath } from './generated.ts';

describe('isGeneratedPath', () => {
  test.each([
    'pnpm-lock.yaml',
    'apps/site/package-lock.json',
    'yarn.lock',
    'Cargo.lock',
    'go.sum',
    'packages/core/dist/index.js',
    'packages/core/build/bundle.css',
    'coverage/lcov-report/index.html',
    'vendor/lib/thing.ts',
    'src/__snapshots__/render.test.ts',
    'public/app.min.js',
    'public/app.min.css',
    'dist-info/bundle.js.map',
    'src/render.test.ts.snap',
    'src/types/index.d.ts',
    'src/proto/service_pb.ts',
    'src/proto/service.pb.go',
    'src/proto/service_pb2.py',
    'src/schema.gen.ts',
    'src/theme.generated.css',
    'assets/logo.png',
    'assets/font.woff2',
    'fixtures/archive.tar.gz',
    'bin/tool.wasm',
    '.changeset/wild-pans-argue.md',
    'packages/thing/.changeset/quiet-moons.md',
  ])('%s is generated', (path) => {
    expect(isGeneratedPath(path)).to.be.true;
  });

  test.each([
    'src/index.ts',
    'packages/core/src/query/compile.ts',
    'docs/DESIGN.md',
    'src/components/Button.tsx',
    // Near misses: a file is not generated because its name contains a generated word.
    'src/distribution.ts',
    'src/generated-ids.ts',
    'src/build-plan.ts',
    'scripts/lockfile-audit.ts',
  ])('%s is not generated', (path) => {
    expect(isGeneratedPath(path)).to.be.false;
  });
});

describe('isBinaryPatch', () => {
  test('reads git’s own markers', () => {
    expect(isBinaryPatch(['Binary files a/x.dat and b/x.dat differ'])).to.be.true;
    expect(isBinaryPatch(['GIT binary patch', 'literal 1234'])).to.be.true;
    expect(isBinaryPatch(['index 111..222 100644', '--- a/src/a.ts', '+++ b/src/a.ts'])).to.be.false;
  });
});

describe('isGeneratedFile', () => {
  test('catches a binary the extension does not announce', () => {
    // A file with no extension at all, which only the patch shape gives away.
    expect(isGeneratedFile({ path: 'fixtures/corpus', preamble: ['Binary files a/x and b/x differ'] })).to.be.true;
    expect(isGeneratedFile({ path: 'src/index.ts', preamble: ['index 111..222 100644'] })).to.be.false;
  });
});
