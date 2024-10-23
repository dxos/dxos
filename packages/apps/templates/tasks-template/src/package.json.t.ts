import template from './template.t';
import packageJson from '@dxos/bare-template/dist/src/package.json.t';

const script = template.define.script({
  async content(context) {
    const inherited = await packageJson({
      ...context,
      slots: {
        packageJson: {
          dependencies: {
            'react-router-dom': '^6.4.0',
          },
        },
      },
    });
    return inherited?.files?.[0].content;
  },
});

export default script;
