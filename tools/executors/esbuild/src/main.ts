//
// Copyright 2022 DXOS.org
//

import type { ExecutorContext } from '@nrwl/devkit';
import { build, Platform } from 'esbuild';
import { nodeExternalsPlugin } from 'esbuild-node-externals';
import { readFile } from 'node:fs/promises';
import { join } from 'path';
import * as ts from 'typescript';

import { transformSourceFile } from '@dxos/log-hook';

export interface EsbuildExecutorOptions {
  bundle: boolean;
  bundlePackages: string[];
  entryPoints: string[];
  outputPath: string;
  platforms: Platform[];
}

export default async (options: EsbuildExecutorOptions, context: ExecutorContext): Promise<{ success: boolean }> => {
  console.info('Executing esbuild...');
  if (context.isVerbose) {
    console.info(`Options: ${JSON.stringify(options, null, 2)}`);
  }

  const packagePath = join(context.workspace.projects[context.projectName!].root, 'package.json');

  const results = await Promise.all(
    options.platforms.map((platform) => {
      const outdir = options.entryPoints.length > 1 ? `${options.outputPath}/${platform}` : undefined;
      const outfile = options.entryPoints.length <= 1 ? `${options.outputPath}/${platform}.js` : undefined;


      return build({
        entryPoints: options.entryPoints,
        outdir,
        outfile,
        format: 'cjs',
        write: true,
        bundle: options.bundle,
        platform,
        plugins: [
          nodeExternalsPlugin({
            packagePath,
            allowList: options.bundlePackages
          }),
          {
            name: 'log-transform',
            setup: ({ onLoad, onEnd }) => {
              let files = 0, time = 0;

              onLoad({ filter: /\.ts/ }, async (args) => {
                const source = await readFile(args.path, 'utf8');

                const startTime = Date.now();

                const sourceFile = ts.createSourceFile(
                  args.path,
                  source,
                  ts.ScriptTarget.ESNext,
                  false,
                  ts.ScriptKind.TS
                );
                const transformed = transformSourceFile(sourceFile, (ts as any).nullTransformationContext);

                time += Date.now() - startTime;
                files++;

                return {
                  contents: ts.createPrinter().printFile(transformed),
                  loader: 'ts'
                };
              });

              onEnd(() => {
                if(false) {
                  console.log(`Log preprocessing took ${time}ms for ${files} files (${(time / files).toFixed(0)} ms/file).`);
                }
              })
            }
          }
        ]
      });
    })
  );

  const errors = results.map((result) => result.errors).flat();

  return { success: errors.length === 0 };
};
