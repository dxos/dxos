/** @jsxImportSource solid-js */
//
// Copyright 2026 DXOS.org
//

import { For, Show, createEffect, createSignal, onMount } from 'solid-js';

import type * as Fold from '../workspace/Fold.ts';

/**
 * The canvas: everything the agent published through the sandbox's `display` API, newest last.
 * This is the only surface the user is told to read, which is why it is a peer of the chat rather
 * than a detail inside it.
 */

/** Mermaid is loaded on first use — a diagram is common but not certain, and the library is large. */
let mermaidPromise: Promise<typeof import('mermaid').default> | undefined;

/**
 * The theme is read off the document rather than fixed: `@dxos/ui-theme` toggles `html.dark` from
 * the viewer's colour-scheme preference, and a diagram rendered in the other palette is unreadable.
 */
const loadMermaid = async () => {
  mermaidPromise ??= import('mermaid').then(({ default: mermaid }) => mermaid);
  const mermaid = await mermaidPromise;
  mermaid.initialize({
    startOnLoad: false,
    theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
    securityLevel: 'strict',
    // SVG `<text>` rather than `foreignObject`: mermaid's HTML labels inherit the page's stylesheet,
    // and the design system's reset collapses them to zero height — a diagram of empty boxes.
    flowchart: { htmlLabels: false },
    fontFamily: 'inherit',
  });
  return mermaid;
};

let diagramSeq = 0;

const Mermaid = (props: { source: string }) => {
  const [svg, setSvg] = createSignal<string>();
  const [error, setError] = createSignal<string>();

  createEffect(() => {
    const source = props.source;
    void (async () => {
      try {
        const mermaid = await loadMermaid();
        // A fresh id per render: mermaid caches by id and would otherwise return the old diagram.
        const { svg } = await mermaid.render(`diagram-${diagramSeq++}`, source);
        setSvg(svg);
        setError(undefined);
      } catch (cause) {
        // A model writes invalid Mermaid often enough that the source has to stay visible —
        // otherwise the user sees an empty panel and the agent believes it answered.
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    })();
  });

  return (
    <Show
      when={error() === undefined}
      fallback={
        <div class='p-2'>
          <p class='text-errorText text-sm'>{error()}</p>
          <pre class='mt-2 overflow-x-auto text-xs'>{props.source}</pre>
        </div>
      }
    >
      {/* eslint-disable-next-line solid/no-innerhtml -- mermaid renders to an SVG string. */}
      <div class='flex justify-center p-2 [&_svg]:max-w-full' innerHTML={svg()} />
    </Show>
  );
};

const Table = (props: { content: string }) => {
  const rows = (): Record<string, unknown>[] => {
    try {
      const parsed: unknown = JSON.parse(props.content);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const columns = () => [...new Set(rows().flatMap((row) => Object.keys(row)))];

  return (
    <Show when={rows().length > 0} fallback={<pre class='overflow-x-auto p-2 text-xs'>{props.content}</pre>}>
      <div class='overflow-x-auto'>
        <table class='w-full text-sm'>
          <thead>
            <tr class='border-separator border-b text-left'>
              <For each={columns()}>{(column) => <th class='px-2 py-1 font-medium'>{column}</th>}</For>
            </tr>
          </thead>
          <tbody>
            <For each={rows()}>
              {(row) => (
                <tr class='border-separator/50 border-b'>
                  <For each={columns()}>{(column) => <td class='px-2 py-1'>{String(row[column] ?? '')}</td>}</For>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </Show>
  );
};

const Panel = (props: { presentation: Fold.Presentation }) => (
  <section class='border-separator bg-modalSurface overflow-hidden rounded border'>
    <header class='border-separator text-description flex items-center gap-2 border-b px-2 py-1 text-xs'>
      <span class='uppercase'>{props.presentation.kind}</span>
      <Show when={props.presentation.title}>{(title) => <span class='text-baseText'>{title()}</span>}</Show>
    </header>
    <Show when={props.presentation.kind === 'mermaid'}>
      <Mermaid source={props.presentation.content} />
    </Show>
    <Show when={props.presentation.kind === 'table'}>
      <Table content={props.presentation.content} />
    </Show>
    <Show when={props.presentation.kind === 'markdown'}>
      {/* Markdown is shown as written: rendering it would mean an HTML sanitizer for model output. */}
      <pre class='overflow-x-auto p-2 text-sm whitespace-pre-wrap'>{props.presentation.content}</pre>
    </Show>
    <Show when={props.presentation.kind === 'json' || props.presentation.kind === 'text'}>
      <pre class='overflow-x-auto p-2 text-xs'>{props.presentation.content}</pre>
    </Show>
  </section>
);

export const Canvas = (props: { canvas: readonly Fold.Presentation[]; onClear: () => void }) => {
  let scroller: HTMLDivElement | undefined;

  // The newest panel is the answer, so the canvas follows it.
  createEffect(() => {
    void props.canvas.length;
    queueMicrotask(() => scroller?.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' }));
  });

  onMount(() => scroller?.scrollTo({ top: scroller.scrollHeight }));

  return (
    <div class='flex h-full min-w-0 flex-col'>
      <header class='border-separator flex items-center justify-between border-b px-3 py-2'>
        <h2 class='text-sm font-medium'>Results</h2>
        <button class='text-description hover:text-baseText text-xs' onClick={props.onClear}>
          clear
        </button>
      </header>
      <div ref={scroller} class='flex flex-1 flex-col gap-3 overflow-y-auto p-3'>
        <For each={props.canvas}>{(presentation) => <Panel presentation={presentation} />}</For>
      </div>
    </div>
  );
};
