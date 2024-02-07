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
          <meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
          <style>
            html, body {
              background: transparent !important;
            }
          </style>
          <script>
            function setTheme(darkMode) {
              document.documentElement.classList[darkMode ? 'add' : 'remove']('dark')
            }
            setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches)
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
              setTheme(e.matches)
            });
          </script>
          ${slots.head}
        </head>
        <body>
          ${react && '<div id="root"></div>'}
          ${slots.body}
          <script type="module" src="/src/shell.ts"></script>
        </body>
      </html>
      `;
    },
  });
