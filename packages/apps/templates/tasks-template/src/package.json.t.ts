import path from 'node:path';
import { promises as fs } from 'node:fs';
import { plate } from '@dxos/plate';
import template from './template.t';
import inherited from '@dxos/bare-template/src/package.json.t';
import { getDxosRepoInfo } from '@dxos/bare-template';

const loadJson = async (moduleRelativePath: string) => {
  const content = await fs.readFile(path.resolve(__dirname, moduleRelativePath));
  return JSON.parse(content.toString());
};

export default template.define.text({
  content: async (context) => {
    const {
      input: { proto, monorepo },
    } = context;
    const ownPackageJson = await loadJson('../package.json'); // relative to dist/src
    const { version } = monorepo ? await getDxosRepoInfo() : ownPackageJson;
    const inherit = await inherited({
      ...context,
      slots: {
        packageJson: proto
          ? {
              scripts: {
                'gen-schema': 'dxtype src/proto/schema.proto src/proto/gen/schema.ts',
                prebuild: 'npm run gen-schema',
                serve: 'npm run prebuild && vite',
                preview: 'npm run prebuild && vite preview',
              },
              dependencies: {
                '@dxos/echo-schema': version
              },
              devDependencies: {
                '@dxos/echo-typegen': version,
              }
            }
          : {},
      },
    });
    return inherit?.files?.[0]?.content;
  },
});
