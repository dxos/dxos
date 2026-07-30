//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, useCallback } from 'react';

import { Obj } from '@dxos/echo';
import { Lens } from '@dxos/echo-panproto';
import { useLens } from '@dxos/echo-panproto/react';
import { useObject } from '@dxos/echo-react';
import { Card, Panel, ScrollArea, Toolbar } from '@dxos/react-ui';
import { Form, type FormUpdateMeta, omitId } from '@dxos/react-ui-form';
import { Syntax } from '@dxos/react-ui-syntax-highlighter';
import { Task } from '@dxos/types';

import { GTD_LENS_ID, GtdLens, GtdTask } from './gtd';

//
// Two interfaces over one object, plus an inspector showing where the data actually lands.
//
// Both interfaces are the SAME component — `Form` from `@dxos/react-ui-form` — differing only in the
// schema they are given. That is the whole claim of the lens stated as code: a surface written against
// a type works on any object that lenses to it, with no knowledge that a lens is involved.
//

/** The panel chrome: a captioned, scrollable region. */
export const DemoPanel = ({ label, children, testId }: { label: string; children: ReactNode; testId: string }) => (
  <Panel.Root classNames='min-w-0 bg-base-surface border border-subdued-separator rounded-md' data-testid={testId}>
    <Panel.Toolbar>
      <Toolbar.Root>
        <Toolbar.Text>{label}</Toolbar.Text>
      </Toolbar.Root>
    </Panel.Toolbar>
    <Panel.Content asChild>
      <ScrollArea.Root orientation='vertical'>
        <ScrollArea.Viewport>{children}</ScrollArea.Viewport>
      </ScrollArea.Root>
    </Panel.Content>
  </Panel.Root>
);

/**
 * The changed subset of a form's values.
 *
 * Both schemas here are flat, so a changed json path is a property name. Passing only this subset is
 * what keeps a write minimal — handing the whole view to either sink would rewrite properties the user
 * never touched and clobber a concurrent peer.
 *
 * Both panels drive this from `onValuesChanged` rather than `autoSave`: autosave fires on blur, and the
 * switch and select fields never blur, so a toggled `done` would never reach the object.
 */
const changedOnly = <T extends object>(values: T, { changed }: FormUpdateMeta<any>): Partial<T> => {
  const touched = new Set(
    Object.entries(changed)
      .filter(([, edited]) => edited)
      .map(([path]) => path),
  );

  const patch: Partial<T> = {};
  for (const [property, value] of Object.entries(values)) {
    if (touched.has(property)) {
      Object.assign(patch, { [property]: value });
    }
  }
  return patch;
};

// `estimate` and the two `Ref` properties are omitted: refs would render pickers for types this story
// never seeds, and neither is part of what the lens demonstrates.
const CANONICAL_LAYOUT = `
  <grid cols="1">
    <field name="title"/>
    <field name="status"/>
    <field name="priority"/>
    <field name="description"/>
  </grid>
`;

const TaskForm = omitId(Task.Task);

/**
 * The interface that already exists: a `Form` over the `Task` schema, unaware that any lens exists.
 */
export const CanonicalTaskPanel = ({ task }: { task: Task.Task }) => {
  const [snapshot] = useObject(task);

  const handleChange = useCallback(
    (values: object, meta: FormUpdateMeta<any>) => {
      if (!meta.isValid) {
        return;
      }
      Obj.update(task, (task) => void Object.assign(task, changedOnly(values, meta)));
    },
    [task],
  );

  return (
    <DemoPanel label='Canonical — Form over Task' testId='canonical-panel'>
      <Form.Root schema={TaskForm} values={snapshot} onValuesChanged={handleChange}>
        <Form.Viewport>
          <Form.Content>
            <Form.Section
              title='Task'
              description='The object as it is stored. This form is written against Task and nothing else.'
            />
            <Form.Layout template={CANONICAL_LAYOUT} />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    </DemoPanel>
  );
};

const LENSED_LAYOUT = `
  <grid cols="1">
    <field name="title"/>
    <field name="done"/>
    <field name="stage"/>
    <field name="urgency"/>
    <field name="context"/>
    <field name="waitingOn"/>
  </grid>
`;

const GtdForm = omitId(GtdTask);

/**
 * A different interface over the SAME object: the same `Form`, given `GtdTask` instead.
 *
 * `done` is a switch where the object stores a three-state `status`; `urgency` is a number where it
 * stores an enum; `context` and `waitingOn` have no counterpart at all and land in the object's
 * annotations. Nothing here references `Task`.
 */
export const LensedGtdPanel = ({ task }: { task: Obj.Unknown }) => {
  const [view] = useLens(task, GtdLens);

  const handleChange = useCallback(
    (values: object, meta: FormUpdateMeta<any>) => {
      if (!meta.isValid) {
        return;
      }
      // The form reports which field the user just changed; the lens turns it into the minimal write on
      // the base object — an `assign` to a mapped property, or an `overlay` when nothing maps.
      Lens.put(task, GtdLens, changedOnly(values, meta));
    },
    [task],
  );

  return (
    <DemoPanel label='Lensed — Form over GtdTask' testId='lensed-panel'>
      <Form.Root schema={GtdForm} values={view} onValuesChanged={handleChange}>
        <Form.Viewport>
          <Form.Content>
            <Form.Section
              title='GTD task'
              description='The same object, a different shape. This form has never heard of Task.'
            />
            <Form.Layout template={LENSED_LAYOUT} />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    </DemoPanel>
  );
};

/**
 * A labelled JSON block.
 *
 * `Syntax` rather than a bare `JsonHighlighter`: the highlighter is documented as inline and
 * non-scrolling, so a long property value ran off the pane instead of scrolling.
 */
const JsonSection = ({ title, data, testId }: { title: string; data: unknown; testId: string }) => (
  <Card.Section title={title}>
    <Syntax.Root data={data}>
      <Syntax.Viewport classNames='max-h-64'>
        <Syntax.Code testId={testId} />
      </Syntax.Viewport>
    </Syntax.Root>
  </Card.Section>
);

/**
 * The proof, and the reason this pane exists: every lensed edit shows up here as an ordinary property
 * of the base object under its own schema, and the target-only fields show up under the object's
 * annotations — never as stray properties and never as a second object.
 */
export const RawInspector = ({ task }: { task: Obj.Unknown }) => {
  const [snapshot] = useObject(task);
  const overlays = snapshot ? Lens.getOverlays(task, GTD_LENS_ID) : {};

  // `@`/`~` prefixes are the snapshot's own bookkeeping, not properties of the Task.
  const stored: Record<string, unknown> = snapshot ? JSON.parse(JSON.stringify(snapshot)) : {};
  const properties = Object.fromEntries(
    Object.entries(stored).filter(([key]) => !key.startsWith('@') && !key.startsWith('~')),
  );

  return (
    <DemoPanel label='Raw object' testId='inspector-panel'>
      <Card.Root>
        <Card.Section title='typename'>
          <Card.Row fullWidth>
            <Card.Text data-testid='inspector-typename'>{Obj.getTypename(task)}</Card.Text>
          </Card.Row>
        </Card.Section>
        <JsonSection title='properties (Task schema)' data={properties} testId='inspector-properties' />
        <JsonSection title='meta.annotations — lens overlay' data={overlays} testId='inspector-overlay' />
      </Card.Root>
    </DemoPanel>
  );
};
