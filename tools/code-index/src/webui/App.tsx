/** @jsxImportSource solid-js */
//
// Copyright 2026 DXOS.org
//

import { For, Show, createEffect, createResource, createSignal, onCleanup, onMount } from 'solid-js';

import { Canvas } from './Canvas.tsx';
import { api } from './client.ts';
import { mount } from './react/Island.ts';
import { ThreadIsland, type ThreadIslandProps } from './react/Thread.tsx';
import { currentProject, lastProject, openProject } from './routing.ts';
import { type Session, openSession } from './session.ts';

/**
 * The shell. Chat on the left, and — as soon as the agent has published anything — the canvas
 * beside it. The split is driven by the canvas being non-empty rather than by a toggle: the agent
 * is told the canvas is the only thing the user sees, so a session that has displayed something is
 * a session that should be showing it.
 */

const ToolTrace = (props: { session: Session }) => (
  <Show when={props.session.state().calls.length > 0}>
    <details class='border-separator border-t px-3 py-2 text-xs'>
      <summary class='text-description cursor-pointer'>{props.session.state().calls.length} code runs</summary>
      <For each={props.session.state().calls}>
        {(call) => (
          <div class='mt-2'>
            <pre class='bg-baseSurface overflow-x-auto rounded p-2'>{call.code.trim()}</pre>
            <Show when={call.output}>
              {(output) => (
                <pre class={`mt-1 overflow-x-auto rounded p-2 ${call.ok ? 'text-description' : 'text-errorText'}`}>
                  {output().trim()}
                </pre>
              )}
            </Show>
          </div>
        )}
      </For>
    </details>
  </Show>
);

/** The React island, kept in step with Solid's signals by re-rendering it on every change. */
const Chat = (props: { session: Session }) => {
  let container: HTMLDivElement | undefined;
  const [island, setIsland] = createSignal<ReturnType<typeof mount<ThreadIslandProps>>>();

  onMount(() => {
    if (container) {
      setIsland(mount(container, ThreadIsland));
    }
  });

  createEffect(() => {
    island()?.render({
      turns: props.session.state().turns,
      busy: props.session.busy(),
      onSend: props.session.send,
    });
  });

  onCleanup(() => island()?.dispose());

  return <div ref={container} class='dx-grow flex flex-col' />;
};

const Sidebar = (props: { current: string | undefined }) => {
  const [projects, { refetch }] = createResource(() => api.listProjects());
  const [info] = createResource(() => api.info());

  const create = async () => {
    const project = await api.createProject();
    await refetch();
    openProject(project.id);
  };

  return (
    <aside class='border-separator flex w-56 shrink-0 flex-col border-r'>
      <header class='border-separator flex items-center justify-between border-b px-3 py-2'>
        <h1 class='text-sm font-medium'>code-index</h1>
        <button class='text-description hover:text-baseText text-xs' onClick={() => void create()}>
          + new
        </button>
      </header>
      <nav class='flex-1 overflow-y-auto p-1'>
        <For each={projects()}>
          {(project) => (
            <button
              class={`block w-full truncate rounded px-2 py-1 text-left text-sm ${
                project.id === props.current ? 'bg-activeSurface' : 'hover:bg-hoverSurface'
              }`}
              onClick={() => openProject(project.id)}
            >
              {project.title}
            </button>
          )}
        </For>
      </nav>
      <Show when={info()}>
        {(server) => (
          <footer class='border-separator text-description border-t px-3 py-2 text-xs'>
            <p class='truncate'>{server().model}</p>
            <p class='truncate'>
              {server().files.toLocaleString()} files · {server().quads.toLocaleString()} quads
            </p>
          </footer>
        )}
      </Show>
    </aside>
  );
};

export const App = () => {
  // With no project in the URL, the last one this browser opened is adopted; with none of those
  // either, a fresh project is created so the page is never a dead end.
  //
  // The source is wrapped in an object because `createResource` treats a falsy source as "not
  // ready" and never calls the fetcher — and "no project in the URL" is exactly the case that has
  // work to do.
  const [resolved] = createResource(
    () => ({ fromUrl: currentProject() }),
    async ({ fromUrl }) => {
      if (fromUrl) {
        return fromUrl;
      }
      const remembered = lastProject();
      const projects = await api.listProjects();
      const chosen = projects.find((project) => project.id === remembered) ?? projects[0];
      const project = chosen ?? (await api.createProject());
      openProject(project.id, { replace: true });
      return project.id;
    },
  );

  return (
    <div class='flex h-screen'>
      <Sidebar current={resolved()} />
      {/* `keyed` is load-bearing: a different project is a different session, and re-keying is
          what disposes the old subscription and opens the new one. */}
      <Show when={resolved()} keyed fallback={<main class='text-description p-4 text-sm'>Opening…</main>}>
        {(projectId) => {
          const session = openSession(projectId);
          return (
            <main class='flex min-w-0 flex-1'>
              <div class='flex min-w-0 flex-1 flex-col'>
                <Chat session={session} />
                <ToolTrace session={session} />
              </div>
              <Show when={session.state().canvas.length > 0}>
                <div class='border-separator flex min-w-0 flex-1 border-l'>
                  <Canvas canvas={session.state().canvas} onClear={session.clearCanvas} />
                </div>
              </Show>
            </main>
          );
        }}
      </Show>
    </div>
  );
};
