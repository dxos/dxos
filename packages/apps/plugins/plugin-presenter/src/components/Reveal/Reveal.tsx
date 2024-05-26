//
// Copyright 2024 DXOS.org
//

// eslint-disable-next-line no-restricted-imports
import 'reveal.js/dist/reveal.css';
// eslint-disable-next-line no-restricted-imports
import 'reveal.js/dist/theme/black.css';

import React, { useEffect, useRef } from 'react';
import Reveal from 'reveal.js';
import Markdown from 'reveal.js/plugin/markdown/plugin.js';
import Notes from 'reveal.js/plugin/notes/notes.js';

export type RevealProps = {
  content: string;
};

// https://revealjs.com/react
export const RevealPlayer = ({ content }: RevealProps) => {
  const deckDivRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<Reveal.Api | null>(null);
  useEffect(() => {
    if (deckRef.current) {
      return;
    }

    setTimeout(async () => {
      // https://revealjs.com/config
      // https://github.com/hakimel/reveal.js
      // TODO(burdon): Fragments and scroll view steps 2 at a time (safe mode?)
      deckRef.current = new Reveal(deckDivRef.current!, {
        // view: 'scroll',
        progress: false,
        transition: 'none',
        center: true,
        slideNumber: false,
        embedded: false,
        // https://revealjs.com/speaker-view
        showNotes: false,

        // https://revealjs.com/markdown
        plugins: [Markdown, Notes],

        // See https://marked.js.org/using_advanced#options
        markdown: {
          gfm: true,
        },
      });

      await deckRef.current.initialize();
    });

    return () => {
      try {
        if (deckRef.current) {
          deckRef.current.destroy();
          deckRef.current = null;
        }
      } catch (err) {
        // Ignore.
      }
    };
  });

  return (
    <div className='absolute flex inset-0 border-8 border-neutral-800'>
      <div ref={deckDivRef} className='reveal'>
        {/* TODO(burdon): Must be in head. */}
        <style>
          <link rel='preconnect' href='https://fonts.googleapis.com' />
          <link rel='preconnect' href='https://fonts.gstatic.com' {...{ crossOrigin: 'true' }} />
          <link
            href='https://fonts.googleapis.com/css2?family=Raleway:ital,wght@0,100..900;1,100..900&display=swap'
            rel='stylesheet'
          />
        </style>
        <div className='slides'>
          <section {...{ 'data-markdown': [] }}>
            <textarea {...{ 'data-template': true }} defaultValue={content}></textarea>
          </section>
        </div>
      </div>
    </div>
  );
};
