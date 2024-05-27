import { plate } from '@dxos/plate';

import indexHtml from '@dxos/bare-template/dist/src/index.html.t';

import template from './template.t';

export default template.define.text({
  content: async (context) => {
    const {
      input: { tailwind, react, name },
    } = context;
    const darkModeScript = plate`
    <script>
      // On page load or when changing themes, best to add inline in 'head' to avoid FOUC
      if (
        localStorage.theme === 'dark' ||
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
      ) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      // Whenever the user explicitly chooses light mode
      // localStorage.theme = 'light'

      // Whenever the user explicitly chooses dark mode
      // localStorage.theme = 'dark'

      // Whenever the user explicitly chooses to respect the OS preference
      // localStorage.removeItem('theme')
    </script>
    `;
    const plainHtmlWelcome = plate`
    <div class='dxos flex justify-center align-middle'>
      <div class='max-w-md bg-zinc-100 dark:bg-zinc-800 p-6 m-8 rounded-md shadow-lg'>
        <img src='dxos-white.svg' class='mb-10 dark' />
        <img src='dxos.svg' class='mb-10 no-dark' />
        <h1>${name ?? 'hello'}</h1>
        <p>Your new DXOS app works.</p>
        <p>
          See <code>index.html</code> and <code>src/main.ts</code>
        </p>
        ${
          tailwind &&
          `<p>
          <a href='https://tailwindcss.com/docs' target='_blank' rel='noreferrer'>
            Tailwind
          </a> is available.
        </p>`
        }
        <p>
          Add your <code>css</code> to <code>src/index.css</code> or import <code>.css</code> files from your 
          <code>.ts</code> files directly.
        </p>
        <p>Create a <code>Client</code>:
        <pre>
import { Client } from '@dxos/client';
const client = new Client();
await client.initialize();
console.log(client.toJSON());
        </pre>
        <p>Result:</p>
        <pre id='output'>
        </pre>
        <p>
          When you are ready you can deploy to any static hosting service. See sample <a href='https://docs.dxos.org/guide/tutorial.html#deploying-the-app' target='_blank' rel='noreferrer'>deploy instructions</a>.
        </p>
        <h2>Learn more:</h2>
        <ul>
          <li>
            <a href='https://docs.dxos.org/guide/echo/react' target='_blank' rel='noreferrer'>
              Using ECHO with React
            </a>
          </li>
          <li>
            <a href='https://docs.dxos.org' target='_blank' rel='noreferrer'>
              DXOS Documentation
            </a>
          </li>
        </ul>
      </div>
    </div>
    `;
    const inherited = await indexHtml({
      ...context,
      slots: {
        head: darkModeScript,
        body: react ? '' : plainHtmlWelcome,
      },
    });
    return inherited?.files?.[0]?.content ?? '';
  },
});
