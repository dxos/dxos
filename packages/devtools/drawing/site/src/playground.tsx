//
// Copyright 2026 DXOS.org
//

import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { Compartment } from '@codemirror/state';
import { tags } from '@lezer/highlight';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { useTextEditor } from '@dxos/react-ui-editor';
import { createBasicExtensions, createThemeExtensions, listener } from '@dxos/ui-editor';

import initialSource from '../diagrams/arch.dx?raw';
import { OPEN_IN_COMPOSER } from './composer.ts';
import { type Drawing } from './drawing.ts';
import { HERO, escapeHtml, fileName } from './markup.ts';

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

type SourceEditorProps = { readonly initialValue: string; readonly onChange: (text: string) => void };

const SourceEditor = ({ initialValue, onChange }: SourceEditorProps) => {
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
  // The language's lint lays the source out, so it carries the whole engine and joins the editor after first paint.
  useEffect(() => {
    if (!view) {
      return;
    }
    let live = true;
    void import('@dxos/diagram/extension').then(({ diagram }) => {
      if (live) {
        view.dispatch({ effects: language.current.reconfigure(diagram()) });
      }
    });
    return () => {
      live = false;
    };
  }, [view]);

  return <div {...focusAttributes} ref={parentRef} aria-label={`${HERO}.dx source`} />;
};

type Elements = {
  readonly editor: HTMLElement;
  readonly output: HTMLElement;
  readonly canvas: HTMLElement;
  readonly report: HTMLElement;
  readonly download: HTMLAnchorElement;
  readonly composer: HTMLAnchorElement;
};

const find = (playground: HTMLElement): Elements | undefined => {
  const editor = playground.querySelector<HTMLElement>('#editor');
  const output = playground.querySelector<HTMLElement>('#output');
  const canvas = playground.querySelector<HTMLElement>('.canvas');
  const report = playground.querySelector<HTMLElement>('#report');
  const download = playground.querySelector<HTMLAnchorElement>('#download');
  const composer = playground.querySelector<HTMLAnchorElement>('#open-in-composer');
  return editor && output && canvas && report && download && composer
    ? { editor, output, canvas, report, download, composer }
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

  return (text: string) => {
    if (pending) {
      Effect.runFork(Fiber.interrupt(pending));
    }
    output.setAttribute('aria-busy', 'true');
    pending = Effect.runFork(
      Effect.sleep(DEBOUNCE).pipe(
        // The layout engine is the heavy part of the page, so it loads on the first edit.
        Effect.andThen(Effect.promise(() => import('./drawing.ts'))),
        Effect.flatMap(({ draw }) => draw(text)),
        Effect.flatMap((drawing) => Effect.sync(() => show(drawing))),
        Effect.catch((error) =>
          Effect.sync(() => {
            report.innerHTML = `<span class="note error">${escapeHtml(error.message)}</span>`;
          }),
        ),
        Effect.ensuring(Effect.sync(() => output.setAttribute('aria-busy', 'false'))),
      ),
    );
  };
};

/** Replaces the static source with the live editor; the prerendered drawing stays until the first edit. */
export const mount = (playground: HTMLElement) => {
  const elements = find(playground);
  if (!elements) {
    return;
  }
  if (OPEN_IN_COMPOSER.enabled) {
    elements.composer.href = OPEN_IN_COMPOSER.url(new URL(fileName(HERO), location.href).href);
    elements.composer.removeAttribute('aria-disabled');
  }
  const schedule = scheduler(elements);
  createRoot(elements.editor).render(<SourceEditor initialValue={initialSource} onChange={schedule} />);
};
