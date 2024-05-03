import { plate } from '@dxos/plate';
import template from '../template.t';

export default template.define.text({
  content: ({ input: { defaultPlugins } }) => defaultPlugins && plate`
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no" />
      <meta
        http-equiv="Content-Security-Policy"
        content="
          connect-src https: file: ipc: socket: ws://localhost:* http://localhost:*;
          script-src https: socket: http://localhost:* 'unsafe-eval' 'unsafe-inline';
          img-src https: data: file: http://localhost:*;
          child-src 'none';
          object-src 'none';
        "
      />
      <style>
        html,
        body {
          background: transparent !important;
        }
      </style>
      <!-- TODO(wittjosiah): Add hash/nonce and remove unsafe-inline from content security policy. -->
      <script>
        function setTheme(darkMode) {
          document.documentElement.classList[darkMode ? 'add' : 'remove']('dark');
        }
        setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches);
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
          setTheme(e.matches);
        });
      </script>
    </head>
    <body>
      <div id="root"></div>
      <script type="module" src="shell.ts"></script>
    </body>
  </html>  
  `
});