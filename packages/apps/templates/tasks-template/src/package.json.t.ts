import { plate } from '@dxos/plate';
import template from './template.t';
import inherited from '@dxos/bare-template/src/package.json.t';

export default template.define.text({
  content: async (context) => {
    const {
      input: { proto },
    } = context;
    const inherit = await inherited({
      ...context,
      slots: {
        packageJson: proto
          ? {
              scripts: {
                'gen-schema': 'dxtype src/proto/schema.proto src/proto/gen/schema.ts',
                prebuild: 'npm run gen-schema',
              },
            }
          : {},
      },
    });
    return inherit?.files?.[0]?.content;
  },
});
