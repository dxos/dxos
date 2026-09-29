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
import React, { useEffect, useRef } from 'react';
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
  /** Markdown the slides were last rendered from. */
  content: string;
};

/** Replaces the slides with a single unparsed markdown section for the markdown plugin to split. */
const setMarkdown = (slides: HTMLElement, content: string) => {
  const section = document.createElement('section');
  section.setAttribute('data-markdown', '');
  const template = document.createElement('textarea');
  template.setAttribute('data-template', '');
  template.textContent = [styles, content].join('\n');
  section.appendChild(template);
  slides.replaceChildren(section);
};

/** Re-renders an initialized deck from new markdown, keeping the presenter at the same slide index and fragment. */
const updateSlides = async (player: Player, content: string) => {
  const { deck, markdown, highlight, slides } = player;
  player.content = content;
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

  // Same per-block pass the highlight plugin's init makes, so edited code renders as it did on load.
  slides.querySelectorAll<HTMLElement>('pre code').forEach((block) => {
    block.parentElement?.classList.add('code-wrapper');
    highlight.highlightBlock(block);
  });
  deck.sync();
  deck.slide(h, v, f);
};

export const RevealPlayer = composable<HTMLDivElement, RevealProps>(
  ({ content, slide, fullscreen = true, onExit, children, ...props }, forwardedRef) => {
    const deckDivRef = useRef<HTMLDivElement>(null);
    const slidesRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<Player | null>(null);
    const contentRef = useRef(content);

    useEffect(() => {
      contentRef.current = content;
      const player = playerRef.current;
      if (player && player.content !== content) {
        void updateSlides(player, content);
      }
    }, [content]);

    useAsyncEffect(async (controller) => {
      if (playerRef.current) {
        return;
      }

      // Required for syntax highlighting.
      hljs.registerLanguage('typescript', typescript);

      const markdown = RevealMarkdown();
      const highlight = RevealHighlight();
      if (!isHighlightPlugin(highlight)) {
        throw new Error('reveal.js highlight plugin does not expose highlightBlock');
      }

      const slides = slidesRef.current!;
      const initialContent = contentRef.current;
      setMarkdown(slides, initialContent);

      // https://revealjs.com/react
      // https://revealjs.com/config
      // https://github.com/hakimel/reveal.js
      // TODO(burdon): Fragments and scroll view steps 2 at a time (safe mode?)
      const deck = new Reveal(deckDivRef.current!, {
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
      // The effect's cleanup is only registered once this callback returns, so an unmount mid-init lands here.
      if (controller.signal.aborted) {
        deck.destroy();
        return;
      }

      const player: Player = { deck, markdown, highlight, slides, content: initialContent };
      playerRef.current = player;

      if (slide !== undefined) {
        deck.slide(slide < 0 ? deck.getTotalSlides() + slide : slide - 1);
      }

      deck.addKeyBinding({ keyCode: 27, key: 'Escape', description: 'Exit full screen' }, () => {
        onExit?.();
      });

      // Pick up edits that arrived while the deck was initializing.
      if (contentRef.current !== player.content) {
        void updateSlides(player, contentRef.current);
      }

      return () => {
        try {
          playerRef.current = null;
          deck.destroy();
        } catch {
          // Ignore.
        }
      };
    });

    // TODO(burdon): Trap cursor keys (otherwise the enclosing focus group grabs focus.)
    return (
      <div
        {...composableProps(props, {
          classNames: [
            'dx-expand overflow-hidden grid place-items-center bg-scrim-surface',
            fullscreen && 'dx-fullscreen',
          ],
        })}
        ref={forwardedRef}
      >
        <div className='relative aspect-video dx-fill h-auto max-h-full overflow-hidden'>
          <div ref={deckDivRef} className='dx-fullscreen reveal'>
            {/* React hoists these to <head>; they must not be wrapped in <style> (which only renders CSS text). */}
            <link rel='preconnect' href='https://fonts.gstatic.com' {...{ crossOrigin: '' }} />
            <link rel='preconnect' href='https://fonts.googleapis.com' />
            <link
              rel='stylesheet'
              href='https://fonts.googleapis.com/css2?family=Raleway:ital,wght@0,100..900;1,100..900&display=swap'
            />
            {/* Slides are owned by Reveal and filled imperatively from `content`. */}
            <div ref={slidesRef} className={mx('slides', !fullscreen && 'dx-base-surface p-8')} />
          </div>
        </div>
      </div>
    );
  },
);
