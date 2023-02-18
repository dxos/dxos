import { defineTemplate, text } from '@dxos/plate';
import config from '../config.t';

export default defineTemplate(
  async ({ input }) => {
    const { dxosUi, react, tailwind } = input;
    return text`
    ${
      !dxosUi &&
      tailwind &&
      text`
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
    
    `
    }
    ${!react && text`
    .dark img.no-dark {
      display: none;
    }

    img.dark {
      display: none;
    }
    
    .dark img.dark {
      display: block;
    }
    `}
    ${(dxosUi || tailwind) && text`

    ${!dxosUi && text`
    body {
      @apply dark:bg-zinc-900 dark:text-zinc-300 bg-zinc-200 text-zinc-800;
    }
    `}

    .dxos h1, .dxos p, .dxos pre {
      @apply my-6;
    }

    .dxos h1 {
      @apply text-2xl text-emerald-500;
    }

    .dxos code {
      @apply bg-zinc-200;
    }
    
    .dxos pre {
      @apply bg-zinc-800;
    }

    .dxos code, .dxos pre {
      @apply dark:bg-zinc-900 py-1 px-2 rounded text-emerald-500 dark:text-emerald-300 shadow-sm dark:shadow-md;
    }

    .dxos a {
      @apply text-emerald-500 dark:hover:text-emerald-200 hover:text-emerald-400;
    }

    .dxos button {
      @apply border dark:border-zinc-200 border-zinc-800 p-2 px-4 rounded;
    }
    
    .dxos .demo {
      @apply rounded bg-zinc-200 dark:bg-zinc-900 p-6 text-center;
    }
    
    `}
    ${!(dxosUi || tailwind) && text`
    * {
      box-sizing: border-box;
      font-family: sans-serif;
    }
    
    body {
      background-color: #D4D4D8;
    }
    
    .dark body {
      background-color: #18181B;
      color: #E4E4E7;
    }
    
    .dxos .max-w-md {
      max-width: 25rem;
    }
    
    .dxos .flex {
      display: flex;
      flex-direction: row;
    }
    
    .dxos .justify-center {
      justify-content: center;
    }
    
    .dxos .bg-zinc-100 {
      background-color: #F4F4F5;
    }
    
    .dxos .dark [class~="dark:bg-zinc-800"] {
      background-color: #27272A;
    }
    
    .dxos .p-6 {
      padding: 1.8em;
    }
    
    .dxos .m-8 {
      margin: 2.8em;
    }
    
    .dxos .rounded-md {
      border-radius: 4px;
    }
    
    .dxos .shadow-lg {
      box-shadow: 0px 4px 8px rgba(0,0,0,0.3);
    }
    
    .dxos h1, p, pre {
      margin: 1.2em 0;
    }
    
    .dxos h1 {
      color: #10B981;
    }
    
    .dxos code {
      display: inline-block;
    }
    
    .dxos pre, code {
      font-family: monospace;
      padding: 0.3em 0.4em;
      border-radius: 3px;
      box-shadow: 0px 2px 4px rgba(0,0,0,0.3);
      color: #6EE7B7;
      background-color: #71717A;
    }
    
    .dxos pre {
      padding: 0.4em;
    }
    
    .dxos .dark pre, .dark code {
      background-color: #18181B;
    }
    
    .dxos a, a:visited {
      text-decoration: none;
      color: #10B981;
    }
    
    .dxos a:hover {
      color: #34D399;
    }
    
    .dxos .dark a:hover {
      color: #A7F3D0;
    }
    `}
    `;
  },
  { config }
);
