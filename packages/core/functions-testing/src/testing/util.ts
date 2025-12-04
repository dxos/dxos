import type { BundleResult } from '@dxos/functions-runtime/native';
import fs from 'node:fs';
import path from 'node:path';

export const writeBundle = (path: string, bundle: BundleResult) => {
  fs.mkdirSync(path, { recursive: true });
  Object.entries(bundle.assets).forEach(([name, content]) => {
    fs.writeFileSync(path + '/' + name, content);
  });
};
