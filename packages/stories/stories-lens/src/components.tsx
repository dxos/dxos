//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode } from 'react';

import { Obj } from '@dxos/echo';
import { Lens } from '@dxos/echo-panproto';
import { useLens } from '@dxos/echo-panproto/react';
import { useObject } from '@dxos/echo-react';
import { type Task } from '@dxos/types';

import { GTD_LENS_ID, GtdLens, type GtdTask } from './gtd';

//
// Two interfaces over one object, plus an inspector showing where the data actually lands.
//
// Neither interface knows about the other. The canonical panel is written against `Task`; the lensed
// panel is written against `GtdTask` and never imports `Task` at all.
//

const PANEL =
  'flex flex-col gap-2 p-3 min-w-0 overflow-auto bg-base-surface border border-subdued-separator rounded-md';
const LABEL = 'text-xs uppercase tracking-wide text-subdued';
const INPUT = 'w-full px-2 py-1 text-sm bg-input-surface border border-subdued-separator rounded';

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className='flex flex-col gap-1'>
    <span className={LABEL}>{label}</span>
    {children}
  </label>
);

export const Panel = ({
  title,
  subtitle,
  children,
  testId,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  testId: string;
}) => (
  <section className={PANEL} data-testid={testId}>
    <header className='flex flex-col gap-0.5 pb-1'>
      <h2 className='text-sm font-medium'>{title}</h2>
      <p className='text-xs text-subdued'>{subtitle}</p>
    </header>
    {children}
  </section>
);

const STATUSES = ['todo', 'in-progress', 'done'] as const;
const PRIORITIES = ['none', 'low', 'medium', 'high', 'urgent'] as const;

/**
 * The interface that already exists: written against `Task`, unaware that any lens exists.
 */
export const CanonicalTaskPanel = ({ task }: { task: Task.Task }) => {
  const [view, update] = useObject(task);

  return (
    <Panel
      title='Canonical interface'
      subtitle='Written against Task — the object as it is stored.'
      testId='canonical-panel'
    >
      <Field label='title'>
        <input
          className={INPUT}
          data-testid='canonical-title'
          value={view?.title ?? ''}
          onChange={(event) => update((task) => void (task.title = event.target.value))}
        />
      </Field>
      <Field label='status'>
        <select
          className={INPUT}
          data-testid='canonical-status'
          value={view?.status ?? 'todo'}
          onChange={(event) => update((task) => void (task.status = event.target.value as Task.Task['status']))}
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </Field>
      <Field label='priority'>
        <select
          className={INPUT}
          data-testid='canonical-priority'
          value={view?.priority ?? 'none'}
          onChange={(event) => update((task) => void (task.priority = event.target.value as Task.Task['priority']))}
        >
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>
      </Field>
    </Panel>
  );
};

const CONTEXTS = ['@home', '@work', '@errands'] as const;

/**
 * A different interface over the SAME object, written only against `GtdTask`.
 *
 * `done` is a checkbox where the object stores a three-state `status`; `urgency` is a number where it
 * stores an enum; `context` and `waitingOn` have no counterpart at all and land in the object's
 * annotations. Nothing here references `Task`.
 */
export const LensedGtdPanel = ({ task }: { task: Obj.Unknown }) => {
  const [view, update] = useLens(task, GtdLens as Lens.Lens<any, GtdTask>);

  return (
    <Panel
      title='Lensed interface'
      subtitle='Written against GtdTask — the same object, a different shape.'
      testId='lensed-panel'
    >
      <Field label='title'>
        <input
          className={INPUT}
          data-testid='lensed-title'
          value={view?.title ?? ''}
          onChange={(event) => update((gtd) => void (gtd.title = event.target.value))}
        />
      </Field>
      <label className='flex items-center gap-2 py-1'>
        <input
          type='checkbox'
          data-testid='lensed-done'
          checked={view?.done ?? false}
          onChange={(event) => update((gtd) => void (gtd.done = event.target.checked))}
        />
        <span className='text-sm'>done</span>
        <span className='text-xs text-subdued'>(stage: {view?.stage ?? 'unset'})</span>
      </label>
      <Field label='urgency (1-5)'>
        <input
          className={INPUT}
          data-testid='lensed-urgency'
          type='number'
          min={1}
          max={5}
          value={view?.urgency ?? 1}
          onChange={(event) => update((gtd) => void (gtd.urgency = Number(event.target.value)))}
        />
      </Field>
      <Field label='context (overlay — no counterpart on Task)'>
        <select
          className={INPUT}
          data-testid='lensed-context'
          value={view?.context ?? ''}
          onChange={(event) =>
            update((gtd) => void (gtd.context = (event.target.value || undefined) as GtdTask['context']))
          }
        >
          <option value=''>unset</option>
          {CONTEXTS.map((context) => (
            <option key={context} value={context}>
              {context}
            </option>
          ))}
        </select>
      </Field>
      <Field label='waiting on (overlay)'>
        <input
          className={INPUT}
          data-testid='lensed-waiting-on'
          value={view?.waitingOn ?? ''}
          onChange={(event) => update((gtd) => void (gtd.waitingOn = event.target.value || undefined))}
        />
      </Field>
    </Panel>
  );
};

/**
 * The proof, and the reason this pane exists: every lensed edit shows up here as an ordinary property
 * of the base object under its own schema, and the target-only fields show up under the object's
 * annotations — never as stray properties and never as a second object.
 */
export const RawInspector = ({ task }: { task: Obj.Unknown }) => {
  const [snapshot] = useObject(task);
  const overlays = snapshot ? Lens.getOverlays(task, GTD_LENS_ID) : {};

  const stored: Record<string, unknown> = snapshot ? JSON.parse(JSON.stringify(snapshot)) : {};
  const properties = Object.fromEntries(Object.entries(stored).filter(([key]) => !key.startsWith('@')));

  return (
    <Panel title='Raw object' subtitle='What is actually stored. One object, no copies.' testId='inspector-panel'>
      <div className='flex flex-col gap-1'>
        <span className={LABEL}>typename</span>
        <code className='text-xs' data-testid='inspector-typename'>
          {Obj.getTypename(task)}
        </code>
      </div>
      <div className='flex flex-col gap-1'>
        <span className={LABEL}>properties (Task schema)</span>
        <pre className='text-xs whitespace-pre-wrap' data-testid='inspector-properties'>
          {JSON.stringify(properties, null, 2)}
        </pre>
      </div>
      <div className='flex flex-col gap-1'>
        <span className={LABEL}>meta.annotations — lens overlay</span>
        <pre className='text-xs whitespace-pre-wrap' data-testid='inspector-overlay'>
          {JSON.stringify(overlays, null, 2)}
        </pre>
      </div>
    </Panel>
  );
};
