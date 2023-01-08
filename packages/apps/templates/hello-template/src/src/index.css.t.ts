import { defineTemplate, text } from '@dxos/plate';
import config from '../config.t';
import tailwindcss from 'tailwindcss';
import { Processor } from 'postcss';

export default defineTemplate(
  async ({ input }) => {
    const { dxosUi, tailwind } = input;
    // const processor = tailwindcss();
    const processor = new Processor([tailwindcss({
      config: {
        content: [],
        plugins: []
      }
    })])
    const content = (dxosUi: boolean, tailwind: boolean) => text`
    ${
      !dxosUi &&
      tailwind &&
      text`
    @tailwind base;
    @tailwind components;
    @tailwind utilities;`
    }

    * {
      box-sizing: border-box;
    }

    body {
      @apply bg-zinc-300 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200;
    }

    h1, p, pre {
      @apply my-6;
    }

    h1 {
      @apply text-2xl text-emerald-500;
    }

    code, pre {
      background-color: #e8e8e8;
      @apply dark:bg-zinc-900 py-1 px-2 rounded text-emerald-500 dark:text-emerald-300 shadow-sm dark:shadow-md;
    }

    pre {
      @apply py-2 px-4;
    }

    a {
      @apply text-emerald-500 dark:hover:text-emerald-200 hover:text-emerald-400;
    }
    `;
    console.log(processor);
    const output = await (!tailwind && !dxosUi
      ? processor.process(content(false, true), { from: 'index.css' })
      : Promise.resolve(content(dxosUi, tailwind)));
    return output.toString();
  },
  { config }
);
