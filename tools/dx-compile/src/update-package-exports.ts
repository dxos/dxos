import { readFile } from 'node:fs/promises';
import type { EsbuildExecutorOptions } from './main';
import { join } from 'node:path';

export const updatePackageExports = async (options: EsbuildExecutorOptions) => {
  const packageJson = JSON.parse(await readFile('package.json', 'utf-8'));

  const updateSpecifier = (specifier: any) => {
    if (typeof specifier !== 'object' || typeof specifier.source !== 'string') {
      console.warn('Non confirming package exports/imports');
      return;
    }

    for (const key of Object.keys(specifier)) {
      if (key !== 'source') {
        delete specifier[key];
      }
    }
    specifier.types = join('./dist/types', specifier.source.replace(/\.ts$/, '.d.ts').replace(/\.tsx$/, '.d.ts'));

    for (const platform of options.platforms) {
      const distSlug = specifier.source.replace(/^src\//, '').replace(/\.tsx?$/, '') + '.mjs';

      switch (platform) {
        case 'node':
          specifier.node = join('./dist/lib/node-esm', distSlug);
          break;
        case 'browser':
          specifier.browser = join('./dist/lib/browser', distSlug);
          break;
        case 'neutral':
          specifier.default = join('./dist/lib/neutral', distSlug);
          break;
      }
    }
  };

  for (const [key, value] of Object.entries(packageJson.imports ?? {})) {
    updateSpecifier(value);
  }
  for (const [key, value] of Object.entries(packageJson.exports ?? {})) {
    updateSpecifier(value);
  }

  await writeFile('package.json', JSON.stringify(packageJson, null, 2));
};
