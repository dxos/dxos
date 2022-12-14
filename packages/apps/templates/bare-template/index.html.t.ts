import { defineTemplate, Imports, renderSlots, text } from '@dxos/plate';
import config from './config.t';

export default defineTemplate(
  ({ input, slots, ...rest }) => {
    const { name, react } = input;
    const imports = new Imports();
    const render = renderSlots(slots)({ input, imports, ...rest });
    return text`
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>${name}</title>
      <link rel="icon" href="/favicon.ico">
      ${render.head()}
    </head>
    <body>
      ${react && '<div id="root"></div>'}
      <script type="module" src="/src/main.ts${react ? 'x' : ''}"></script>
    </body>
  </html>
  `;
  },
  {
    config,
    slots: {
      head: ''
    }
  }
);
