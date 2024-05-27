import template from './template.t';
import packageJson from '@dxos/bare-template/dist/src/package.json.t';

// TODO(wittjosiah): Build failing.
//   Error TS2742: The inferred type of 'default' cannot be named without a reference to 'packages/apps/templates/bare-template/node_modules/@dxos/plate/dist/types/src'. This is likely not portable. A type annotation is necessary.
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
