import { defineTemplate, text } from '@dxos/plate';
import config from '../config.t';
import { appTsx } from '@dxos/bare-template';

export default defineTemplate(
  (context) => {
    return appTsx({
      ...context,
      slots: {
        content: ({ imports }) => text`
          <${imports.use('Main', './components/Main')} >
            <${imports.use('HashRouter', 'react-router-dom')}>
              <${imports.use('Routes', './Routes')} />
            </HashRouter>
          </Main>
          `
      }
    });
  },
  { config }
);
