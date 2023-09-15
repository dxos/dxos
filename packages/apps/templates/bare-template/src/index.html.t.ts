import { plate } from '@dxos/plate';
import template from './template.t';

export default template.define
  .slots({
    head: '',
    body: '',
  })
  .text({
    content: ({ input, slots }) => {
      const { name, react } = input;
      return plate`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1">
          <title>${name}</title>
          <link rel="icon" href="/favicon.ico">
          ${slots.head}
        </head>
        <body>
          ${react && '<div id="root"></div>'}
          ${slots.body}
          <script type="module" src="/src/main.ts${react ? 'x' : ''}"></script>
        </body>
      </html>
      `;
    },
  });
