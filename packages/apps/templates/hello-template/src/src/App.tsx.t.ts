import { InputOf, plate, Slots } from '@dxos/plate';
import appTsx from '@dxos/bare-template/dist/src/src/App.tsx.t';
import template from '../template.t';

export default template.define.script({
  content: async (context) => {
    const { slots, ...rest } = context;
    const inherited = await appTsx({
      ...rest,
      slots: {
        content: ({ imports }) => plate`<${imports.use('Welcome', './Welcome')} name="${context.input.name}" />`,
        extraImports: 'import "./index.css";'
      }
    });
    return inherited.files?.[0]?.content;
  },
});
