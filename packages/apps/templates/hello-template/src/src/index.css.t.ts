import { defineTemplate, text } from '@dxos/plate';
import config from '../config.t';

export default defineTemplate(
  async ({ input }) => {
    const { dxosUi, tailwind } = input;
    const content = (dxosUi: boolean, tailwind: boolean) => text`
    ${
      !dxosUi &&
      tailwind &&
      text`
    @tailwind base;
    @tailwind components;
    @tailwind utilities;`
    }
    ${(dxosUi || tailwind) && text`
    h1, p, pre {
      @apply my-6;
    }

    h1 {
      @apply text-2xl text-emerald-500;
    }

    code, pre {
      @apply dark:bg-zinc-900 py-1 px-2 rounded text-emerald-500 dark:text-emerald-300 shadow-sm dark:shadow-md;
    }

    a {
      @apply text-emerald-500 dark:hover:text-emerald-200 hover:text-emerald-400;
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
    
    img.dark {
      display: none;
    }
    
    .dark img.dark {
      display: block;
    }
    
    .dark img.no-dark {
      display: none;
    }
    
    .max-w-md {
      max-width: 25rem;
    }
    
    .flex {
      display: flex;
      flex-direction: row;
    }
    
    .justify-center {
      justify-content: center;
    }
    
    .bg-zinc-100 {
      background-color: #F4F4F5;
    }
    
    .dark [class~="dark:bg-zinc-800"] {
      background-color: #27272A;
    }
    
    .p-6 {
      padding: 1.8em;
    }
    
    .m-8 {
      margin: 2.8em;
    }
    
    .rounded-md {
      border-radius: 4px;
    }
    
    .shadow-lg {
      box-shadow: 0px 4px 8px rgba(0,0,0,0.3);
    }
    
    h1, p, pre {
      margin: 1.2em 0;
    }
    
    h1 {
      color: #10B981;
    }
    
    code {
      display: inline-block;
    }
    
    pre, code {
      font-family: monospace;
      padding: 0.3em 0.4em;
      border-radius: 3px;
      box-shadow: 0px 2px 4px rgba(0,0,0,0.3);
      color: #6EE7B7;
      background-color: #71717A;
    }
    
    pre {
      padding: 0.4em;
    }
    
    .dark pre, .dark code {
      background-color: #18181B;
    }
    
    a, a:visited {
      text-decoration: none;
      color: #10B981;
    }
    
    a:hover {
      color: #34D399;
    }
    
    .dark a:hover {
      color: #A7F3D0;
    }
    
    .dark a {
    
    }
    `}
    `;

    const output = content(dxosUi, tailwind);
    return output.toString();
  },
  { config }
);
