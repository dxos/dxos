import parse from 'yargs-parser';
import { build, analyzeMetafile } from 'esbuild';
import { inspect } from 'node:util';

const {
  _: specifiers,
  cwd = process.cwd()
} = parse(process.argv.slice(2));

(async () => {
  const result = await build({
    entryPoints: ['analyzer:main'],
    metafile: true,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    plugins: [
      {
        name: 'analyzer',
        setup(build) {
          build.onResolve({ filter: /^analyzer:/ }, (args) => {
            return { path: args.path, namespace: 'analyzer' };
          })
          build.onLoad({ filter: /.*/, namespace: 'analyzer' }, (args) => {
            if (args.path === 'analyzer:main') {
              return {
                contents: `
                  ${specifiers.map((specifier) => `import '${specifier}';`).join('\n')}
                `,
                resolveDir: cwd,
                loader: 'js'
              }
            } else if(args.path === 'analyzer:node') {
              return {
                contents: `
                  console.log('node', ${JSON.stringify(args.pluginData.name)})
                `,
                loader: 'js'
              }
            }
          })

          build.onResolve({ filter: /stream/ }, (args) => {
            return { path: 'analyzer:node', namespace: 'analyzer', pluginData: { name: args.path } };
          })
        },
      }
    ]
  });

  console.log(await analyzeMetafile(result.metafile))

  // console.log(inspect(result.metafile, false, null, true));
})()


export type AnalysysResult = {
  totalSize: number;
  imports: {
    name: string;
  }[]
  inputs: {
    name: string;
    size: number;
  }
}