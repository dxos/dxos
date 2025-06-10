import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { transform } from '@swc/core';

export async function processFiles(dirname, wasmModule) {
  const files = await readdir(`${dirname}/inputs`);

  for (const filename of files) {
    const source = await readFile(`${dirname}/inputs/${filename}`, 'utf8');

    const output = await transform(source, {
      filename: basename(filename),
      sourceMaps: 'inline',
      minify: false,
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        experimental: {
          plugins: [
            [
              wasmModule,
              {
                // filename,
                to_transform: [
                  {
                    name: 'log',
                    package: '@dxos/log',
                    param_index: 2,
                    include_args: false,
                    include_call_site: true,
                    include_scope: true,
                  },
                  {
                    name: 'invariant',
                    package: '@dxos/invariant',
                    param_index: 2,
                    include_args: true,
                    include_call_site: false,
                    include_scope: true,
                  },
                  {
                    name: 'Context',
                    package: '@dxos/context',
                    param_index: 1,
                    include_args: false,
                    include_call_site: false,
                    include_scope: false,
                  },
                ],
              },
            ],
          ],
        },
        target: 'es2022',
      },
    });
    await mkdir(`${dirname}/outputs`, { recursive: true });
    await writeFile(`${dirname}/outputs/${filename}`, output.code);

    console.log(`Processed ${dirname}/outputs/${filename}`);
  }
}

await processFiles(
  import.meta.dirname,
  join(import.meta.dirname, '../target/wasm32-wasip1/release/swc_log_plugin.wasm'),
);
