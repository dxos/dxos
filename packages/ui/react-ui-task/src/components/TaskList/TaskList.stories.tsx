//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Blob, Obj, Ref, Tag } from '@dxos/echo';
import { random } from '@dxos/random';
import { Card, DX_ANCHOR_ACTIVATE, DxAnchorActivate, Icon, Popover } from '@dxos/react-ui';
import { createMenuAction } from '@dxos/react-ui-menu';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { File, PullRequest, Task, TaskSet } from '@dxos/types';

import { translations } from '#translations';

import { type TaskPlacement } from './hierarchy.ts';
import { type TaskCreateHandler, TaskList } from './TaskList.tsx';

random.seed(1);

/**
 * A short activity log, oldest first, ending `minutesAgo` minutes ago — the shape
 * `Task.update`/`Task.setStatus` write, so the pane renders the same entries it would in the app.
 */
const seedHistory = (minutesAgo: number, ...descriptions: string[]): Task.HistoryEntry[] =>
  descriptions.map((description, index) => ({
    date: new Date(Date.now() - (minutesAgo + (descriptions.length - 1 - index) * 37) * 60_000).toISOString(),
    event: index === 0 ? ('created' as const) : ('updated' as const),
    actor: index % 2 === 0 ? { name: 'Rich', role: 'user' as const } : { name: 'Scout', role: 'assistant' as const },
    description,
  }));

const seedFlat = (): Task.Task[] => [
  Task.make({
    title: 'Source green coffee',
    status: 'done',
    priority: 'high',
    description:
      'Two Ethiopian lots and one Colombian, sampled before committing to a full bag. Supplier list: https://example.com/suppliers',
    history: seedHistory(
      12,
      'Created this task',
      'Assigned to Rich',
      'Status changed from todo to started',
      random.lorem.paragraph(),
    ),
  }),
  Task.make({
    title: 'Write the launch poem',
    status: 'review',
    reviewers: [{ name: 'Rich', role: 'user' }],
    artifacts: [Ref.make(Task.make({ title: 'Ode to a Coffee Bean' }))],
  }),
  Task.make({
    title: 'Finalize roast curve',
    status: 'started',
    priority: 'high',
    description:
      'Target a 12 minute development window; log every profile so the next batch can be reproduced from the notes rather than from memory.',
    // Longer than the pane shows, and all of it about the work: a text edit writes no entry, so a
    // seeded "Description updated" would be history this app never produces.
    history: seedHistory(
      3,
      'Created this task',
      'Assigned to Scout',
      'Priority changed from medium to high',
      'Status changed from todo to started',
      'Estimate set to m',
      'Unassigned',
    ),
  }),
  Task.make({
    title: 'Publish the tasting notes',
    status: 'todo',
    description:
      'Draft lives at https://github.com/dxos/dxos/pull/12752 and the preview is https://pr-12752-composer-dev.dxos.workers.dev; blocked on #12431.',
  }),
  Task.make({
    title: 'Draft launch email',
    status: 'started',
    priority: 'high',
    assignee: { role: 'assistant', name: 'Scout' },
    // Spans the cut-off: the oldest entries are past three days and read as calendar dates.
    history: seedHistory(1, 'Created this task', 'Assigned to an agent', 'Status changed from todo to started').map(
      (entry, index) =>
        index === 0 ? { ...entry, date: new Date(Date.now() - 9 * 24 * 60 * 60_000).toISOString() } : entry,
    ),
  }),
  Task.make({
    title: 'Design label',
    status: 'todo',
    assignee: { email: 'riley@example.com' },
  }),
  Task.make({
    title: 'Print run v1',
    status: 'cancelled',
  }),
];

/**
 * Ten tasks, one per row and every status represented — enough to fill the viewport, take the
 * ordinals into double digits, and put more than one task under each group heading, which a
 * seven-task list does not.
 */
/** A value when `set`, `undefined` otherwise. */
const when = <T,>(set: boolean, value: () => T): T | undefined => (set ? value() : undefined);

/**
 * Every optional field is left unset on some rows: each renders a control whether or not it holds a
 * value, so a seed that fills them all leaves the unset half of the list — the dot, the blank
 * description — with no story behind it.
 *
 * Which rows is a rule on the index rather than a coin flip: a flip can land the same way forty
 * times, and a story that only sometimes covers the state it exists for is not coverage. The moduli
 * differ per field so a row is rarely all-set or all-empty.
 */
const seedMany = (n = 40): Task.Task[] =>
  Array.from({ length: n }, (_, index) =>
    Task.make({
      title: random.lorem.sentence(random.number.int({ min: 5, max: 10 })),
      description: when(index % 2 === 0, () => random.lorem.paragraphs(1)),
      priority: when(index % 3 !== 0, () => random.helpers.arrayElement([...Task.Priority.literals])),
      estimate: when(index % 2 === 1, () => random.helpers.arrayElement([...Task.Estimate.literals])),
    }),
  );

/** Lists `children` under `parent`, which also makes it their parent (`subtasks` owns its entries). */
const adopt = (parent: Task.Task, ...children: Task.Task[]): void => {
  Obj.update(parent, (parent) => {
    parent.subtasks?.push(...children.map((child) => Ref.make(child)));
  });
};

/**
 * A full tree: every node down to `depth` has `children` sub-tasks, so the seed exercises what a
 * two-level fixture cannot — indentation compounding past the second level, a branch under a
 * branch under a branch, and enough rows at each depth to see the columns hold. Titles carry the
 * path (`2.1.3`) so a row's depth can be read off it without counting pixels, and the leaf rows
 * are listed depth-first so array order and tree order agree.
 */
const seedDeepHierarchy = (depth = 3, children = 3): Task.Task[] => {
  const tasks: Task.Task[] = [];
  const statuses: Task.Status[] = ['todo', 'started', 'done'];
  const visit = (parent: Task.Task | undefined, path: number[]) => {
    const task = Task.make({
      title: `Task ${path.join('.')} — ${random.lorem.words(random.number.int({ min: 2, max: 5 }))}`,
      status: statuses[(path.length + path[path.length - 1]) % statuses.length],
      description: when(path[path.length - 1] === 2, () => random.lorem.paragraph()),
      estimate: when(path.length === depth, () => random.helpers.arrayElement([...Task.Estimate.literals])),
    });
    if (parent) {
      adopt(parent, task);
    }
    tasks.push(task);
    if (path.length < depth) {
      for (let index = 1; index <= children; index++) {
        visit(task, [...path, index]);
      }
    }
  };
  for (let index = 1; index <= children; index++) {
    visit(undefined, [index]);
  }
  return tasks;
};

/**
 * Two roots with sub-tasks two levels deep. The flat list deliberately interleaves the two branches
 * — a list that walked it instead of the tree would render them out of order, which is the bug this
 * story exists to catch.
 */
const seedHierarchy = (): Task.Task[] => {
  const task1 = Task.make({
    title: 'Ship the spring release',
    status: 'started',
    priority: 'high',
  });
  const task2 = Task.make({
    title: 'Dial in the roast',
    status: 'todo',
  });
  const task3 = Task.make({
    title: 'Write the tasting notes',
    status: 'todo',
    description: 'One paragraph per lot, in the order they are poured.',
  });
  const task4 = Task.make({
    title: 'Sample the Ethiopian lots',
    status: 'done',
  });
  const task5 = Task.make({
    title: 'Approve the label art',
    status: 'todo',
  });
  const task6 = Task.make({
    title: 'Log every profile',
    status: 'started',
  });
  const task7 = Task.make({
    title: 'Proofread the back label',
    status: 'todo',
  });
  adopt(task1, task3, task5);
  adopt(task2, task4, task6);
  adopt(task5, task7);

  return [task1, task2, task3, task4, task5, task6, task7];
};

/**
 * The minimal shape the drop zones are reasoned about with: one parent and two children. Dragging
 * `C` leaves `A > B`, against which every landing place has to be reachable.
 */
const seedDrag = (): Task.Task[] => {
  const a = Task.make({ title: 'A', status: 'todo' });
  const b = Task.make({ title: 'B', status: 'todo' });
  const c = Task.make({ title: 'C', status: 'todo' });
  adopt(a, b, c);
  return [a, b, c];
};

/**
 * Tasks an agent stopped on to ask something: one question still open with options to pick from,
 * one open with nothing but the free-form field, and one already answered — so the three shapes a
 * question takes in a row sit side by side.
 */
const seedQuestions = (): Task.Task[] => {
  const agent = { role: 'assistant' as const, name: 'Scout' };
  const refunds = Task.make({ title: 'Draft the refund reply', status: 'started', priority: 'high', assignee: agent });
  Task.ask(refunds, {
    text: 'What is our refund window for annual plans?',
    context: 'The order is 45 days old and nothing in the project states the policy.',
    options: [
      { title: '30 days', description: 'The standard terms on the pricing page.' },
      { title: '60 days', description: 'The enterprise terms, if this customer is on them.' },
    ],
    actor: agent,
  });
  Task.setStatus(refunds, 'blocked', { actor: agent });

  const launch = Task.make({ title: 'Schedule the launch post', status: 'started', assignee: agent });
  Task.ask(launch, { text: 'Which day should the launch post go out?', actor: agent });
  Task.setStatus(launch, 'blocked', { actor: agent });

  const roast = Task.make({ title: 'Pick the house roast', status: 'started', assignee: agent });
  const roastQuestion = Task.ask(roast, {
    text: 'Light or medium for the house roast?',
    options: [{ title: 'Light' }, { title: 'Medium' }],
    actor: agent,
  });
  Task.answer(roast, roastQuestion.id, 'Medium', { actor: { name: 'Rich', role: 'user' } });

  return [refunds, launch, roast, Task.make({ title: 'Design label', status: 'todo' })];
};

/** A public CC0 clip; video is too large to generate or inline, so its blob points at it externally. */
const SAMPLE_VIDEO_URL = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm';

/** A small PNG drawn on a canvas, so the image blob carries real inline bytes without a fixture file. */
const makePngBytes = (): Uint8Array => {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 200;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#6f4e37');
    gradient.addColorStop(1, '#e0b973');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#ffffff';
    context.font = 'bold 28px sans-serif';
    context.fillText('Label v2', 24, 110);
  }
  const base64 = canvas.toDataURL('image/png').split(',')[1];
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
};

/**
 * One task per artifact kind — a GitHub pull request, an image and a video — plus a task blocked on a
 * question in its history, and one carrying all three artifacts, so a row with several tags is covered too. Media is a `File` owning a `Blob`, which is the
 * shape an uploaded attachment takes in a space.
 */
const seedArtifacts = (): Task.Task[] => {
  const pullRequest = PullRequest.make({
    owner: 'dxos',
    repo: 'dxos',
    number: 12752,
    title: 'react-ui-task: render task artifacts',
    url: 'https://github.com/dxos/dxos/pull/12752',
    state: 'open',
    author: 'scout',
    baseBranch: 'main',
    headBranch: 'task-artifacts',
    additions: 214,
    deletions: 38,
  });

  const imageBytes = makePngBytes();
  const image = File.make({
    name: 'label-v2.png',
    data: Ref.make(Blob.make({ type: 'image/png', size: imageBytes.length, data: Blob.inlineData(imageBytes) })),
  });

  const video = File.make({
    name: 'roast-timelapse.webm',
    data: Ref.make(Blob.make({ type: 'video/webm', size: 554_058, data: Blob.externalData(SAMPLE_VIDEO_URL) })),
  });

  // A question is a history entry, not an artifact: the row shows it under the title.
  const blocked = Task.make({
    title: 'Choose the launch roast',
    status: 'blocked',
    assignee: { role: 'assistant', name: 'Scout' },
  });
  Task.ask(blocked, {
    text: 'Which roast should launch first?',
    context: 'Both lots cupped well; the label and the post need one name.',
    options: [
      { title: 'Ethiopian Guji', description: 'Brighter, fruit-forward.' },
      { title: 'Colombian Huila', description: 'Rounder, chocolate notes.' },
    ],
  });

  return [
    blocked,
    Task.make({
      title: 'Render artifacts in the task list',
      status: 'review',
      priority: 'high',
      assignee: { role: 'assistant', name: 'Scout' },
      artifacts: [Ref.make(pullRequest)],
    }),
    Task.make({
      title: 'Design the new label',
      status: 'done',
      assignee: { email: 'riley@example.com' },
      artifacts: [Ref.make(image)],
    }),
    Task.make({
      title: 'Film the roast',
      status: 'started',
      artifacts: [Ref.make(video)],
    }),
    Task.make({
      title: 'Prepare the launch post',
      status: 'todo',
      description: 'Collects everything the other tasks produced.',
      artifacts: [Ref.make(pullRequest), Ref.make(image), Ref.make(video)],
    }),
  ];
};

/** A URL the browser can load for a blob: an object URL for inline bytes, the URI itself for http(s). */
const useBlobUrl = (blob: Blob.Blob | undefined): string | undefined => {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    if (blob.data._tag === 'external') {
      setUrl(/^https?:/.test(blob.data.uri) ? blob.data.uri : undefined);
      return;
    }
    // `globalThis` because the `Blob` namespace import shadows the DOM class; the copy narrows the
    // bytes to an `ArrayBuffer`-backed view, which is what `BlobPart` accepts.
    const objectUrl = URL.createObjectURL(new globalThis.Blob([new Uint8Array(blob.data.bytes)], { type: blob.type }));
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);
  return url;
};

const FilePreview = ({ file }: { file: File.File }) => {
  const blob = file.data.target;
  const url = useBlobUrl(blob);
  const type = blob?.type ?? '';
  if (!url) {
    return null;
  }
  if (type.startsWith('image/')) {
    return <img src={url} alt={file.name} className='w-full rounded-sm' data-testid='artifact-preview.image' />;
  }
  if (type.startsWith('video/')) {
    return <video src={url} controls muted className='w-full rounded-sm' data-testid='artifact-preview.video' />;
  }
  return null;
};

const iconFor = (artifact: Obj.Unknown): string =>
  PullRequest.instanceOf(artifact) ? 'ph--git-pull-request--regular' : 'ph--file--regular';

const PullRequestPreview = ({ pullRequest }: { pullRequest: PullRequest.PullRequest }) => (
  <>
    <Card.Row>
      <Card.Text variant='description'>
        {PullRequest.reference(pullRequest)} · {pullRequest.state} · {pullRequest.headBranch} → {pullRequest.baseBranch}
      </Card.Text>
    </Card.Row>
    <Card.Row>
      <Card.Text variant='description' data-testid='artifact-preview.pullRequest'>
        +{pullRequest.additions ?? 0} −{pullRequest.deletions ?? 0}
      </Card.Text>
    </Card.Row>
  </>
);

/**
 * Answers the card request an artifact tag dispatches, standing in for PreviewPlugin so the story
 * shows what each artifact is without the plugin layers. The event does not bubble, so it is caught
 * in the capture phase on `window`, as the app's own host does.
 */
const ArtifactPreviewHost = ({ artifacts, children }: PropsWithChildren<{ artifacts: Obj.Unknown[] }>) => {
  const triggerRef = useRef<HTMLElement | null>(null);
  const [artifact, setArtifact] = useState<Obj.Unknown>();
  const [open, setOpen] = useState(false);

  const handleActivate = useCallback(
    (event: Event) => {
      if (!(event instanceof DxAnchorActivate)) {
        return;
      }
      const match = artifacts.find((artifact) => String(Obj.getURI(artifact)) === event.eid);
      if (match) {
        triggerRef.current = event.trigger;
        setArtifact(match);
        setOpen(true);
      }
    },
    [artifacts],
  );

  useEffect(() => {
    window.addEventListener(DX_ANCHOR_ACTIVATE, handleActivate, true);
    return () => window.removeEventListener(DX_ANCHOR_ACTIVATE, handleActivate, true);
  }, [handleActivate]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.VirtualTrigger virtualRef={triggerRef} />
      {children}
      {artifact && (
        <Popover.Portal>
          <Popover.Content onOpenAutoFocus={(event) => event.preventDefault()}>
            <Popover.Viewport classNames='dx-card-popover-width'>
              <Card.Root border={false} data-testid='artifact-preview'>
                <Card.Header>
                  <Card.Block>
                    <Icon icon={iconFor(artifact)} />
                  </Card.Block>
                  <Card.Title>{Obj.getLabel(artifact)}</Card.Title>
                </Card.Header>
                {PullRequest.instanceOf(artifact) && <PullRequestPreview pullRequest={artifact} />}
                {Obj.instanceOf(File.File, artifact) && (
                  <Card.Row>
                    <FilePreview file={artifact} />
                  </Card.Row>
                )}
              </Card.Root>
            </Popover.Viewport>
            <Popover.Arrow />
          </Popover.Content>
        </Popover.Portal>
      )}
    </Popover.Root>
  );
};

/** The default story under a preview host that knows the seed's artifacts. */
/** {@link seedArtifacts} with tags on most rows, so tags sit beside artifact and assignee chips. */
const seedTagged = (): Task.Task[] => {
  const tags = {
    launch: Tag.make({ label: 'launch', hue: 'rose' }),
    design: Tag.make({ label: 'design', hue: 'sky' }),
    frontend: Tag.make({ label: 'frontend', hue: 'violet' }),
    content: Tag.make({ label: 'content', hue: 'lime' }),
  };
  const byTitle: Record<string, Tag.Tag[]> = {
    'Choose the launch roast': [tags.launch],
    'Render artifacts in the task list': [tags.frontend],
    'Design the new label': [tags.design, tags.launch],
    'Prepare the launch post': [tags.content, tags.launch],
  };
  const tasks = seedArtifacts();
  for (const task of tasks) {
    Obj.update(task, (task) => {
      for (const tag of byTitle[task.title] ?? []) {
        Obj.addTag(task, Ref.make(tag));
      }
      // A tagged row with a description, so the story shows the chips sitting between the two.
      if (task.title === 'Design the new label') {
        task.description = 'Two variants for the spring blend.';
      }
    });
  }
  return tasks;
};

const ArtifactsStory = (props: Parameters<typeof DefaultStory>[0]) => {
  const tasks = useMemo(() => (props.seed ?? seedArtifacts)(), [props.seed]);
  const artifacts = useMemo(
    () => [
      ...new Set(tasks.flatMap((task) => (task.artifacts ?? []).flatMap((ref) => (ref.target ? [ref.target] : [])))),
    ],
    [tasks],
  );
  const seed = useCallback(() => tasks, [tasks]);
  return (
    <ArtifactPreviewHost artifacts={artifacts}>
      <DefaultStory {...props} seed={seed} />
    </ArtifactPreviewHost>
  );
};

const DefaultStory = ({
  seed = seedFlat,
  readonly,
  draggable = false,
  checkable = false,
  hierarchical,
  groupByStatus,
  showGroupLabels,
  showOrdinals,
  showDescription = true,
  showEstimates,
  debug,
  framed = true,
  acceptFiles = false,
}: {
  /**
   * The tasks to start from. A factory rather than a named fixture, so a story can compose its own
   * (`() => seedMany(100)`) without a union to extend — and because `useState` reads its initial
   * value once, which is what made the booleans this replaces useless as live controls.
   */
  seed?: () => Task.Task[];
  readonly?: boolean;
  /** Wire `onTaskMove`, which is what turns rows into drag sources. Off unless a story asks. */
  draggable?: boolean;
  /** Wire `onTaskCheck`, which puts a checkbox in the gutter where the ordinal would sit. */
  checkable?: boolean;
  hierarchical?: boolean;
  /** Group tasks under status headers. */
  groupByStatus?: boolean;
  showGroupLabels?: boolean;
  showOrdinals?: boolean;
  showDescription?: boolean;
  showEstimates?: boolean;
  /** Paint every row's drop bands, so the zones are visible without holding a drag. */
  debug?: boolean;
  /** Insets the pane in a card, as an article does. Off for the tests that measure the pane's own
      columns against a row's, which the inset would offset. */
  framed?: boolean;
  /** Let the create pane take dropped files, recording what each create was handed. */
  acceptFiles?: boolean;
}) => {
  const [tasks, setTasks] = useState<Task.Task[]>(seed);
  // Stands in for the host's attach: the names of the files each create was handed.
  const [attached, setAttached] = useState<string[]>([]);

  // Selection is what the article wires, and what arrow-key navigation moves.
  const [selected, setSelected] = useState<string>();

  // The checked set stands in for the view state the article keys by task-set id: a set of its own,
  // so a row can be current and checked at once.
  const [checked, setChecked] = useState<ReadonlySet<string>>(() => new Set<string>());
  const handleCheck = useCallback((task: Task.Task) => {
    setChecked((checked) => {
      const next = new Set(checked);
      next.has(task.id) ? next.delete(task.id) : next.add(task.id);
      return next;
    });
  }, []);

  // Delete is an ordinary contributed action now, which is also what a plugin's own actions look like.
  const getTaskActions = useCallback(
    (task: Task.Task) => [
      createMenuAction(`delete-${task.id}`, () => handleDelete(task), {
        label: 'Delete task',
        icon: 'ph--x--regular',
        testId: 'taskList.item.delete',
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Stands in for the host: a title starting `fail` is refused, one starting `slow` lands late, and
  // store-and-attach fails for any file named `fail…`.
  const handleCreate = useCallback<TaskCreateHandler>(async ({ title, ...props }, files) => {
    if (title.startsWith('fail')) {
      return { error: new Error('Refused.') };
    }
    if (title.startsWith('slow')) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    setTasks((tasks) => [...tasks, Task.make({ title, status: 'todo', ...props })]);
    const attachable = (files ?? []).filter((file) => !file.name.startsWith('fail'));
    setAttached((attached) => [...attached, ...attachable.map((file) => `${title}:${file.name}`)]);
    return { rejectedFiles: (files ?? []).filter((file) => file.name.startsWith('fail')) };
  }, []);

  const handleUpdate = useCallback((task: Task.Task, patch: Task.Edit) => {
    Obj.update(task, (task) => {
      Object.assign(task, patch);
    });
    setTasks((tasks) => [...tasks]);
  }, []);

  const handleDelete = useCallback((task: Task.Task) => {
    setTasks((tasks) => tasks.filter(({ id }) => id !== task.id));
  }, []);

  // Stands in for the `MoveTask` verb: re-parent and reposition in one step, since that is the
  // contract the list is written against.
  const handleMove = useCallback((task: Task.Task, { parentTask, before }: TaskPlacement) => {
    const previous = Task.getParentTask(task);
    if (previous) {
      Obj.update(previous, (previous) => {
        TaskSet.removeRefsInPlace(previous.subtasks ?? [], new Set([task.id]));
      });
    }
    if (parentTask) {
      Obj.update(parentTask, (parentTask) => {
        parentTask.subtasks ??= [];
        TaskSet.insertInPlace(parentTask.subtasks, Ref.make(task), before?.id);
      });
    }
    Obj.setParent(task, parentTask ?? undefined);
    // Root order is the list's own array order, as the set's `tasks` is for the real verb.
    setTasks((tasks) => {
      const rest = tasks.filter(({ id }) => id !== task.id);
      const anchor = before ? rest.findIndex(({ id }) => id === before.id) : -1;
      return anchor === -1 ? [...rest, task] : [...rest.slice(0, anchor), task, ...rest.slice(anchor)];
    });
  }, []);

  return (
    <TaskList.Root
      debug={debug}
      tasks={tasks}
      selected={selected}
      hierarchical={hierarchical}
      groupByStatus={groupByStatus}
      showGroupLabels={showGroupLabels}
      showOrdinals={showOrdinals}
      showDescription={showDescription}
      showEstimates={showEstimates}
      getTaskActions={readonly ? undefined : getTaskActions}
      onTaskCreate={readonly ? undefined : handleCreate}
      onTaskUpdate={readonly ? undefined : handleUpdate}
      checked={checked}
      onTaskCheck={checkable ? handleCheck : undefined}
      onTaskMove={readonly || !hierarchical || !draggable ? undefined : handleMove}
      onTaskSelect={(task) => setSelected(task?.id)}
    >
      <TaskList.Viewport>
        <TaskList.Content />
      </TaskList.Viewport>
      {framed ? (
        <div className='p-2'>
          <TaskList.Editor
            showDescription={showDescription}
            acceptFiles={acceptFiles}
            classNames='bg-input-surface border border-separator rounded-md p-2'
          />
          {acceptFiles && <p data-testid='story.attached'>{attached.join(', ')}</p>}
        </div>
      ) : (
        <TaskList.Editor grid showDescription={showDescription} />
      )}
    </TaskList.Root>
  );
};

/**
 * The list beside the task's detail, as a project lays them out with its `~task` companion: the rows
 * carry each question as one line, and the detail — its own root holding just the selected task, as
 * `TaskArticle` does — carries the open ones in full, with the controls to answer them.
 */
const ListDetailStory = ({ seed = seedQuestions }: { seed?: () => Task.Task[] }) => {
  const [tasks] = useState<Task.Task[]>(seed);
  const [selected, setSelected] = useState<string | undefined>(() => tasks[0]?.id);
  const task = tasks.find(({ id }) => id === selected);

  const handleUpdate = useCallback((task: Task.Task, patch: Task.Edit) => {
    Obj.update(task, (task) => {
      Object.assign(task, patch);
    });
  }, []);

  // Stands in for the `AnswerQuestion` operation: the answer lands in the history.

  return (
    <div className='grid grid-cols-[1fr_24rem] dx-fill divide-x divide-separator dx-base-surface'>
      <div className='flex flex-col min-w-0 min-h-0' data-testid='story.list'>
        <TaskList.Root
          tasks={tasks}
          selected={selected}
          selectable
          showGroupLabels={false}
          onTaskUpdate={handleUpdate}
          onTaskSelect={(task) => setSelected(task?.id)}
        >
          <TaskList.Viewport>
            <TaskList.Content />
          </TaskList.Viewport>
        </TaskList.Root>
      </div>
      <div className='flex flex-col overflow-y-auto' data-testid='story.detail'>
        {task ? (
          <TaskList.Root tasks={[task]} selected={task.id} showDescription onTaskUpdate={handleUpdate}>
            <TaskList.Editor showDescription classNames='p-2' />
          </TaskList.Root>
        ) : (
          <p className='p-4 text-subdued'>No task selected.</p>
        )}
      </div>
    </div>
  );
};

/** The row's title cell: the grid track that the mnemonic chip and the title text share. */
const titleCell = (row: Element): HTMLElement =>
  row.querySelector<HTMLElement>('[data-testid="taskList.item.title"]')!.parentElement!;

const meta = {
  title: 'ui/react-ui-task/TaskList',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A list long enough to scroll, group and number into double digits. */
export const ManyTasks: Story = {
  args: {
    seed: seedMany,
    showEstimates: true,
    showDescription: true,
    showOrdinals: true,
  },
};

export const Readonly: Story = {
  args: {
    readonly: true,
  },
};

export const WithoutGroupLabels: Story = {
  args: {
    showGroupLabels: false,
  },
};

export const WithOrdinals: Story = {
  args: {
    showGroupLabels: false,
    showOrdinals: true,
  },
};

/** The gutter's checkbox: the set an action acts on, in place of the ordinal that would sit there. */
export const WithCheckboxes: Story = {
  args: {
    checkable: true,
    showGroupLabels: false,
  },
};

export const WithDescriptions: Story = {
  args: {
    showGroupLabels: false,
    showOrdinals: true,
    showDescription: true,
  },
};

export const WithQuestions: Story = {
  args: {
    seed: seedQuestions,
    showGroupLabels: false,
  },
};

/**
 * A task's questions live on the detail surface, not in the list: a row carries its title and its
 * description, and the strip below carries the fields. Answering is `TaskArticle`'s, and is covered
 * where it happens — plugin-projects' `ProjectArticle` › Task Detail story.
 */
export const TestNoQuestionsInList: Story = {
  args: {
    seed: seedQuestions,
    showGroupLabels: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The seeded tasks all carry questions, answered and open alike.
    await expect(canvas.findByText('Draft the refund reply', undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await expect(canvas.findByText('Pick the house roast', undefined, { timeout: 10_000 })).resolves.toBeTruthy();

    // None of it reaches the rows: no question line, no answer line, and nothing to answer with.
    await expect(canvasElement.querySelector('[data-testid="task-question"]')).toBeNull();
    await expect(canvasElement.querySelector('[data-testid="task-question.answer"]')).toBeNull();
    await expect(canvasElement.querySelector('[data-testid="task-question.option"]')).toBeNull();
    // Nor does the log: the strip below the rows is the fields.
    await expect(canvasElement.querySelector('[data-testid="taskList.history"]')).toBeNull();

    // Selecting a row opens it for editing, and still shows neither.
    await userEvent.click(canvas.getByText('Draft the refund reply'));
    await waitFor(async () => {
      await expect(canvasElement.querySelector('[data-testid="taskList.edit.title"]')).not.toBeNull();
    });
    await expect(canvasElement.querySelector('[data-testid="task-question"]')).toBeNull();
    await expect(canvasElement.querySelector('[data-testid="taskList.history"]')).toBeNull();
  },
};

export const TestListAndDetail: Story = {
  decorators: [withLayout({ layout: 'fullscreen' })],
  render: () => <ListDetailStory />,
  play: async ({ canvasElement }) => {
    const list = () => canvasElement.querySelector<HTMLElement>('[data-testid="story.list"]');
    const detail = () => canvasElement.querySelector<HTMLElement>('[data-testid="story.detail"]');

    // The detail pane edits the selected task: its title is a field, not a line of text.
    await waitFor(async () => {
      await expect(detail()?.querySelector('[data-testid="taskList.edit.title"]')).not.toBeNull();
    });
    await expect(detail()?.querySelector<HTMLInputElement>('[data-testid="taskList.edit.title"]')?.value).toEqual(
      'Draft the refund reply',
    );

    // Neither side carries the task's questions or its log — both belong to the article surface,
    // which is what a host mounts in place of this strip when it has the room for them.
    for (const pane of [list(), detail()]) {
      await expect(pane?.querySelector('[data-testid="task-question"]')).toBeNull();
      await expect(pane?.querySelector('[data-testid="taskList.history"]')).toBeNull();
    }
  },
};

/** A single-task list whose description runs past the row's three-line clamp. */
const seedDescription = (description: string) => () => [
  Task.make({ title: 'Plan the cupping', status: 'todo', description }),
];

/**
 * The row shows exactly three whole lines of the description and no sliver of a fourth: the box is
 * three line-heights tall, and every line of text is wholly inside it or wholly below it.
 */
const assertDescriptionClamp: Story['play'] = async ({ canvasElement }) => {
  const description = await waitFor(() => {
    const found = canvasElement.querySelector<HTMLElement>('[data-testid="taskList.item.description"]');
    if (!found) {
      throw new Error('Task description not rendered.');
    }
    return found;
  });

  const lineHeight = parseFloat(getComputedStyle(description).lineHeight);
  const box = description.getBoundingClientRect();
  await expect(description.scrollHeight).toBeGreaterThan(description.clientHeight);
  await expect(Math.abs(box.height - lineHeight * 3)).toBeLessThan(1);

  // Text rects only: an element's border box spans its padding, which is not a line of text.
  const walker = document.createTreeWalker(description, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim()) {
      continue;
    }
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) {
      const inside = rect.bottom <= box.bottom + 0.5;
      const outside = rect.top >= box.bottom - 0.5;
      await expect(inside || outside).toBe(true);
    }
  }
};

/** Every block the default renderer pads or rescales — heading, code, quote, list — inside the clamp. */
export const TestDescriptionClamp: Story = {
  args: {
    seed: seedDescription(
      [
        '# Cupping plan',
        '',
        '```',
        'roast --profile city',
        '```',
        '',
        '> Book the roaster first.',
        '',
        '- Ethiopian Guji',
        '- Colombian Huila',
      ].join('\n'),
    ),
    showGroupLabels: false,
  },
  play: assertDescriptionClamp,
};

/** A paragraph run into a list, so the clamp falls between two list items. */
export const TestDescriptionClampList: Story = {
  args: {
    seed: seedDescription(
      [
        'Line up the samples before the roaster is booked.',
        '',
        '- Ethiopian Guji',
        '- Colombian Huila',
        '- Kenyan Nyeri',
        '- Sumatra Mandheling',
      ].join('\n'),
    ),
    showGroupLabels: false,
  },
  play: assertDescriptionClamp,
};

export const Hierarchical: Story = {
  args: {
    seed: seedHierarchy,
    hierarchical: true,
    showDescription: true,
  },
};

/** Three levels of three: indentation past the second level, and the columns holding at every depth. */
export const DeepHierarchy: Story = {
  args: {
    seed: () => seedDeepHierarchy(3, 3),
    draggable: true,
    hierarchical: true,
    showOrdinals: true,
    showEstimates: true,
    showDescription: true,
  },
};

/** Rows are drag sources: `onTaskMove` is wired, so the tree publishes each row to pragmatic-dnd. */
export const HierarchicalDraggable: Story = {
  args: {
    seed: seedHierarchy,
    hierarchical: true,
    draggable: true,
    showDescription: true,
  },
};

/** The drop bands painted on every row, so the zones can be seen without holding a drag. */
export const DragDebug: Story = {
  args: {
    seed: seedHierarchy,
    hierarchical: true,
    draggable: true,
    showOrdinals: true,
    showDescription: true,
    debug: true,
    framed: false,
  },
};

/**
 * The minimal `A > B, C` shape TREE.md reasons the six landing places about, with the bands painted.
 * Small enough that every zone is reachable without scrolling, which is what makes it the fixture to
 * check a hitbox change against.
 */
export const DropZones: Story = {
  args: {
    seed: seedDrag,
    hierarchical: true,
    draggable: true,
    showDescription: false,
    debug: true,
    framed: false,
  },
};

/**
 * Status groups rendered through the tree: headers are `disposition: 'group'` nodes, spliced out of
 * the collection's topology so the keyboard never lands on one.
 */
export const GroupedTree: Story = {
  args: {
    seed: seedHierarchy,
    hierarchical: true,
    groupByStatus: true,
    showGroupLabels: true,
    showOrdinals: true,
  },
};

/**
 * The status glyph spins for a task an agent has taken and started — and only then.
 *
 * Both halves matter: `started` alone is a person working, and an agent assignee alone is work that
 * is queued. The seed carries one of each, so a rule that dropped either half fails here.
 */
export const TestAgentSpinner: Story = {
  args: {
    showGroupLabels: false,
  },
  play: async ({ canvasElement }) => {
    const spinning = () =>
      [...canvasElement.querySelectorAll<HTMLElement>('[data-testid="taskList.item"]')]
        .filter((row) => row.querySelector('[data-testid="taskList.item.status"] .animate-spin'))
        .map((row) => row.querySelector('[data-testid="taskList.item.title"]')?.textContent ?? '');

    await waitFor(async () => expect(spinning()).toEqual(['Draft launch email']), { timeout: 10_000 });
  },
};

/**
 * A long artifact tag cannot squeeze the title: the chips run on their own line under it, and the
 * title keeps the row's width.
 */
export const TestLongArtifactTag: Story = {
  args: {
    showGroupLabels: false,
    seed: () => [
      Task.make({
        title: 'Finish the third-party DNS delegation that has blocked ACME automation',
        status: 'started',
        assignee: { role: 'assistant' },
        artifacts: [Ref.make(Task.make({ title: 'Certificate renewal automation — implementation plan' }))],
      }),
    ],
  },
  play: async ({ canvasElement }) => {
    const row = await waitFor(
      async () => {
        const row = canvasElement.querySelector<HTMLElement>('[data-testid="taskList.item"]');
        await expect(row).toBeTruthy();
        return row!;
      },
      { timeout: 10_000 },
    );
    const title = row.querySelector<HTMLElement>('span.truncate')!;
    const chips = row.querySelector<HTMLElement>('[data-testid="taskList.item.chips"]')!;
    await waitFor(async () => {
      await expect(chips.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        title.getBoundingClientRect().bottom - 0.5,
      );
      await expect(title.getBoundingClientRect().width).toBeGreaterThan(row.getBoundingClientRect().width / 2);
    });
  },
};

/**
 * Tasks whose artifacts are a GitHub pull request, an image and a video (each a `File` owning a
 * `Blob`), beside a task blocked on a question in its history. Clicking a tag opens a preview of the
 * artifact it names.
 */
export const WithArtifacts: Story = {
  render: ArtifactsStory,
  args: {
    seed: seedArtifacts,
    showGroupLabels: false,
    showDescription: true,
  },
};

/**
 * Tags render as chips with the task's artifacts — a line of their own under the title, starting
 * where the title cell does and above the description — while the assignee stays on the title line,
 * right-aligned before the trailing controls.
 */
export const WithTags: Story = {
  render: ArtifactsStory,
  args: {
    seed: seedTagged,
    showGroupLabels: false,
    showDescription: true,
  },
  play: async ({ canvasElement }) => {
    await waitFor(async () => {
      await expect(canvasElement.querySelectorAll('[data-testid="taskList.item.tag"]')).toHaveLength(6);
    });

    const rows = [...canvasElement.querySelectorAll<HTMLElement>('[data-testid="taskList.item"]')];
    const tagged = rows.filter((row) => row.querySelector('[data-testid="taskList.item.tag"]'));
    await expect(tagged.length).toBeGreaterThan(0);
    for (const row of tagged) {
      const title = titleCell(row).getBoundingClientRect();
      const chips = row.querySelector<HTMLElement>('[data-testid="taskList.item.chips"]');
      await expect(chips).toBeTruthy();
      const box = chips!.getBoundingClientRect();
      await expect(box.top).toBeGreaterThanOrEqual(title.bottom - 0.5);
      await expect(Math.abs(box.left - title.left)).toBeLessThan(1);
      const description = row.querySelector<HTMLElement>('[data-testid="taskList.item.description"]');
      if (description) {
        await expect(description.getBoundingClientRect().top).toBeGreaterThanOrEqual(box.bottom - 0.5);
      }
    }
    await expect(tagged.some((row) => row.querySelector('[data-testid="taskList.item.description"]'))).toBe(true);

    const assigned = rows.filter((row) => row.querySelector('[data-testid="taskList.item.assignee"]'));
    await expect(assigned.length).toBeGreaterThan(0);
    for (const row of assigned) {
      const assignee = row.querySelector<HTMLElement>('[data-testid="taskList.item.assignee"]')!;
      await expect(
        row.querySelector('[data-testid="taskList.item.chips"] [data-testid="taskList.item.assignee"]'),
      ).toBeNull();
      const title = titleCell(row).getBoundingClientRect();
      const box = assignee.getBoundingClientRect();
      const centre = (rect: DOMRect) => rect.top + rect.height / 2;
      // On the title's line, after it, and flush against the trailing controls.
      await expect(Math.abs(centre(box) - centre(title))).toBeLessThan(2);
      await expect(box.left).toBeGreaterThanOrEqual(title.right - 0.5);
      const priority = row
        .querySelector<HTMLElement>('[data-testid="taskList.item.priority"]')!
        .getBoundingClientRect();
      await expect(priority.left - box.right).toBeLessThan(40);
    }

    // A row with nothing to show as a chip holds no empty line for them.
    const untagged = rows.find(
      (row) =>
        !row.querySelector('[data-testid="taskList.item.chips"] > *') &&
        !row.querySelector('[data-testid="taskList.item.description"]'),
    );
    if (untagged) {
      await expect(Math.round(untagged.getBoundingClientRect().height)).toBeLessThanOrEqual(
        Math.round(titleCell(untagged).getBoundingClientRect().height) + 8,
      );
    }
  },
};

/** Each artifact kind opens its own preview: the pull request's summary, the image, the video. */
export const TestArtifactPreviews: Story = {
  render: ArtifactsStory,
  args: {
    seed: seedArtifacts,
    showGroupLabels: false,
    showDescription: true,
  },
  play: async ({ canvasElement }) => {
    const findTag = (label: string) =>
      [...canvasElement.querySelectorAll<HTMLElement>('[data-testid="taskList.item.chips"] *')].find(
        (element) => element.textContent === label,
      );
    const preview = () => document.querySelector<HTMLElement>('[data-testid="artifact-preview"]');

    const open = async (label: string, testId: string) => {
      const tag = await waitFor(
        async () => {
          const tag = findTag(label);
          if (!tag) {
            throw new Error(`Artifact tag not found: ${label}`);
          }
          return tag;
        },
        { timeout: 10_000 },
      );
      await userEvent.click(tag);
      await waitFor(async () => expect(preview()?.querySelector(`[data-testid="${testId}"]`)).toBeTruthy(), {
        timeout: 5_000,
      });
      await expect(preview()?.textContent).toContain(label);
      await userEvent.keyboard('{Escape}');
      await waitFor(async () => expect(preview()).toBeNull());
    };

    // The pull request's tag is its `#number` pill; the preview names it by its full reference.
    await open('#12752', 'artifact-preview.pullRequest');
    await open('label-v2.png', 'artifact-preview.image');
    await open('roast-timelapse.webm', 'artifact-preview.video');
  },
};

/**
 * Checking is selection, not a status write, and it is not the current row either: the box toggles
 * independently of which row the reader is on, and leaves the task's status alone.
 */
export const TestCheckboxSelection: Story = {
  args: {
    checkable: true,
    showGroupLabels: false,
    showOrdinals: true,
  },
  play: async ({ canvasElement }) => {
    const boxes = () =>
      Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-testid="taskList.item.checkbox"]'));
    const statuses = () =>
      Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-testid="taskList.item.status"]')).map(
        (status) => status.querySelector('.sr-only')?.textContent,
      );

    await waitFor(async () => expect(boxes().length).toBeGreaterThan(1));
    // Checkbox and ordinal are mutually exclusive: the box takes the gutter cell, so no row numbers.
    await expect(canvasElement.querySelectorAll('.tabular-nums').length).toBe(0);

    const before = statuses();
    await userEvent.click(boxes()[0]);
    await waitFor(async () => expect(boxes()[0].getAttribute('data-state')).toBe('checked'));
    // A second row checks alongside the first — a set, not a single selection.
    await userEvent.click(boxes()[1]);
    await waitFor(async () => expect(boxes()[1].getAttribute('data-state')).toBe('checked'));
    await expect(boxes()[0].getAttribute('data-state')).toBe('checked');

    // Selection only: checking two rows moved no task's status, which is what the status control
    // is for.
    await expect(statuses()).toEqual(before);

    // Toggles off.
    await userEvent.click(boxes()[0]);
    await waitFor(async () => expect(boxes()[0].getAttribute('data-state')).toBe('unchecked'));
  },
};

export const TestEdit: Story = {
  args: {
    showGroupLabels: false,
    showOrdinals: true,
  },
  // The pane is the detail half: it creates when nothing is selected and edits the selection
  // otherwise, which is the whole reason editing moved out of the row.
  play: async ({ canvasElement }) => {
    const pane = canvasElement.querySelector<HTMLElement>('[data-testid="taskList.edit"]');
    if (!pane) {
      throw new Error('Task edit pane not found.');
    }
    const title = () => {
      const input = pane.querySelector<HTMLInputElement>('[data-testid="taskList.edit.title"]');
      if (!input) {
        throw new Error('Task edit title input not found.');
      }
      return input;
    };
    const description = () => pane.querySelector<HTMLElement>('[data-testid="taskList.edit.description"]');
    const requireDescription = () => {
      const element = description();
      if (!element) {
        throw new Error('Task description editor not found.');
      }
      return element;
    };
    const rows = () => Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-testid="taskList.item"]'));

    // Nothing selected: the pane creates. Its description belongs to the task being created, so it
    // starts empty rather than absent (see `TestCreateWithDescription`).
    await expect(title().value).toEqual('');
    await waitFor(async () => expect(description()).not.toBeNull());

    // ...and offers no Save/Cancel: with nothing typed there is nothing to save and nothing to
    // cancel, and two dead controls read as a form to fill in rather than a place to type.
    const save = () => pane.querySelector<HTMLElement>('[data-testid="taskList.edit.save"]');
    await expect(save()).toBeNull();
    await userEvent.click(title());
    await userEvent.keyboard('Something');
    await waitFor(async () => expect(save()).not.toBeNull());
    await userEvent.clear(title());
    await waitFor(async () => expect(save()).toBeNull());

    // A half-typed title that loses focus creates nothing: leaving the field is not a decision to
    // add a task. Enter and Save are the deliberate acts, and they still work.
    const before = rows().length;
    await userEvent.click(title());
    await userEvent.keyboard('Stray');
    await expect(title().value).toEqual('Stray');
    // Tab rather than `blur()`: a real focus move is what a reader does, and what React's delegated
    // focusout listens for.
    await userEvent.tab();
    await waitFor(async () => expect(title()).not.toEqual(document.activeElement));
    await expect(rows()).toHaveLength(before);
    await userEvent.clear(title());

    // Selecting a task fills the pane with it.
    const first = rows()[0];
    const firstTitleElement = first.querySelector('[data-testid="taskList.item.title"]');
    if (!firstTitleElement) {
      throw new Error('Task title element not found.');
    }
    const firstTitle = firstTitleElement.textContent;
    first.click();
    await waitFor(async () => expect(title().value).toEqual(firstTitle));
    await waitFor(async () => expect(description()).not.toBeNull());

    // Escape gives the reader a way back out: the selection clears and the pane returns to creating.
    first.focus();
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await waitFor(async () => expect(title().value).toEqual(''));
    await expect(canvasElement.querySelectorAll('[aria-selected="true"]')).toHaveLength(0);

    // Re-select for the remaining assertions.
    first.click();
    await waitFor(async () => expect(description()).not.toBeNull());

    // The description is a markdown editor, held open — the pane IS the editor, so there is nothing
    // to click into.
    await waitFor(async () => expect(requireDescription().querySelector('.cm-content')).not.toBeNull());

    // ...and its text starts where the title's does. CodeMirror insets its own content, which would
    // otherwise sit the description further in than the field above it.
    const left = (element: Element) => Math.round(element.getBoundingClientRect().left);
    const descriptionLine = requireDescription().querySelector('.cm-line');
    if (!descriptionLine) {
      throw new Error('Description editor line not found.');
    }
    await expect(left(descriptionLine)).toEqual(left(title()));

    // Tab moves from the title into the description's TEXT. The editor otherwise puts its tab stop
    // on a wrapper that needs a further Enter to get into, so the caret was two keys away.
    title().focus();
    await userEvent.tab();
    await waitFor(async () =>
      expect(document.activeElement).toEqual(requireDescription().querySelector('.cm-content')),
    );

    // ...and Tab leaves again rather than indenting, so the field is not a trap.
    await userEvent.tab();
    await waitFor(async () => expect(requireDescription().contains(document.activeElement)).toBeFalsy());

    // Save writes the pending description and leaves, dropping the pane back to creating.
    const content = () => {
      const cmContent = requireDescription().querySelector<HTMLElement>('.cm-content');
      if (!cmContent) {
        throw new Error('Description editor content not found.');
      }
      return cmContent;
    };
    const text = () => content().textContent ?? '';
    await userEvent.click(content());
    await userEvent.keyboard(' KEEP');
    const saveButton = pane.querySelector<HTMLElement>('[data-testid="taskList.edit.save"]');
    if (!saveButton) {
      throw new Error('Task edit save button not found.');
    }
    await userEvent.click(saveButton);
    await waitFor(async () => expect(title().value).toEqual(''));
    await expect(canvasElement.querySelectorAll('[aria-selected="true"]')).toHaveLength(0);
    // The pane is creating again, so the field it kept is the new task's and holds none of the
    // edited one's text.
    await expect(text()).not.toContain('KEEP');

    // Cancel leaves the same way but throws the pending edit away. The buttons must not take focus:
    // the fields commit on blur, so a Cancel that stole focus would have written the very text it is
    // meant to discard — as would the blur that tearing the editor down fires.
    rows()[0].click();
    await waitFor(async () => expect(description()).not.toBeNull());
    await userEvent.click(content());
    await userEvent.keyboard(' THROW');
    const cancelButton = pane.querySelector<HTMLElement>('[data-testid="taskList.edit.cancel"]');
    if (!cancelButton) {
      throw new Error('Task edit cancel button not found.');
    }
    await userEvent.click(cancelButton);
    await waitFor(async () => expect(title().value).toEqual(''));
    await expect(canvasElement.querySelectorAll('[aria-selected="true"]')).toHaveLength(0);

    // ...so what Save wrote survived and what Cancel discarded did not.
    rows()[0].click();
    await waitFor(async () => expect(description()).not.toBeNull());
    await waitFor(async () => expect(text()).toContain('KEEP'));
    await expect(text()).not.toContain('THROW');
  },
};

/**
 * Creating with a description: the pane's description field is present with nothing selected, and
 * what is typed into it reaches `onTaskCreate` as part of the same draft as the title.
 */
/**
 * A create the host refuses keeps the draft, so nothing typed is lost; one that lands late does not
 * clear text typed while it was pending.
 */
export const TestCreateFailureKeepsDraft: Story = {
  args: {
    showGroupLabels: false,
  },
  play: async ({ canvasElement }) => {
    const pane = canvasElement.querySelector<HTMLElement>('[data-testid="taskList.edit"]')!;
    const title = () => pane.querySelector<HTMLInputElement>('[data-testid="taskList.edit.title"]')!;
    const titles = () =>
      [...canvasElement.querySelectorAll('[data-testid="taskList.item.title"]')].map((element) => element.textContent);

    await userEvent.click(title());
    await userEvent.keyboard('fail to file{Enter}');
    await new Promise((resolve) => setTimeout(resolve, 200));
    await expect(title().value).toEqual('fail to file');
    await expect(titles()).not.toContain('fail to file');

    await userEvent.clear(title());
    await userEvent.keyboard('slow to land{Enter}');
    await userEvent.keyboard(' and more');
    await waitFor(async () => expect(titles()).toContain('slow to land'), { timeout: 5_000 });
    await expect(title().value).toEqual('slow to land and more');
  },
};

/**
 * Files dropped on the create pane are held there, one chip each, until the task is created — then
 * they are handed over with it, for the host to store and attach. A chip can be taken back first.
 */
export const TestCreateWithAttachments: Story = {
  args: {
    showGroupLabels: false,
    acceptFiles: true,
  },
  play: async ({ canvasElement }) => {
    const pane = canvasElement.querySelector<HTMLElement>('[data-testid="taskList.edit"]')!;
    const title = () => pane.querySelector<HTMLInputElement>('[data-testid="taskList.edit.title"]')!;
    const chips = () => [...pane.querySelectorAll<HTMLElement>('[data-testid="taskList.edit.file"]')];

    const dataTransfer = new DataTransfer();
    for (const name of ['notes.txt', 'draft.txt']) {
      dataTransfer.items.add(new globalThis.File(['text'], name, { type: 'text/plain' }));
    }
    for (const type of ['dragenter', 'dragover', 'drop']) {
      pane.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer }));
    }
    await waitFor(async () =>
      expect(chips().map((chip) => chip.querySelector('[data-testid="taskList.edit.file.name"]')?.textContent)).toEqual(
        ['notes.txt', 'draft.txt'],
      ),
    );

    await userEvent.click(chips()[1].querySelector<HTMLElement>('button')!);
    await waitFor(async () => expect(chips()).toHaveLength(1));

    await userEvent.click(title());
    await userEvent.keyboard('Read the notes{Enter}');
    await waitFor(async () =>
      expect(canvasElement.querySelector('[data-testid="story.attached"]')).toHaveTextContent(
        'Read the notes:notes.txt',
      ),
    );
    // Handed over with the task, so the pane starts the next one empty.
    await waitFor(async () => expect(chips()).toHaveLength(0));

    // A file the host could not attach stays on the pane, so it is not lost and can be retried.
    const failing = new DataTransfer();
    failing.items.add(new globalThis.File(['text'], 'fail.txt', { type: 'text/plain' }));
    failing.items.add(new globalThis.File(['text'], 'plan.txt', { type: 'text/plain' }));
    for (const type of ['dragenter', 'dragover', 'drop']) {
      pane.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: failing }));
    }
    await waitFor(async () => expect(chips()).toHaveLength(2));
    await userEvent.click(title());
    await userEvent.keyboard('Plan the week{Enter}');
    await waitFor(async () =>
      expect(canvasElement.querySelector('[data-testid="story.attached"]')).toHaveTextContent('Plan the week:plan.txt'),
    );
    await waitFor(async () =>
      expect(chips().map((chip) => chip.querySelector('[data-testid="taskList.edit.file.name"]')?.textContent)).toEqual(
        ['fail.txt'],
      ),
    );
  },
};

export const TestCreateWithDescription: Story = {
  args: {
    showGroupLabels: false,
    showDescription: true,
  },
  play: async ({ canvasElement }) => {
    const pane = canvasElement.querySelector<HTMLElement>('[data-testid="taskList.edit"]')!;
    const title = () => pane.querySelector<HTMLInputElement>('[data-testid="taskList.edit.title"]')!;
    const description = () => pane.querySelector<HTMLElement>('[data-testid="taskList.edit.description"]');
    const rows = () => Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-testid="taskList.item"]'));

    // Nothing selected, and the field is there anyway — a new task can be given a description.
    await expect(title().value).toEqual('');
    await waitFor(async () => expect(description()).not.toBeNull());
    const content = () => description()!.querySelector<HTMLElement>('.cm-content')!;
    await waitFor(async () => expect(content()).not.toBeNull());

    // Type the description FIRST, then the title, and create from the title with Enter — the field
    // is still held open at that point, so the create is what has to commit it.
    const before = rows().length;
    await userEvent.click(content());
    await userEvent.keyboard('Roast it twice');
    await userEvent.click(title());
    await userEvent.keyboard('New task{Enter}');

    await waitFor(async () => expect(rows()).toHaveLength(before + 1));
    // Found by title, not by position: the list groups by status, so a new todo lands in its group
    // rather than at the end.
    const created = rows().find((row) => row.textContent?.includes('New task'));
    await expect(created).not.toBeUndefined();
    await expect(created!.textContent).toContain('Roast it twice');

    // ...and the pane resets, so the next task does not inherit the last one's description. The
    // field is not empty-stringed: CodeMirror paints the placeholder inside `.cm-content`.
    await expect(title().value).toEqual('');
    await waitFor(async () => expect(content().textContent).not.toContain('Roast it twice'));
  },
};

/**
 * A description typed while creating, then abandoned by selecting a row, must not ride along into
 * the NEXT task created. The field remounts empty on the way back, but committing an already-empty
 * field never calls back — so the mirror the create reads has to be cleared with the selection.
 */
export const TestAbandonedDescriptionDoesNotLeak: Story = {
  args: {
    showGroupLabels: false,
    showDescription: true,
  },
  play: async ({ canvasElement }) => {
    const pane = canvasElement.querySelector<HTMLElement>('[data-testid="taskList.edit"]')!;
    const title = () => pane.querySelector<HTMLInputElement>('[data-testid="taskList.edit.title"]')!;
    const description = () => pane.querySelector<HTMLElement>('[data-testid="taskList.edit.description"]');
    const content = () => description()!.querySelector<HTMLElement>('.cm-content')!;
    const rows = () => Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-testid="taskList.item"]'));

    await waitFor(async () => expect(content()).not.toBeNull());

    // Type a description with no title, then commit it by leaving the field — nothing is created,
    // but the create row's mirror now holds the text.
    await userEvent.click(content());
    await userEvent.keyboard('LEAKED');
    await userEvent.click(title());

    // Select a row and come back out: the pane is creating again, with an empty field.
    const first = rows()[0];
    first.click();
    await waitFor(async () => expect(title().value).not.toEqual(''));
    // The row's own state, not just the pane's: the pane follows the selection a commit earlier, and
    // `Escape` is answered by the list, so pressing it before the row reports selected does nothing.
    await waitFor(async () => expect(first.getAttribute('aria-selected')).toEqual('true'));
    first.focus();
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await waitFor(async () => expect(title().value).toEqual(''));

    // Create with a title alone. The abandoned description must not be attached to it.
    const before = rows().length;
    await userEvent.click(title());
    await userEvent.keyboard('Clean task{Enter}');
    await waitFor(async () => expect(rows()).toHaveLength(before + 1));
    const created = rows().find((row) => row.textContent?.includes('Clean task'));
    await expect(created).not.toBeUndefined();
    await expect(created!.textContent).not.toContain('LEAKED');
  },
};

/**
 * Cmd/Ctrl-Enter in the description saves, as the Save button does: for an edit it writes the
 * pending text and leaves, and for a create it adds the task — without CodeMirror inserting a line
 * first. With no title to create from, the key does nothing.
 */
export const TestSaveDescriptionWithModEnter: Story = {
  args: {
    showGroupLabels: false,
    showDescription: true,
  },
  play: async ({ canvasElement }) => {
    const found = <T extends Element>(element: T | null | undefined, name: string): T => {
      if (!element) {
        throw new Error(`${name} not found.`);
      }
      return element;
    };
    const pane = found(canvasElement.querySelector<HTMLElement>('[data-testid="taskList.edit"]'), 'Edit pane');
    const title = () => found(pane.querySelector<HTMLInputElement>('[data-testid="taskList.edit.title"]'), 'Title');
    const content = () =>
      found(pane.querySelector<HTMLElement>('[data-testid="taskList.edit.description"] .cm-content'), 'Description');
    const rows = () => Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-testid="taskList.item"]'));

    await waitFor(async () => expect(rows().length).toBeGreaterThan(0));

    // Editing: Cmd-Enter writes the description and drops the pane back to creating.
    const first = rows()[0];
    first.click();
    await waitFor(async () => expect(first.getAttribute('aria-selected')).toEqual('true'));
    const lines = () => content().querySelectorAll('.cm-line').length;
    await userEvent.click(content());
    const linesBefore = lines();
    await userEvent.keyboard(' SAVED{Meta>}{Enter}{/Meta}');
    await waitFor(async () => expect(title().value).toEqual(''));
    await expect(canvasElement.querySelectorAll('[aria-selected="true"]')).toHaveLength(0);
    first.click();
    await waitFor(async () => expect(content().textContent).toContain('SAVED'));
    // No line was inserted: the save binding outranks the markdown keymap's own Mod-Enter.
    await expect(lines()).toEqual(linesBefore);
    first.focus();
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await waitFor(async () => expect(title().value).toEqual(''));

    // Creating: Ctrl-Enter (the binding off macOS) adds the task with its description.
    const before = rows().length;
    await userEvent.click(title());
    await userEvent.keyboard('Keyed task');
    await userEvent.click(content());
    await userEvent.keyboard('From the keyboard{Control>}{Enter}{/Control}');
    await waitFor(async () => expect(rows()).toHaveLength(before + 1));
    const created = found(
      rows().find((row) => row.textContent?.includes('Keyed task')),
      'Created row',
    );
    await expect(created.textContent).toContain('From the keyboard');
    await expect(title().value).toEqual('');

    // With no title there is nothing to create: the key does nothing, but still inserts no line.
    const count = rows().length;
    await userEvent.click(content());
    const untitledLines = lines();
    await userEvent.keyboard('Untitled{Control>}{Enter}{/Control}{Meta>}{Enter}{/Meta}');
    await expect(rows()).toHaveLength(count);
    await expect(content().textContent).toContain('Untitled');
    await expect(lines()).toEqual(untitledLines);
  },
};

/**
 * With `showDescription` off the pane is title-only, even for a selected task the list can update —
 * which is what a host with no room for a markdown field (the chat strip) renders.
 */
export const TestEditWithoutDescription: Story = {
  args: {
    showGroupLabels: false,
    showDescription: false,
  },
  play: async ({ canvasElement }) => {
    const pane = canvasElement.querySelector<HTMLElement>('[data-testid="taskList.edit"]')!;
    const title = () => pane.querySelector<HTMLInputElement>('[data-testid="taskList.edit.title"]')!;
    const description = () => pane.querySelector<HTMLElement>('[data-testid="taskList.edit.description"]');
    const rows = () => Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-testid="taskList.item"]'));

    const first = rows()[0];
    const firstTitle = first.querySelector('[data-testid="taskList.item.title"]')!.textContent;
    first.click();

    // The task IS selected — the title proves the pane followed the selection — and the description
    // is still absent, so its absence is the prop and not a pane that failed to select.
    await waitFor(async () => expect(title().value).toEqual(firstTitle));
    await expect(description()).toBeNull();

    // Editing still works without it: the pane is title-only, not read-only.
    await userEvent.click(title());
    await userEvent.keyboard(' EDITED');
    await userEvent.tab();
    await waitFor(async () => expect(first.textContent).toContain('EDITED'));
  },
};

/**
 * `Tab` indents the focused task under its previous sibling and `Shift+Tab` outdents it to follow its
 * parent — the outliner keys — and `Shift+ArrowUp`/`Down` move it among its siblings. `Tab` from a
 * control inside the row still moves focus, and a `Tab` that cannot indent leaves focus to travel.
 */
export const TestTabIndent: Story = {
  args: {
    seed: seedHierarchy,
    hierarchical: true,
    draggable: true,
    framed: false,
  },
  play: async ({ canvasElement }) => {
    const rows = () =>
      Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-testid="taskList.item"]')).map((row) => ({
        row,
        title: row.querySelector('[data-testid="taskList.item.title"]')?.textContent ?? '',
        level: Number(row.closest('[role="treeitem"]')?.getAttribute('aria-level')),
      }));
    const shape = () => rows().map(({ title, level }) => `${title}:${level}`);
    const row = (title: string): HTMLElement => {
      const found = rows().find((entry) => entry.title === title)?.row;
      if (!found) {
        throw new Error(`Row not found: ${title}`);
      }
      return found;
    };
    const press = (target: HTMLElement, key: string, shiftKey = false) => {
      target.focus();
      const event = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true });
      target.dispatchEvent(event);
      return event.defaultPrevented;
    };

    await waitFor(async () =>
      expect(shape()).toEqual([
        'Ship the spring release:1',
        'Write the tasting notes:2',
        'Approve the label art:2',
        'Proofread the back label:3',
        'Dial in the roast:1',
        'Sample the Ethiopian lots:2',
        'Log every profile:2',
      ]),
    );

    // Tab: under the previous sibling, carrying its own sub-task along.
    await expect(press(row('Approve the label art'), 'Tab')).toBe(true);
    await waitFor(async () =>
      expect(shape().slice(0, 4)).toEqual([
        'Ship the spring release:1',
        'Write the tasting notes:2',
        'Approve the label art:3',
        'Proofread the back label:4',
      ]),
    );

    // Shift+Tab: back out, as the peer that follows its parent.
    await expect(press(row('Approve the label art'), 'Tab', true)).toBe(true);
    await waitFor(async () =>
      expect(shape().slice(0, 4)).toEqual([
        'Ship the spring release:1',
        'Write the tasting notes:2',
        'Approve the label art:2',
        'Proofread the back label:3',
      ]),
    );

    // Shift+ArrowUp: ahead of its previous sibling.
    await expect(press(row('Approve the label art'), 'ArrowUp', true)).toBe(true);
    await waitFor(async () =>
      expect(shape().slice(1, 3)).toEqual(['Approve the label art:2', 'Proofread the back label:3']),
    );

    // Consecutive moves with no refocus in between: the moved row keeps focus as it re-renders under
    // its new parent, so the next key reaches it.
    const pressFocused = (key: string, shiftKey = false) => {
      const target = document.activeElement;
      if (!(target instanceof HTMLElement)) {
        throw new Error('Nothing focused.');
      }
      target.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true }));
    };
    const focusedTitle = () =>
      document.activeElement?.closest('[data-object-id]')?.querySelector('[data-testid="taskList.item.title"]')
        ?.textContent;
    row('Log every profile').focus();
    pressFocused('ArrowRight', true);
    await waitFor(async () => expect(shape()).toContain('Log every profile:3'));
    await waitFor(async () => expect(focusedTitle()).toEqual('Log every profile'));
    pressFocused('ArrowLeft', true);
    await waitFor(async () => expect(shape()).toContain('Log every profile:2'));
    await waitFor(async () => expect(focusedTitle()).toEqual('Log every profile'));
    pressFocused('Tab');
    await waitFor(async () => expect(shape()).toContain('Log every profile:3'));
    await waitFor(async () => expect(focusedTitle()).toEqual('Log every profile'));
    pressFocused('Tab', true);
    await waitFor(async () => expect(shape()).toContain('Log every profile:2'));
    await waitFor(async () => expect(focusedTitle()).toEqual('Log every profile'));
    pressFocused('ArrowUp', true);
    await waitFor(async () => expect(shape().at(-1)).toEqual('Sample the Ethiopian lots:2'));
    await waitFor(async () => expect(focusedTitle()).toEqual('Log every profile'));
    pressFocused('ArrowDown', true);
    await waitFor(async () => expect(shape().at(-1)).toEqual('Log every profile:2'));
    await waitFor(async () => expect(focusedTitle()).toEqual('Log every profile'));

    // Nothing to indent under, so the key is not taken and focus is free to leave the list.
    await expect(press(row('Ship the spring release'), 'Tab')).toBe(false);

    // From a control inside the row, Tab is the control's, not a move.
    const status = row('Log every profile').querySelector<HTMLElement>('[data-testid="taskList.item.status"]');
    if (!status) {
      throw new Error('Status control not found.');
    }
    await expect(press(status, 'Tab')).toBe(false);
    await expect(shape().at(-1)).toEqual('Log every profile:2');
  },
};

/**
 * Status grouping reorders rows against the set's array, so the gutter has to number what is on
 * screen: 1..N from the top, with no gaps and nothing out of sequence.
 */
export const TestOrdinalsAreLinear: Story = {
  args: {
    seed: seedMany,
    showOrdinals: true,
  },
  play: async ({ canvasElement }) => {
    const ordinals = () =>
      Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-testid="taskList.item"]')).map(
        (row) => row.querySelector('.tabular-nums')?.textContent ?? '',
      );

    await waitFor(async () => expect(ordinals().length).toBeGreaterThan(1));
    // Asserted per row rather than over the column: the list is windowed, so a row below the fold
    // is not mounted and carries no ordinal, and which rows those are depends on the viewport.
    // Every row that is mounted must still number its own position, which is what linear means.
    const numbered = ordinals()
      .map((ordinal, index) => ({ ordinal, index }))
      .filter(({ ordinal }) => ordinal !== '');
    await expect(numbered.length).toBeGreaterThan(1);
    await expect(numbered.map(({ ordinal }) => ordinal)).toEqual(numbered.map(({ index }) => String(index + 1)));
  },
};

export const TestHierarchy: Story = {
  // Descriptions on, so the alignment between a sub-task's description and its title is asserted;
  // draggable on, because the drag affordances are part of what this asserts.
  args: {
    seed: seedHierarchy,
    hierarchical: true,
    draggable: true,
    showOrdinals: true,
    showDescription: true,
    framed: false,
  },
  // The tree is what the walk produces, not what the array holds; and restructuring is driven from
  // the keyboard, which is the half of the gesture set that CAN be synthesized (a native HTML5 drag
  // cannot).
  play: async ({ canvasElement }) => {
    const rows = () =>
      Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-testid="taskList.item"]'))
        // Unwindowed, a collapsed branch HIDES its descendants rather than unmounting them, so
        // presence in the DOM is not visibility.
        .filter((row) => !row.closest('[hidden]'))
        .map((row) => ({
          row,
          title: row.querySelector('[data-testid="taskList.item.title"]')?.textContent ?? '',
          // A leaf IS the `treeitem`, but a branch's `treeitem` is a wrapper around the focusable
          // row — so the level is read from whichever of the two carries it.
          level: Number(row.closest('[role="treeitem"]')?.getAttribute('aria-level')),
          ordinal: row.querySelector('.tabular-nums')?.textContent ?? '',
        }));
    const shape = () => rows().map(({ title, level }) => `${title}:${level}`);
    const toggle = (row: HTMLElement) => row.querySelector<HTMLElement>('[data-testid="treeItem.toggle"]')!;
    const press = (row: HTMLElement, key: string) => {
      row.focus();
      row.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey: true, bubbles: true }));
    };

    // Interleaved in the array, nested in the walk.
    await expect(shape()).toEqual([
      'Ship the spring release:1',
      'Write the tasting notes:2',
      'Approve the label art:2',
      'Proofread the back label:3',
      'Dial in the roast:1',
      'Sample the Ethiopian lots:2',
      'Log every profile:2',
    ]);

    // Ordinals run 1..N down the list as rendered, not by position in the set's array — the walk
    // interleaves the two branches, so the two orders differ.
    await expect(rows().map(({ ordinal }) => ordinal)).toEqual(['1', '2', '3', '4', '5', '6', '7']);

    // Collapsing a branch hides its descendants and marks the row. `userEvent`, not `.click()`:
    // the disclosure is a zag machine and it ignores the untrusted event a bare click dispatches.
    await userEvent.click(toggle(rows()[0].row));
    await waitFor(async () => {
      await expect(rows().map(({ title }) => title)).toEqual([
        'Ship the spring release',
        'Dial in the roast',
        'Sample the Ethiopian lots',
        'Log every profile',
      ]);
      // On the `treeitem` for the same reason as `aria-level`, not on the focusable row inside it.
      await expect(rows()[0].row.closest('[role="treeitem"]')?.getAttribute('aria-expanded')).toEqual('false');
    });
    await userEvent.click(toggle(rows()[0].row));
    await waitFor(async () => expect(rows()).toHaveLength(7));

    // Shift-ArrowLeft outdents: the sub-task becomes the next sibling of its parent.
    await expect(rows()[1].title).toEqual('Write the tasting notes');
    press(rows()[1].row, 'ArrowLeft');
    await waitFor(async () =>
      expect(shape()).toEqual([
        'Ship the spring release:1',
        'Approve the label art:2',
        'Proofread the back label:3',
        'Write the tasting notes:1',
        'Dial in the roast:1',
        'Sample the Ethiopian lots:2',
        'Log every profile:2',
      ]),
    );

    // ...and Alt-ArrowRight indents it back under the sibling above it.
    press(rows()[3].row, 'ArrowRight');
    await waitFor(async () =>
      expect(shape()).toEqual([
        'Ship the spring release:1',
        'Approve the label art:2',
        'Proofread the back label:3',
        'Write the tasting notes:2',
        'Dial in the roast:1',
        'Sample the Ethiopian lots:2',
        'Log every profile:2',
      ]),
    );

    // Arrow keys step row to row. Focus, not selection: an APG tree moves the roving tabstop and
    // leaves selection to an explicit activation, where the flat listbox let selection follow
    // focus. The machine owns this now, so the assertion is on where focus landed.
    const focusedRow = () => document.activeElement?.closest('[data-testid="taskList.item"]')?.textContent;
    const secondRowTitle = rows()[1].title;
    rows()[0].row.focus();
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(async () => expect(focusedRow()).toContain(secondRowTitle));
    await userEvent.keyboard('{ArrowUp}');
    await waitFor(async () => expect(focusedRow()).toContain(rows()[0].title));

    // Moving a parent carries its sub-tasks: they stay listed in its `subtasks` wherever it lands.
    const release = rows().find(({ title }) => title === 'Ship the spring release')!;
    press(release.row, 'ArrowDown');
    await waitFor(async () =>
      expect(shape()).toEqual([
        'Dial in the roast:1',
        'Sample the Ethiopian lots:2',
        'Log every profile:2',
        'Ship the spring release:1',
        'Approve the label art:2',
        'Proofread the back label:3',
        'Write the tasting notes:2',
      ]),
    );
    press(rows().find(({ title }) => title === 'Ship the spring release')!.row, 'ArrowUp');
    await waitFor(async () => expect(rows()[0].title).toEqual('Ship the spring release'));

    await expect(canvasElement.querySelectorAll('[data-object-id]')).toHaveLength(7);

    // The pane carries its own columns rather than the list's: it is a card below the list, so it
    // has no ordinal gutter and does not step in with the tree. Only its own two cells line up.
    const create = canvasElement.querySelector<HTMLElement>('[data-testid="taskList.edit"]');
    if (!create) {
      throw new Error('Task edit pane not found.');
    }
    const paneInputElement = create.querySelector('input');
    if (!paneInputElement) {
      throw new Error('Task edit pane input not found.');
    }
    const paneInput = paneInputElement.getBoundingClientRect();
    await expect(Math.round(paneInput.left)).toBeGreaterThan(Math.round(create.getBoundingClientRect().left));

    // The row itself is the drag source — the tree publishes each row to pragmatic-dnd rather than
    // a handle in the gutter, which is what the navtree does too. The drop is a native HTML5 drag
    // and cannot be driven from a play function; the manual script covers the gesture and its
    // landing places.
    await expect(canvasElement.querySelectorAll('[draggable="true"]')).toHaveLength(7);

    // The disclosure toggle sits on the title's centreline whether or not a description follows.
    for (const { row } of rows()) {
      const toggle = row.querySelector<HTMLElement>('[data-testid="treeItem.toggle"]');
      const rowTitle = row.querySelector<HTMLElement>('.truncate');
      if (toggle && rowTitle) {
        const centre = (element: HTMLElement) => {
          const rect = element.getBoundingClientRect();
          return rect.top + rect.height / 2;
        };
        await expect(Math.abs(centre(toggle) - centre(rowTitle))).toBeLessThan(1);
      }
    }

    // A description lines up under its own title cell (the mnemonic chip leads the title in it), not
    // under the column — it is indented with the row and clears the disclosure toggle.
    const described = rows().find(({ row }) => row.querySelector('.line-clamp-3'))!;
    const description = described.row.querySelector<HTMLElement>('.line-clamp-3')!;
    const textStart = (element: HTMLElement) =>
      Math.round(element.getBoundingClientRect().left + parseFloat(getComputedStyle(element).paddingInlineStart));
    await expect(textStart(description)).toEqual(Math.round(titleCell(described.row).getBoundingClientRect().left));
  },
};

export const Test: Story = {
  args: {
    framed: false,
  },
  // The status toggle and the add-`+` share one row grid; assert their icon gutters actually line
  // up, since only geometry (not the DOM) shows the misalignment.
  play: async ({ canvasElement }) => {
    const row = canvasElement.querySelector<HTMLElement>('[data-testid="taskList.item"]');
    const create = canvasElement.querySelector<HTMLElement>('[data-testid="taskList.edit"]');
    if (!row || !create) {
      throw new Error('Task rows not found.');
    }

    const center = (element: Element) => {
      const { left, width } = element.getBoundingClientRect();
      return left + width / 2;
    };

    // `:not([data-focus-sentinel])`: a focus group inserts zero-size boundary elements as its first
    // and last children, so the first *rendered* cell is not the first element child.
    const firstCell = (element: HTMLElement) => element.querySelector(':scope > *:not([data-focus-sentinel])');
    // A tree row leads with its disclosure toggle and carries the status control inside the
    // heading, where the pane — which has no disclosure — leads with the status column itself.
    const rowIcon = row.querySelector<HTMLElement>('[data-testid="taskList.item.status"]');
    // The pane is one grid whose first cells ARE the title line, so its gutter cell is its first
    // child — the same column a row's status toggle occupies.
    const createIcon = firstCell(create);
    // The title cell, not the title text: the mnemonic chip leads the text within the cell.
    const rowLabel = titleCell(row);
    // The title input itself: its field root takes no box, so a positional pick would measure nothing.
    const createLabel = create.querySelector<HTMLElement>('[data-testid="taskList.edit.title"]');
    // Guarded together: indexing a NodeList yields `undefined` for a missing cell, and reading
    // geometry off it would throw a TypeError instead of failing the alignment assertion.
    if (!rowIcon || !createIcon || !rowLabel || !createLabel) {
      throw new Error('Row icons or label cells not found.');
    }

    // Same icon column ⇒ same horizontal centre (sub-pixel tolerance for rounding).
    await expect(Math.abs(center(rowIcon) - center(createIcon))).toBeLessThan(1);
    // ...and the labels start at the same x.
    await expect(
      Math.abs(rowLabel.getBoundingClientRect().left - createLabel.getBoundingClientRect().left),
    ).toBeLessThan(1);

    // The row spans the full width, so trailing actions sit at the far edge.
    await expect(row.getBoundingClientRect().width).toBeGreaterThan(create.getBoundingClientRect().width * 0.9);
  },
};

/**
 * A row's status picker builds its menu on the first click rather than with the row, so a list of
 * 200 rows does not build 200 menu machines for menus nobody opens. The gesture has to survive that:
 * nothing exists until the click, the click offers every status, and picking one writes it.
 */
export const TestStatusPickerBuildsOnFirstClick: Story = {
  args: {
    showGroupLabels: false,
  },
  play: async ({ canvasElement }) => {
    const rows = () => Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-testid="taskList.item"]'));
    // Queried against the document, not the canvas: the menu's content is portalled out of the list.
    const options = () => Array.from(document.querySelectorAll<HTMLElement>('[role="menuitemradio"]'));
    const first = rows()[0];
    // Re-read rather than held: building the menu re-parents the trigger under it, so the node that
    // took the first click is gone by the time the menu is open.
    const trigger = () => first.querySelector<HTMLElement>('[data-testid="taskList.item.status"]')!;

    // Nothing is built for a row at rest.
    await expect(options()).toHaveLength(0);

    await userEvent.click(trigger());
    await waitFor(async () => expect(options()).toHaveLength(Task.StatusOptions.length), { timeout: 5_000 });
    // One option is checked, so the options the click built carry the task's state and not just labels.
    await expect(options().filter((option) => option.getAttribute('aria-checked') === 'true')).toHaveLength(1);

    // Picking another status closes the menu and writes the value, which the next open reports.
    const next = options().find((option) => option.getAttribute('aria-checked') !== 'true')!;
    const nextLabel = next.textContent;
    await userEvent.click(next);
    await waitFor(async () => expect(options()).toHaveLength(0), { timeout: 5_000 });

    await userEvent.click(trigger());
    await waitFor(async () => expect(options()).toHaveLength(Task.StatusOptions.length), { timeout: 5_000 });
    const checked = options().find((option) => option.getAttribute('aria-checked') === 'true');
    await expect(checked?.textContent).toEqual(nextLabel);

    // The row's other pickers defer the same way, and the priority one is the picker whose absence
    // from the tree row changed when the row commits — so it is opened here rather than assumed.
    await userEvent.keyboard('{Escape}');
    await waitFor(async () => expect(options()).toHaveLength(0), { timeout: 5_000 });
    await userEvent.click(first.querySelector<HTMLElement>('[data-testid="taskList.item.priority"]')!);
    await waitFor(async () => expect(options()).toHaveLength(Task.PriorityOptions.length + 1), { timeout: 5_000 });
  },
};
