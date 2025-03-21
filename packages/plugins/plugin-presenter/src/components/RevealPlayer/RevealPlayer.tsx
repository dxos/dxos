//
// Copyright 2024 DXOS.org
//

// eslint-disable-next-line no-restricted-imports
import 'reveal.js/dist/reveal.css';
// eslint-disable-next-line no-restricted-imports
import 'reveal.js/dist/theme/black.css';

// https://github.com/highlightjs/highlight.js/tree/main/src/styles
// import 'highlight.js/styles/github-dark.css';
import 'highlight.js/styles/tokyo-night-dark.css';

import hljs from 'highlight.js';
import typescript from 'highlight.js/lib/languages/typescript';
import React, { useEffect, useRef } from 'react';
import Reveal from 'reveal.js';
import RevealHighlight from 'reveal.js/plugin/highlight/highlight';
import RevealMarkdown from 'reveal.js/plugin/markdown/plugin.js';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

const styles = `
<style type="text/css">
  .reveal h1 {
    font-weight: 100;
    font-size: 60px;
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
    text-align: center;
    font-weight: 100;
    padding: 32px;
  }
  .reveal pre {
    margin-left: 0;
  }
  .reveal code {
    font-size: 20px;
    background: #111111;
    color: #eeeeee;
    max-height: unset !important;
  }
</style>
`;

export type RevealProps = ThemedClassName<{
  content: string;
  slide?: number;
  fullscreen?: boolean;
  onExit?: () => void;
}>;

export const RevealPlayer = ({ classNames, content, slide, fullscreen = true, onExit }: RevealProps) => {
  const deckDivRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<Reveal.Api | null>(null);
  useEffect(() => {
    if (deckRef.current) {
      return;
    }

    // Required for syntax highlighting.
    hljs.registerLanguage('typescript', typescript);

    const t = setTimeout(async () => {
      // https://revealjs.com/react
      // https://revealjs.com/config
      // https://github.com/hakimel/reveal.js
      // TODO(burdon): Fragments and scroll view steps 2 at a time (safe mode?)
      deckRef.current = new Reveal(deckDivRef.current!, {
        // view: 'scroll',
        progress: false,
        transition: 'none',
        slideNumber: false,
        embedded: true,

        // TODO(burdon): Speaker view requires server to serve popout window.
        // https://revealjs.com/speaker-view
        showNotes: false,

        // width: 1600,
        // height: 900,
        margin: 0.1,
        // center: false,
        // minScale: 0.1,
        // maxScale: 1.4,

        // https://revealjs.com/markdown
        // TODO(burdon): Requires server to serve popout window.
        plugins: [RevealMarkdown, RevealHighlight],

        // See https://marked.js.org/using_advanced#options
        markdown: {
          gfm: true,
          smartypants: true,
          highlight: (code, language) => {
            if (language) {
              return hljs.highlight(code, { language }).value;
            }

            return hljs.highlightAuto(code).value;
          },
        },
      });

      await deckRef.current.initialize();

      if (slide !== undefined) {
        deckRef.current.slide(slide < 0 ? deckRef.current?.getTotalSlides() + slide : slide - 1);
      }

      deckRef.current.addKeyBinding({ keyCode: 27, key: 'Escape', description: 'Exit full screen' }, () => {
        onExit?.();
      });
    });

    return () => {
      try {
        clearTimeout(t);
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
    <div className={mx('absolute flex h-full w-full items-center justify-center', fullscreen && 'inset-0', classNames)}>
      <div className='relative aspect-video w-full'>
        <div ref={deckDivRef} className='reveal'>
          {/* TODO(burdon): Must be in head. */}
          <style>
            <link rel='preconnect' href='https://fonts.googleapis.com' />
            <link rel='preconnect' href='https://fonts.gstatic.com' {...{ crossOrigin: '' }} />
            <link
              rel='stylesheet'
              href='https://fonts.googleapis.com/css2?family=Raleway:ital,wght@0,100..900;1,100..900&display=swap'
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
    </div>
  );
};
