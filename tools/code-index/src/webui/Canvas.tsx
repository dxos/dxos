/** @jsxImportSource solid-js */
//
// Copyright 2026 DXOS.org
//

import { type ComponentType } from 'react';
import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js';

import type { Scene } from '@dxos/diagram';

import type * as Fold from '../workspace/Fold.ts';
import { prepare } from './diagram.ts';
import type { Reply, Request } from './diagram.worker.ts';
import { ForceGraph } from './ForceGraph.tsx';
import { DiagramIsland } from './react/Diagram.tsx';
import { type Island, mount } from './react/Island.ts';
import { MarkdownIsland } from './react/Markdown.tsx';

/**
 * The canvas: everything the agent published through the sandbox's `display` API, newest last.
 * This is the only surface the user is told to read, which is why it is a peer of the chat rather
 * than a detail inside it.
 */

/** One worker for the page, started by the first diagram; layouts queue on it in order. */
let worker: Worker | undefined;
let requestSeq = 0;
const pending = new Map<number, { resolve: (objects: Scene.WorldObject[]) => void; reject: (error: Error) => void }>();

const layoutInWorker = (source: string): Promise<Scene.WorldObject[]> => {
  if (!worker) {
    worker = new Worker(new URL('./diagram.worker.ts', import.meta.url), { type: 'module' });
    worker.addEventListener('message', (event: MessageEvent<Reply>) => {
      const reply = event.data;
      const request = pending.get(reply.id);
      pending.delete(reply.id);
      if ('error' in reply) {
        request?.reject(new Error(reply.error));
      } else {
        request?.resolve(reply.objects);
      }
    });
    // The worker failing to load leaves no reply coming, so every waiting panel shows the failure.
    worker.addEventListener('error', (event) => {
      const waiting = [...pending.values()];
      pending.clear();
      worker = undefined;
      waiting.forEach((request) => request.reject(new Error(event.message || 'The diagram worker failed to start.')));
    });
  }
  const id = requestSeq++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker?.postMessage({ id, source } satisfies Request);
  });
};

/** A React component drawn in the Solid canvas; its root lives exactly as long as this element. */
const ReactIsland = <Props extends object>(props: { component: ComponentType<Props>; props: Props }) => {
  let container: HTMLDivElement | undefined;
  let island: Island<Props> | undefined;
  createEffect(() => {
    if (container) {
      island ??= mount(container, props.component);
      island.render(props.props);
    }
  });
  onCleanup(() => island?.dispose());
  return <div ref={container} />;
};

/** A `display.mermaid` panel, laid out and drawn by plugin-illustrator rather than mermaid.js. */
const Diagram = (props: { source: string }) => {
  const [objects, setObjects] = createSignal<Scene.WorldObject[]>();
  const [error, setError] = createSignal<string>();
  const prepared = createMemo(() => prepare(props.source));

  createEffect(() => {
    const current = prepared();
    setObjects(undefined);
    setError(undefined);
    if (current.kind !== 'flowchart') {
      return;
    }
    layoutInWorker(current.source).then(
      (laidOut) => {
        // A newer source may have been sent while this one was being laid out.
        if (prepared() === current) {
          setObjects(laidOut);
        }
      },
      // A model writes unparseable diagrams often enough that the source has to stay visible —
      // otherwise the user sees an empty panel and the agent believes it answered.
      (cause: Error) => prepared() === current && setError(cause.message),
    );
  });

  const unsupported = () => {
    const current = prepared();
    return current.kind === 'unsupported'
      ? `The illustrator lays out flowcharts only; this ${current.type} is shown as its source.`
      : undefined;
  };

  return (
    <Show
      when={error() === undefined && unsupported() === undefined}
      fallback={
        <div class='p-2'>
          <p class='text-errorText text-sm'>{error() ?? unsupported()}</p>
          <pre class='mt-2 overflow-x-auto text-xs'>{props.source}</pre>
        </div>
      }
    >
      <Show when={objects()} fallback={<p class='text-description p-2 text-sm'>Laying out…</p>}>
        {(laidOut) => (
          <div class='p-2'>
            <ReactIsland component={DiagramIsland} props={{ objects: laidOut() }} />
          </div>
        )}
      </Show>
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
  <section class='border-separator bg-modalSurface shrink-0 overflow-hidden rounded border'>
    <header class='border-separator text-fg-muted flex items-center gap-2 border-b px-2 py-1 text-xs'>
      <span class='uppercase'>{props.presentation.kind}</span>
      <Show when={props.presentation.title}>{(title) => <span class='text-baseText'>{title()}</span>}</Show>
    </header>
    <Show when={props.presentation.kind === 'mermaid'}>
      <Diagram source={props.presentation.content} />
    </Show>
    <Show when={props.presentation.kind === 'graph'}>
      <ForceGraph content={props.presentation.content} />
    </Show>
    <Show when={props.presentation.kind === 'table'}>
      <Table content={props.presentation.content} />
    </Show>
    <Show when={props.presentation.kind === 'markdown'}>
      <ReactIsland component={MarkdownIsland} props={{ content: props.presentation.content }} />
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
        <button class='text-fg-muted hover:text-baseText text-xs' onClick={props.onClear}>
          clear
        </button>
      </header>
      <div ref={scroller} class='flex flex-1 flex-col gap-3 overflow-y-auto p-3'>
        <For each={props.canvas}>{(presentation) => <Panel presentation={presentation} />}</For>
      </div>
    </div>
  );
};
