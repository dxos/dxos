import { defineTemplate, text } from '@dxos/plate';
import config from '../config.t';
import { appTsx } from '@dxos/bare-template';

export default defineTemplate(
  (context) => {
    return appTsx({
      ...context,
      slots: {
        extraImports: text`
          import { Routes } from './Routes';
          import { Main } from './components/Main';
          `,
        content: text`
          <Main >
            <HashRouter>
              <Routes />
            </HashRouter>
          </Main>
          `
      }
    });
  },
  { config }
);
