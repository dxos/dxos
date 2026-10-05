//
// Copyright 2024 DXOS.org
//

import 'reveal.js/dist/reveal.css';
import 'reveal.js/dist/theme/black.css';
// https://github.com/highlightjs/highlight.js/tree/main/src/styles
// import 'highlight.js/styles/github-dark.css';
import 'highlight.js/styles/tokyo-night-dark.css';

import hljs from 'highlight.js';
import typescript from 'highlight.js/lib/languages/typescript';
import React, { useEffect, useRef, useState } from 'react';
import Reveal from 'reveal.js';
import RevealHighlight from 'reveal.js/plugin/highlight/highlight';
import RevealMarkdown, { type MarkdownPlugin } from 'reveal.js/plugin/markdown/plugin.js';

import { useAsyncEffect } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

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

export type RevealProps = {
  content: string;
  slide?: number;
  fullscreen?: boolean;
  onExit?: () => void;
};

type HighlightPlugin = Reveal.Plugin & { highlightBlock: (block: HTMLElement) => void };

// @types/reveal.js types the bundled highlight plugin as a bare `Plugin`, omitting the `highlightBlock` it exports.
const isHighlightPlugin = (plugin: Reveal.Plugin): plugin is HighlightPlugin => 'highlightBlock' in plugin;

type Player = {
  deck: Reveal.Api;
  markdown: MarkdownPlugin;
  highlight: HighlightPlugin;
  slides: HTMLElement;
  renderedContent: string;
};

const setMarkdown = (slides: HTMLElement, content: string) => {
  const section = document.createElement('section');
  section.setAttribute('data-markdown', '');
  const template = document.createElement('textarea');
  template.setAttribute('data-template', '');
  template.textContent = [styles, content].join('\n');
  section.appendChild(template);
  slides.replaceChildren(section);
};

const highlightCodeBlocks = (slides: HTMLElement, highlight: HighlightPlugin) => {
  slides.querySelectorAll<HTMLElement>('pre code').forEach((block) => {
    block.parentElement?.classList.add('code-wrapper');
    highlight.highlightBlock(block);
  });
};

const updateSlides = async (player: Player, content: string) => {
  const { deck, markdown, highlight, slides } = player;
  player.renderedContent = content;
  const { h, v, f } = deck.getIndices();
  setMarkdown(slides, content);
  await markdown.processSlides(slides);
  await markdown.convertSlides();
  // Reveal drops hidden slides only once, at start, so rebuilt sections must be pruned here.
  if (!deck.getConfig().showHiddenSlides) {
    slides.querySelectorAll('section[data-visibility="hidden"]').forEach((section) => {
      const stack = section.parentElement;
      (stack?.matches('section') && stack.childElementCount === 1 ? stack : section).remove();
    });
  }

  highlightCodeBlocks(slides, highlight);
  deck.sync();
  deck.slide(h, v, f);
};

/** Builds a Markdown deck on `element`, seeded with `content`, and waits for it to be ready. */
const createPlayer = async (element: HTMLElement, slides: HTMLElement, content: string): Promise<Player> => {
  // Required for syntax highlighting.
  hljs.registerLanguage('typescript', typescript);

  const markdown = RevealMarkdown();
  const highlight = RevealHighlight();
  if (!isHighlightPlugin(highlight)) {
    throw new Error('reveal.js highlight plugin does not expose highlightBlock');
  }

  setMarkdown(slides, content);

  // https://revealjs.com/react
  // https://revealjs.com/config
  // https://github.com/hakimel/reveal.js
  // TODO(burdon): Fragments and scroll view steps 2 at a time (safe mode?)
  const deck = new Reveal(element, {
    progress: false,
    transition: 'none',
    slideNumber: false,
    embedded: true,
    // Narrow decks scale like wide ones; scroll view would wrap the sections that edits replace.
    scrollActivationWidth: 0,

    // Disable autoplay to prevent errors in headless environments (e.g., CI).
    autoPlayMedia: false,

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
    plugins: [() => markdown, () => highlight],

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

  await deck.initialize();
  return { deck, markdown, highlight, slides, renderedContent: content };
};

export const RevealPlayer = composable<HTMLDivElement, RevealProps>(
  ({ content, slide, fullscreen = true, onExit, children, ...props }, forwardedRef) => {
    const deckDivRef = useRef<HTMLDivElement>(null);
    const slidesRef = useRef<HTMLDivElement>(null);
    const [player, setPlayer] = useState<Player>();

    useEffect(() => {
      if (player && player.renderedContent !== content) {
        void updateSlides(player, content);
      }
    }, [player, content]);

    useAsyncEffect(async (controller) => {
      const element = deckDivRef.current;
      const slides = slidesRef.current;
      if (!element || !slides) {
        return;
      }

      const player = await createPlayer(element, slides, content);
      const { deck } = player;
      if (controller.signal.aborted) {
        deck.destroy();
        return;
      }

      if (slide !== undefined) {
        deck.slide(slide < 0 ? deck.getTotalSlides() + slide : slide - 1);
      }

      deck.addKeyBinding({ keyCode: 27, key: 'Escape', description: 'Exit full screen' }, () => {
        onExit?.();
      });

      setPlayer(player);

      // Reveal re-lays out only on window resize; a plank or companion resizes without one.
      const resizeObserver = new ResizeObserver(() => deck.layout());
      resizeObserver.observe(element);

      return () => {
        resizeObserver.disconnect();
        try {
          deck.destroy();
        } catch {
          // Ignore.
        }
      };
    });

    return (
      <div
        {...composableProps(props, {
          classNames: [
            'dx-expand overflow-hidden grid place-items-center bg-scrim-surface [container-type:size]',
            fullscreen && 'dx-cover',
          ],
        })}
        ref={forwardedRef}
      >
        {/* Sized from the container, not clamped by `max-h-full`: WebKit gives an inset child the unclamped height. */}
        <div className='relative aspect-video w-[min(100cqw,calc(100cqh*16/9))] overflow-hidden'>
          <div ref={deckDivRef} className='dx-cover reveal'>
            {/* React hoists these to <head>; they must not be wrapped in <style> (which only renders CSS text). */}
            <link rel='preconnect' href='https://fonts.gstatic.com' {...{ crossOrigin: '' }} />
            <link rel='preconnect' href='https://fonts.googleapis.com' />
            <link
              rel='stylesheet'
              href='https://fonts.googleapis.com/css2?family=Raleway:ital,wght@0,100..900;1,100..900&display=swap'
            />
            <div ref={slidesRef} className={mx('slides', !fullscreen && 'dx-base-surface p-8')} />
          </div>
        </div>
      </div>
    );
  },
);
