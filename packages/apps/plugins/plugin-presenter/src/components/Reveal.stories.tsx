//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

// eslint-disable-next-line no-restricted-imports
import 'reveal.js/dist/reveal.css';
// eslint-disable-next-line no-restricted-imports
import 'reveal.js/dist/theme/black.css';

// import { log } from '@dxos/log';

import React, { useEffect, useRef } from 'react';
import Reveal from 'reveal.js';
import Markdown from 'reveal.js/plugin/markdown/plugin.js';

const text = `
## Slide 1
A paragraph with some text and a [link](https://hakim.se).
---
## Slide 2
---
## Slide 3
`;

// https://revealjs.com/react/
const Story = () => {
  const deckDivRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<Reveal.Api | null>(null);
  useEffect(() => {
    if (deckRef.current) {
      return;
    }

    setTimeout(async () => {
      // const { default: Markdown } = await import('reveal.js/plugin/markdown/plugin.js');
      // console.log(Markdown);

      // https://revealjs.com/config
      // https://github.com/hakimel/reveal.js
      deckRef.current = new Reveal(deckDivRef.current!, {
        progress: false,
        transition: 'none',

        // https://revealjs.com/markdown
        plugins: [Markdown],

        // See https://marked.js.org/using_advanced#options
        markdown: {
          gfm: true,
        },
      });

      await deckRef.current.initialize();
      console.log('plugins', deckRef.current?.getPlugin('markdown'));

      const state = deckRef.current?.getState();
      console.log('state', state, event);
    }, 1000);

    return () => {
      try {
        if (deckRef.current) {
          deckRef.current.destroy();
          deckRef.current = null;
        }
      } catch (err) {
        // log.catch(err);
      }
    };
  });

  return (
    <div className='absolute flex inset-0 border-8 border-neutral-800'>
      <div ref={deckDivRef} className='reveal'>
        <div className='slides'>
          <section data-markdown>
            <textarea data-template defaultValue={text}></textarea>
          </section>
        </div>
      </div>
    </div>
  );
};

export default {
  title: 'plugin-presenter/Reveal',
  render: Story,
};

export const Default = {};
