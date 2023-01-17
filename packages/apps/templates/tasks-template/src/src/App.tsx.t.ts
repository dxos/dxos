import { defineTemplate, text } from '@dxos/plate';
import config from '../config.t';
import { appTsx } from '@dxos/bare-template';

export default defineTemplate(
  (context) => {
    return appTsx({
      ...context,
      slots: {
        content: '{/* tasks template */}',
        extraImports: ''
      }
    });
  },
  { config }
);
