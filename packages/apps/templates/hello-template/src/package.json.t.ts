import { defineTemplate, text } from '@dxos/plate';
import { packageJson } from '@dxos/bare-template';
import config from './config.t';

export default defineTemplate(
  async (context) => {
    const { slots, ...rest } = context;
    return packageJson({
      ...rest,
      slots: {
        extra: JSON.stringify({
          "scripts": {
            "playwright": "playwright test -c ./src/playwright/playwright.config.ts"
          },
          "devDependencies": {
            "@playwright/test": "^1.32.1",
            "playwright": "^1.32.1",
            "wait-for-expect": "^3.0.2"
          }
        })
      }
    });
  },
  { config }
);
