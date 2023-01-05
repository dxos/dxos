import { defineTemplate, text } from '@dxos/plate';
import { appTsx } from '@dxos/bare-template';
import config from '../config.t';

export default defineTemplate(
  async (context) => {
    const { slots, ...rest } = context;
    return appTsx({
      ...rest,
      slots: {
        content: ({ imports }) => `<${imports.use('Welcome', './Welcome')} name="${context.input.name}" />`,
        extraImports: 'import "./index.scss";'
      }
    });
  },
  { config }
);
