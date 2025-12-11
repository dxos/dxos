#!/usr/bin/env bun

//
// Copyright 2025 DXOS.org
//

import solidPlugin from '@opentui/solid/bun-plugin';
import { existsSync } from 'fs';
import { mkdir, writeFile, rm, copyFile } from 'fs/promises';
import { join } from 'path';

// Platform configurations.
const platforms = [
  { target: 'bun-darwin-arm64', platform: 'darwin', arch: 'arm64', ext: '' },
  { target: 'bun-darwin-x64', platform: 'darwin', arch: 'x64', ext: '' },
  { target: 'bun-linux-arm64', platform: 'linux', arch: 'arm64', ext: '' },
  { target: 'bun-linux-x64', platform: 'linux', arch: 'x64', ext: '' },
  { target: 'bun-windows-x64', platform: 'win32', arch: 'x64', ext: '.exe' },
] as const;

// Read version from source package.json.
const sourcePackage = await Bun.file('package.json').json();
const version = sourcePackage.version;

console.log(`[Build] Building cli-next v${version} for all platforms...`);

// Clean dist directory.
if (existsSync('dist')) {
  await rm('dist', { recursive: true });
}

// Create dist directory.
await mkdir('dist', { recursive: true });

// Build all platform binaries in parallel.
const buildPromises = platforms.map(async ({ target, platform, arch, ext }) => {
  const platformKey = `${platform}-${arch}`;
  const packageName = `@dxos/cli-next-${platformKey}`;
  const outDir = `dist/cli-next-${platformKey}`;
  const binaryName = `dx${ext}`;
  const outfile = join(outDir, binaryName);

  console.log(`[Build] Compiling ${packageName}...`);

  // Create output directory.
  await mkdir(outDir, { recursive: true });

  // Compile binary.
  const result = await Bun.build({
    entrypoints: ['./src/bin.ts'],
    target: 'bun',
    plugins: [solidPlugin],
    compile: {
      target,
      outfile,
    },
  });

  if (!result.success) {
    console.error(`[Build] Failed to compile ${packageName}:`, result.logs);
    throw new Error(`Build failed for ${packageName}`);
  }

  // Copy LICENSE file.
  await copyFile('LICENSE', join(outDir, 'LICENSE'));

  // Generate platform-specific package.json.
  const platformPackage = {
    name: packageName,
    version,
    description: `${sourcePackage.description} - ${platform} ${arch}`,
    license: sourcePackage.license,
    author: sourcePackage.author,
    homepage: sourcePackage.homepage,
    bugs: sourcePackage.bugs,
    repository: sourcePackage.repository,
    os: [platform],
    cpu: [arch],
    main: `./${binaryName}`,
    files: [binaryName, 'LICENSE'],
    publishConfig: {
      access: 'public',
    },
  };

  await writeFile(
    join(outDir, 'package.json'),
    JSON.stringify(platformPackage, null, 2),
  );

  console.log(`[Build] ✓ ${packageName}`);
});

await Promise.all(buildPromises);

// Generate main package.
console.log('[Build] Generating main package...');
const mainDir = 'dist/cli-next';
await mkdir(mainDir, { recursive: true });
await mkdir(join(mainDir, 'bin'), { recursive: true });

// Generate wrapper script.
const wrapperScript = `#!/usr/bin/env node

const { execFileSync } = require('child_process');
const { join } = require('path');

const PLATFORMS = {
  'darwin-arm64': '@dxos/cli-next-darwin-arm64',
  'darwin-x64': '@dxos/cli-next-darwin-x64',
  'linux-arm64': '@dxos/cli-next-linux-arm64',
  'linux-x64': '@dxos/cli-next-linux-x64',
  'win32-x64': '@dxos/cli-next-win32-x64',
};

const key = \`\${process.platform}-\${process.arch}\`;
const pkg = PLATFORMS[key];

if (!pkg) {
  console.error(\`Unsupported platform: \${key}\`);
  console.error('Supported platforms:', Object.keys(PLATFORMS).join(', '));
  process.exit(1);
}

try {
  const binary = process.platform === 'win32' ? 'dx.exe' : 'dx';
  const binPath = join(require.resolve(pkg), '..', binary);
  execFileSync(binPath, process.argv.slice(2), { stdio: 'inherit' });
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND') {
    console.error(\`Platform-specific package not found: \${pkg}\`);
    console.error('Please reinstall @dxos/cli-next to get the correct platform binary.');
    process.exit(1);
  }
  throw error;
}
`;

await writeFile(join(mainDir, 'bin', 'dx.js'), wrapperScript, { mode: 0o755 });

// Copy LICENSE file.
await copyFile('LICENSE', join(mainDir, 'LICENSE'));

// Generate main package.json.
const optionalDependencies: Record<string, string> = {};
platforms.forEach(({ platform, arch }) => {
  const platformKey = `${platform}-${arch}`;
  const packageName = `@dxos/cli-next-${platformKey}`;
  optionalDependencies[packageName] = version;
});

const mainPackage = {
  name: sourcePackage.name,
  version,
  description: sourcePackage.description,
  homepage: sourcePackage.homepage,
  bugs: sourcePackage.bugs,
  license: sourcePackage.license,
  author: sourcePackage.author,
  type: 'commonjs',
  bin: {
    dx: './bin/dx.js',
  },
  files: ['bin', 'LICENSE'],
  optionalDependencies,
  publishConfig: {
    access: 'public',
  },
};

await writeFile(
  join(mainDir, 'package.json'),
  JSON.stringify(mainPackage, null, 2),
);

console.log('[Build] ✓ Main package generated');
console.log('[Build] Build completed successfully!');
console.log(`[Build] Generated packages in dist/:`);
console.log(`  - cli-next (main package)`);
platforms.forEach(({ platform, arch }) => {
  console.log(`  - cli-next-${platform}-${arch}`);
});
