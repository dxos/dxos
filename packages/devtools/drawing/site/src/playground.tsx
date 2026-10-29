//
// Copyright 2026 DXOS.org
//

import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { Compartment, type Extension } from '@codemirror/state';
import { tags } from '@lezer/highlight';
import * as Cause from 'effect/Cause';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { useTextEditor } from '@dxos/react-ui-editor';
import { createBasicExtensions, createThemeExtensions, listener } from '@dxos/ui-editor';

import initialSource from '../diagrams/arch.dx?raw';
import initialMermaid from '../diagrams/arch.mmd?raw';
import { shareSource } from './composer.ts';
import { type Drawing, type Language } from './drawing.ts';
import { HERO, escapeHtml } from './markup.ts';

/** Long enough that a burst of typing lays out once, short enough to feel live. */
const DEBOUNCE = Duration.millis(250);

type ColorScheme = 'light' | 'dark';

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

const useColorScheme = (): ColorScheme => {
  const [scheme, setScheme] = useState<ColorScheme>(() => (darkQuery().matches ? 'dark' : 'light'));
  useEffect(() => {
    const query = darkQuery();
    const onChange = ({ matches }: MediaQueryListEvent) => setScheme(matches ? 'dark' : 'light');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return scheme;
};

/** The page's code colours, as CSS variables, so the source reads like the static fallback in either scheme. */
const highlightStyle = HighlightStyle.define([
  { tag: [tags.definitionKeyword, tags.keyword, tags.modifier], color: 'var(--route)' },
  { tag: tags.string, color: 'var(--string)' },
  { tag: [tags.number, tags.attributeName, tags.operator], color: 'var(--muted)' },
  { tag: tags.lineComment, color: 'var(--muted)', fontStyle: 'italic' },
]);

/** Each language's extensions load after first paint: the `.dx` lint carries the whole layout engine. */
const loadLanguage = async (language: Language): Promise<Extension> => {
  if (language === 'dx') {
    const { diagram } = await import('@dxos/diagram/extension');
    return diagram();
  }
  // The Mermaid grammar tags its tokens with its own tags, which no generic highlight style matches.
  const { flowchartTags, mermaid, mermaidTags } = await import('codemirror-lang-mermaid');
  return [
    mermaid(),
    syntaxHighlighting(
      HighlightStyle.define([
        {
          tag: [mermaidTags.diagramName, flowchartTags.diagramName, flowchartTags.keyword, flowchartTags.orientation],
          color: 'var(--route)',
        },
        { tag: [flowchartTags.nodeText, flowchartTags.nodeEdgeText, flowchartTags.string], color: 'var(--string)' },
        { tag: [flowchartTags.link, flowchartTags.nodeEdge, flowchartTags.number], color: 'var(--muted)' },
        { tag: flowchartTags.lineComment, color: 'var(--muted)', fontStyle: 'italic' },
      ]),
    ),
  ];
};

const EXTENSION: Record<Language, string> = { dx: 'dx', mermaid: 'mmd' };

type SourceEditorProps = {
  readonly language: Language;
  readonly initialValue: string;
  readonly onChange: (text: string) => void;
};

const SourceEditor = ({ language: sourceLanguage, initialValue, onChange }: SourceEditorProps) => {
  const scheme = useColorScheme();
  // The editor is rebuilt when the scheme flips, and must come back with what the user typed, not the sample.
  const text = useRef(initialValue);
  const language = useRef(new Compartment());
  const { parentRef, focusAttributes, view } = useTextEditor(
    () => ({
      initialValue: text.current,
      extensions: [
        createBasicExtensions({ lineNumbers: true, lineWrapping: false, highlightActiveLine: true }),
        createThemeExtensions({ themeMode: scheme, monospace: true }),
        syntaxHighlighting(highlightStyle),
        language.current.of([]),
        listener({
          onChange: ({ text: value }) => {
            text.current = value;
            onChange(value);
          },
        }),
      ],
    }),
    [scheme],
  );
  useEffect(() => {
    if (!view) {
      return;
    }
    let live = true;
    void loadLanguage(sourceLanguage).then((extension) => {
      if (live) {
        view.dispatch({ effects: language.current.reconfigure(extension) });
      }
    });
    return () => {
      live = false;
    };
  }, [view, sourceLanguage]);

  return <div {...focusAttributes} ref={parentRef} aria-label={`${HERO}.${EXTENSION[sourceLanguage]} source`} />;
};

type Elements = {
  readonly editor: HTMLElement;
  readonly output: HTMLElement;
  readonly canvas: HTMLElement;
  readonly report: HTMLElement;
  readonly download: HTMLAnchorElement;
  readonly composer: HTMLButtonElement;
  readonly tabs: readonly HTMLButtonElement[];
};

const find = (playground: HTMLElement): Elements | undefined => {
  const editor = playground.querySelector<HTMLElement>('#editor');
  const output = playground.querySelector<HTMLElement>('#output');
  const canvas = playground.querySelector<HTMLElement>('.canvas');
  const report = playground.querySelector<HTMLElement>('#report');
  const download = playground.querySelector<HTMLAnchorElement>('#download');
  const composer = playground.querySelector<HTMLButtonElement>('#open-in-composer');
  const tabs = [...playground.querySelectorAll<HTMLButtonElement>('[role="tab"][data-language]')];
  return editor && output && canvas && report && download && composer
    ? { editor, output, canvas, report, download, composer, tabs }
    : undefined;
};

/**
 * Lays out each edit after a pause and puts it on the page. The drawing, report and download are the
 * prerendered page's own elements, updated in place, so nothing on first paint is replaced until the user types.
 */
const scheduler = ({ output, canvas, report, download }: Elements) => {
  let pending: Fiber.Fiber<void> | undefined;
  let url: string | undefined;
  const show = (drawing: Drawing) => {
    report.innerHTML = drawing.reportHtml;
    // A source that does not compile keeps the last drawing up, under the errors that explain why.
    if (drawing.stageHtml) {
      canvas.innerHTML = drawing.stageHtml;
      if (url) {
        URL.revokeObjectURL(url);
      }
      url = URL.createObjectURL(new Blob([drawing.file.svg], { type: 'image/svg+xml' }));
      download.href = url;
    }
  };

  return (language: Language, text: string) => {
    if (pending) {
      Effect.runFork(Fiber.interrupt(pending));
    }
    output.setAttribute('aria-busy', 'true');
    pending = Effect.runFork(
      Effect.sleep(DEBOUNCE).pipe(
        // The layout engine is the heavy part of the page, so it loads on the first edit.
        Effect.andThen(Effect.tryPromise(() => import('./drawing.ts'))),
        Effect.flatMap(({ draw, drawMermaid }) => (language === 'dx' ? draw(text) : drawMermaid(text))),
        Effect.flatMap((drawing) => Effect.sync(() => show(drawing))),
        // Defects (a throw inside `draw`) must reach the report too, or it keeps the previous render's message.
        Effect.catchCause((cause) =>
          Effect.sync(() => {
            if (Cause.hasInterruptsOnly(cause)) {
              return;
            }
            const error = Cause.squash(cause);
            const message = error instanceof Error ? error.message : String(error);
            report.innerHTML = `<span class="note error">${escapeHtml(message)}</span>`;
          }),
        ),
        Effect.ensuring(Effect.sync(() => output.setAttribute('aria-busy', 'false'))),
      ),
    );
  };
};

/**
 * Shares the editor's text with app.drawing.sh and opens the link in a new tab. The tab is opened during the
 * click, since a popup blocker refuses one opened after the network round trip, and is pointed at the link once
 * the share API answers.
 */
const openInComposer = ({ composer, report }: Elements, language: Language, text: string) => {
  const tab = window.open('', '_blank');
  if (tab) {
    tab.opener = null;
    tab.document.title = 'Opening drawing...';
  }
  composer.setAttribute('aria-busy', 'true');
  Effect.runFork(
    Effect.tryPromise(() => import('./drawing.ts')).pipe(
      Effect.flatMap(({ toDsl }) => toDsl(language, text)),
      Effect.flatMap((source) => shareSource(source, HERO)),
      Effect.flatMap((url) =>
        Effect.sync(() => {
          if (tab) {
            tab.location.href = url;
          } else {
            report.insertAdjacentHTML(
              'beforeend',
              `<span class="note">Open <a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(url)}</a></span>`,
            );
          }
        }),
      ),
      Effect.catchCause((cause) =>
        Effect.sync(() => {
          tab?.close();
          const error = Cause.squash(cause);
          const message = error instanceof Error ? error.message : String(error);
          report.insertAdjacentHTML('beforeend', `<span class="note error">${escapeHtml(message)}</span>`);
        }),
      ),
      Effect.ensuring(Effect.sync(() => composer.removeAttribute('aria-busy'))),
    ),
  );
};

/** Replaces the static source with the live editor; the prerendered drawing stays until the first edit. */
export const mount = (playground: HTMLElement) => {
  const elements = find(playground);
  if (!elements) {
    return;
  }
  const schedule = scheduler(elements);
  // Each language keeps its own text, so switching back and forth loses no edits.
  const texts: Record<Language, string> = { dx: initialSource, mermaid: initialMermaid };
  let current: Language = 'dx';
  elements.composer.disabled = false;
  elements.composer.addEventListener('click', () => openInComposer(elements, current, texts[current]));
  const root = createRoot(elements.editor);
  const show = (language: Language) => {
    current = language;
    for (const tab of elements.tabs) {
      tab.setAttribute('aria-selected', String(tab.dataset.language === language));
      tab.disabled = false;
    }
    root.render(
      <SourceEditor
        key={language}
        language={language}
        initialValue={texts[language]}
        onChange={(text) => {
          texts[language] = text;
          schedule(language, text);
        }}
      />,
    );
  };
  for (const tab of elements.tabs) {
    tab.addEventListener('click', () => {
      const language = tab.dataset.language === 'mermaid' ? 'mermaid' : 'dx';
      if (tab.getAttribute('aria-selected') !== 'true') {
        show(language);
        schedule(language, texts[language]);
      }
    });
  }
  show('dx');
};
