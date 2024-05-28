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
// import Notes from 'reveal.js/plugin/notes/notes.js';

const styles = `
<style type="text/css">
  .reveal .slide-background-content {
    opacity: 0.5;
  }
  .reveal h1 {
    font-weight: 100;
    padding-left: 36px;
    opacity: 0.5;
  }
  .reveal h2 {
    font-weight: 100;
    padding-top: 60px;
    padding-left: 40px;
    font-size: 48px;
    opacity: 0.3;
  }
  .reveal h1, h2, p {
    font-family: "Raleway", sans-serif;
    text-align: left;
    font-weight: 200;
  }
  .reveal ul {
    font-family: "Raleway", sans-serif;
    display: block;
    list-style: "- ";
  }
  .reveal blockquote p {
    font-weight: 100;
    padding: 32px;
  }
</style>
`;

export type RevealProps = {
  content: string;
  slide?: number;
  onExit?: () => void;
};

// https://revealjs.com/react
export const RevealPlayer = ({ content, slide, onExit }: RevealProps) => {
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
        embedded: true,
        // https://revealjs.com/speaker-view
        showNotes: false,

        // https://revealjs.com/markdown
        plugins: [
          Markdown,
          // TODO(burdon): Requires server to serve popout window.
          // Notes
        ],

        // See https://marked.js.org/using_advanced#options
        markdown: {
          gfm: true,
        },
      });

      await deckRef.current.initialize();
      if (slide !== undefined) {
        deckRef.current.slide((slide <= 0 ? deckRef.current?.getTotalSlides() + slide : slide) - 1);
      }
      deckRef.current.addKeyBinding({ keyCode: 27, key: 'Escape', description: 'Exit full screen' }, () => {
        onExit?.();
      });
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
    <div className='absolute inset-0 h-full'>
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
          <div className='!text-center' />
          <section {...{ 'data-markdown': [] }}>
            <textarea {...{ 'data-template': true }} defaultValue={[styles, content].join('\n')}></textarea>
          </section>
        </div>
      </div>
    </div>
  );
};
