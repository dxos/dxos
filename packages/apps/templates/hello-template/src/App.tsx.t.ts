import { defineTemplate, text } from '@dxos/plate';
import AppTsx from '../../bare-template/src/App.tsx.t';
import config from '../config.t';

export default defineTemplate(
  async (context) => {
    const { slots, ...rest } = context;
    return AppTsx({
      ...rest,
      slots: {
        content: ({ imports }) => `<${imports.use('Welcome', './Welcome')} />`,
        extraImports: 'import "./index.scss";'
      }
    });
  },
  { config }
);
