/** @jsxImportSource solid-js */
//
// Copyright 2026 DXOS.org
//

import { For, Show, createResource, createSignal } from 'solid-js';

import { diffHighlightStyles, highlightLines } from '@dxos/ui-editor';

/**
 * A source excerpt coloured exactly as the editor colours the same code, via the editor's own
 * Lezer highlighter; an unknown language, or a parse that throws, leaves the plain text in place.
 */

const isDark = () => document.documentElement.classList.contains('dark');

/** The theme as a signal, so an open snippet re-highlights when `@dxos/ui-theme` toggles `html.dark`. */
const [dark, setDark] = createSignal(isDark());
new MutationObserver(() => setDark(isDark())).observe(document.documentElement, { attributeFilter: ['class'] });

const mounted = new Set<string>();

/** A highlight style's classes colour nothing until its rules are in the document; outside an editor nobody mounts them. */
const mount = (rules: string) => {
  if (!mounted.has(rules)) {
    mounted.add(rules);
    const element = document.createElement('style');
    element.textContent = rules;
    document.head.appendChild(element);
  }
};

/** The language name for a path's extension, which is what CodeMirror's language data matches on. */
const language = (path: string | undefined): string => path?.match(/\.([^./]+)$/)?.[1] ?? 'typescript';

export const Snippet = (props: { code: string; path?: string }) => {
  const [lines] = createResource(
    () => ({ code: props.code, path: props.path, theme: dark() ? ('dark' as const) : ('light' as const) }),
    async ({ code, path, theme }) => {
      const highlighter = diffHighlightStyles[theme];
      mount(highlighter.module?.getRules() ?? '');
      return highlightLines(code, language(path), undefined, highlighter).catch(() => undefined);
    },
  );

  return (
    <pre class='bg-baseSurface mt-1 overflow-x-auto rounded p-1'>
      <Show when={lines()} fallback={props.code}>
        {(fragments) => <For each={fragments()}>{(fragment) => <div class='min-h-[1lh]'>{fragment}</div>}</For>}
      </Show>
    </pre>
  );
};
