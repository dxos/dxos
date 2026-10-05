/** @jsxImportSource solid-js */
//
// Copyright 2026 DXOS.org
//

import * as Result from 'effect/Result';
import { type ComponentType } from 'react';
import { type Accessor, For, Show, createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js';

import type { Scene } from '@dxos/diagram';

import * as Diagram from '../workspace/Diagram.ts';
import type * as Fold from '../workspace/Fold.ts';
import { api } from './client.ts';
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

/** The latest layout of one source: quick first for a large diagram, then final. */
type Layout = { readonly objects?: Scene.WorldObject[]; readonly final: boolean; readonly error?: string };

/** One worker for the page, started by the first diagram. */
let worker: Worker | undefined;
let requestSeq = 0;
const pending = new Map<number, (layout: Layout) => void>();

/**
 * Layouts by source, for the page's lifetime: a layout takes seconds to minutes and the same panel
 * is drawn again whenever the canvas re-renders or the project is reopened.
 */
const layouts = new Map<string, Accessor<Layout>>();

const startWorker = (): Worker => {
  const started = new Worker(new URL('./diagram.worker.ts', import.meta.url), { type: 'module' });
  started.addEventListener('message', (event: MessageEvent<Reply>) => {
    const reply = event.data;
    const update = pending.get(reply.id);
    if ('error' in reply) {
      pending.delete(reply.id);
      update?.({ final: true, error: reply.error });
    } else {
      if (reply.final) {
        pending.delete(reply.id);
      }
      update?.({ objects: reply.objects, final: reply.final });
    }
  });
  // The worker failing to load leaves no reply coming, so every waiting panel shows the failure.
  started.addEventListener('error', (event) => {
    const waiting = [...pending.values()];
    pending.clear();
    worker = undefined;
    waiting.forEach((update) => update({ final: true, error: event.message || 'The diagram worker failed to start.' }));
  });
  return started;
};

const layoutInWorker = (source: string): Accessor<Layout> => {
  const cached = layouts.get(source);
  if (cached) {
    return cached;
  }
  worker ??= startWorker();
  const id = requestSeq++;
  const [layout, setLayout] = createSignal<Layout>({ final: false });
  pending.set(id, (next) => {
    // A failure keeps the quick layout on screen if there was one, and is not remembered, so a
    // panel drawn again after a worker crash tries again.
    if (next.error !== undefined) {
      layouts.delete(source);
      setLayout((current) => (current.objects ? { ...current, final: true } : next));
    } else {
      setLayout(next);
    }
  });
  worker.postMessage({ id, source } satisfies Request);
  layouts.set(source, layout);
  return layout;
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

/** A `display.diagram` panel: its DSL source, laid out and drawn by plugin-illustrator. */
const DiagramPanel = (props: { content: string }) => {
  const read = createMemo(() => Diagram.read(props.content));
  const layout = createMemo(() => {
    const current = read();
    return Result.isSuccess(current) ? layoutInWorker(current.success)() : undefined;
  });

  // The source stays visible on failure — otherwise the user sees an empty panel and the agent
  // believes it answered.
  const failure = () => {
    const current = read();
    return Result.isFailure(current) ? current.failure.message : layout()?.objects ? undefined : layout()?.error;
  };

  return (
    <Show
      when={failure() === undefined}
      fallback={
        <div class='p-2'>
          <p class='text-errorText text-sm'>{failure()}</p>
          <pre class='mt-2 overflow-x-auto text-xs'>{props.content}</pre>
        </div>
      }
    >
      <Show when={layout()?.objects} fallback={<p class='text-description p-2 text-sm'>Laying out…</p>}>
        {(objects) => (
          <div class='p-2'>
            <ReactIsland
              component={DiagramIsland}
              props={{ objects: objects(), refining: !layout()?.final, describe: api.describe }}
            />
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
    <Show when={props.presentation.kind === 'diagram'}>
      <DiagramPanel content={props.presentation.content} />
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
