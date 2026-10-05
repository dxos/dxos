/** @jsxImportSource solid-js */
//
// Copyright 2026 DXOS.org
//

import { For, Show, createEffect, createResource, createSignal, on, onCleanup, onMount } from 'solid-js';

import * as IndexState from '../workspace/IndexState.ts';
import type * as Protocol from '../workspace/Protocol.ts';
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
      items: props.session.state().items,
      busy: props.session.busy(),
      onSend: props.session.send,
    });
  });

  onCleanup(() => island()?.dispose());

  return <div ref={container} class='dx-grow flex flex-col' />;
};

/** One session in the sidebar: opens on click; the hover button asks before deleting it. */
const ProjectRow = (props: {
  project: Protocol.ProjectRecord;
  current: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) => {
  const [confirming, setConfirming] = createSignal(false);
  return (
    <div
      data-testid='project-row'
      class={`group flex items-center rounded ${props.current ? 'bg-activeSurface' : 'hover:bg-hoverSurface'}`}
    >
      <Show
        when={confirming()}
        fallback={
          <>
            <button class='min-w-0 flex-1 truncate px-2 py-1 text-left text-sm' onClick={() => props.onOpen()}>
              {props.project.title}
            </button>
            <button
              data-testid='project-delete'
              class='text-fg-muted hover:text-baseText invisible px-2 py-1 text-xs group-hover:visible focus:visible'
              title='Delete session'
              aria-label={`Delete ${props.project.title}`}
              onClick={() => setConfirming(true)}
            >
              ✕
            </button>
          </>
        }
      >
        <div
          class='flex min-w-0 flex-1 items-center gap-2 px-2 py-1 text-xs'
          onKeyDown={(event) => event.key === 'Escape' && setConfirming(false)}
        >
          <span class='min-w-0 flex-1 truncate'>Delete session?</span>
          <button
            data-testid='project-delete-confirm'
            class='text-error-text font-medium'
            onClick={() => props.onDelete()}
          >
            Delete
          </button>
          <button class='text-fg-muted hover:text-baseText' onClick={() => setConfirming(false)}>
            Cancel
          </button>
        </div>
      </Show>
    </div>
  );
};

/** The indexer's line in the footer: a coloured dot and what it is doing. */
const IndexLine = (props: { state: IndexState.State }) => {
  const tone = () => {
    switch (props.state._tag) {
      case 'Indexing':
      case 'Starting':
        return 'text-warning-text animate-pulse';
      case 'Failed':
        return 'text-error-text';
      default:
        return 'text-success-text';
    }
  };
  return (
    <Show when={IndexState.describe(props.state)}>
      {(text) => (
        <p data-testid='index-status' class='flex items-center gap-1.5' title={text()}>
          <span class={`inline-block size-1.5 shrink-0 rounded-full bg-current ${tone()}`} />
          <span class='truncate'>{text()}</span>
        </p>
      )}
    </Show>
  );
};

const Sidebar = (props: {
  current: string | undefined;
  projects: readonly Protocol.ProjectRecord[];
  onCreate: () => void;
  onDelete: (projectId: string) => void;
}) => {
  const [status, setStatus] = createSignal<IndexState.Status>();
  // The counts move only when a pass finishes, which is what the revision says; refetched then.
  const [info] = createResource(
    () => `revision:${status()?.revision ?? -1}`,
    () => api.info(),
  );
  onCleanup(api.watchIndex(setStatus));

  return (
    <aside class='border-separator flex w-56 shrink-0 flex-col border-r'>
      <header class='border-separator flex items-center justify-between border-b px-3 py-2'>
        <h1 class='text-sm font-medium'>code-index</h1>
        <button class='text-fg-muted hover:text-baseText text-xs' onClick={() => props.onCreate()}>
          + new
        </button>
      </header>
      <nav class='flex-1 overflow-y-auto p-1'>
        <For each={props.projects}>
          {(project) => (
            <ProjectRow
              project={project}
              current={project.id === props.current}
              onOpen={() => openProject(project.id)}
              onDelete={() => props.onDelete(project.id)}
            />
          )}
        </For>
      </nav>
      <footer data-testid='footer' class='border-separator text-fg-muted border-t px-3 py-2 text-xs'>
        <Show when={info.latest}>
          {(server) => (
            <>
              <p class='truncate'>{server().model}</p>
              <p class='truncate'>
                {server().files.toLocaleString()} files · {server().quads.toLocaleString()} quads
              </p>
              {/* Wrapped so a count of 0, which `Show` treats as falsy, is still shown. */}
              <Show when={((count) => (count !== undefined ? { count } : undefined))(server().declarations)}>
                {(declarations) => <p class='truncate'>{declarations().count.toLocaleString()} declarations</p>}
              </Show>
            </>
          )}
        </Show>
        <Show when={status()}>{(current) => <IndexLine state={current().state} />}</Show>
      </footer>
    </aside>
  );
};

export const App = () => {
  const [projects, { refetch }] = createResource(() => api.listProjects());

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

  const create = async () => {
    const project = await api.createProject();
    await refetch();
    openProject(project.id);
  };

  // A deleted current session hands the page to the next one, or a fresh one if it was the last.
  const remove = async (projectId: string) => {
    await api.deleteProject(projectId);
    const remaining = (await refetch()) ?? [];
    if (projectId === resolved()) {
      const next = remaining[0] ?? (await api.createProject());
      if (remaining.length === 0) {
        await refetch();
      }
      openProject(next.id, { replace: true });
    }
  };

  return (
    <div class='flex h-screen'>
      <Sidebar
        current={resolved()}
        projects={projects.latest ?? []}
        onCreate={() => void create()}
        onDelete={(projectId) => void remove(projectId)}
      />
      {/* `keyed` is load-bearing: a different project is a different session, and re-keying is
          what disposes the old subscription and opens the new one. */}
      <Show when={resolved()} keyed fallback={<main class='text-fg-muted p-4 text-sm'>Opening…</main>}>
        {(projectId) => {
          const session = openSession(projectId);
          // A session named after its first prompt is renamed by an event in its log, not a reply.
          createEffect(
            on(
              () => session.state().title,
              () => void refetch(),
              { defer: true },
            ),
          );
          return (
            <main class='flex min-w-0 flex-1'>
              <div class='flex min-w-0 flex-1 flex-col'>
                <Chat session={session} />
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
