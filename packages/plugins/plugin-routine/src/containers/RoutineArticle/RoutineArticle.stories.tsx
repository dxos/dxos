//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Instructions, Skill, Trigger } from '@dxos/compute';
import { Feed, Filter, Json, Obj, Ref } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { RoutinePlugin } from '@dxos/plugin-routine/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { type Space, useObject, useQuery, useSpaces } from '@dxos/react-client/echo';
import { Panel, Toolbar } from '@dxos/react-ui';
import { ObjectProperties } from '@dxos/react-ui-form';
import { Syntax } from '@dxos/react-ui-syntax-highlighter';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { Routine } from '#types';

import { RoutineArticle } from './RoutineArticle';

const types = [Routine.Routine, Trigger.Trigger, Instructions.Instructions, Feed.Feed, Skill.Skill];

/** Seed a few fake skills so the routine action's Skills picker has options. */
const seedSkills = (space: Space) => {
  space.db.add(
    Skill.make({
      key: 'example.com/skill/research',
      name: 'Research',
      description: 'Research an organization.',
    }),
  );
  space.db.add(
    Skill.make({
      key: 'example.com/skill/summarize',
      name: 'Summarize',
      description: 'Summarize the selected content.',
    }),
  );
  space.db.add(
    Skill.make({
      key: 'example.com/skill/translate',
      name: 'Translate',
      description: 'Translate text to another language.',
    }),
  );
};

/** Empty automation — no trigger or action yet. */
const seedDefault = (space: Space) => {
  seedSkills(space);
  space.db.add(Routine.make({ name: 'Morning Report', triggers: [] }));
};

/** Automation with a timer trigger pre-configured for a daily 9 AM schedule. */
const seedWithTimerTrigger = (space: Space) => {
  seedSkills(space);
  const trigger = space.db.add(Trigger.make({ enabled: false, spec: { kind: 'timer', cron: '0 9 * * *' } }));
  const automation = space.db.add(Routine.make({ name: 'Daily Digest', triggers: [] }));
  // Wire the trigger into the automation after both are in the db.
  Obj.update(automation, (automation) => {
    automation.triggers = [...automation.triggers, Ref.make(trigger)];
  });
};

/**
 * `withPluginManager` (rather than `withClientProvider`) so the article's `useOperationInvoker` resolves
 * the `OperationInvoker` capability the Run toolbar action depends on.
 */
const withAutomation = (seed: (space: Space) => void) =>
  withPluginManager({
    plugins: [
      ...corePlugins(),
      ClientPlugin({
        types,
        onClientInitialized: ({ client }) =>
          Effect.gen(function* () {
            yield* Effect.promise(() => client.halo.createIdentity());
            const space = yield* Effect.promise(() => client.spaces.create());
            yield* Effect.promise(() => space.waitUntilReady());
            seed(space);
          }),
      }),
      RoutinePlugin(),
    ],
  });

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const [automation] = useQuery(space?.db, Filter.type(Routine.Routine));
  if (!automation) {
    return <Loading />;
  }

  return <RoutineArticle role='article' subject={automation} attendableId='story' />;
};

/** Editable object form. `ObjectProperties` is uncontrolled, so the caller keys it by the object's
 * snapshot to remount (re-read `defaultValues`) when the object changes externally; `object` stays
 * the live object so its own edits persist. */
const EditableObject = ({ title, object }: { title: string; object: Obj.Unknown }) => (
  <Panel.Root>
    <Panel.Content classNames='overflow-auto'>
      <h2 className='mbe-1 px-2 pt-2 text-sm font-medium text-description'>{title}</h2>
      <ObjectProperties object={object} />
    </Panel.Content>
  </Panel.Root>
);

/**
 * Reactive syntax-highlighted JSON with a ref-resolution depth control (mirrors `DebugObjectPanel`):
 * `Syntax.Depth` drives `getReplacer`, which builds `Json.createRefReplacer({ db, depth })` to inline
 * referenced objects (e.g. the trigger) up to the chosen depth. `JsonHighlighter` re-stringifies on
 * every render, so the view stays live as the objects change.
 */
const JsonView = ({ data, db }: { data: unknown; db?: ReturnType<typeof Obj.getDatabase> }) => (
  <Syntax.Root
    data={data}
    defaultDepth={1}
    getReplacer={(depth) => (db ? Json.createRefReplacer({ db, depth }) : undefined)}
  >
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root classNames='grid grid-cols-[1fr_3rem]'>
          <Syntax.Filter />
          <Syntax.Depth />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <Syntax.Viewport>
          <Syntax.Code />
        </Syntax.Viewport>
      </Panel.Content>
    </Panel.Root>
  </Syntax.Root>
);

const ThreeColumnStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const [routine] = useQuery(space?.db, Filter.type(Routine.Routine));
  const triggerRef = routine?.triggers.find((ref) => Obj.instanceOf(Trigger.Trigger, ref.target));
  // Subscribe to both objects so left-side edits re-render (and re-key) the other columns; the trigger
  // subscription keeps the ref-expanded JSON view live when the trigger (a separate entity) changes.
  const [routineSnapshot] = useObject(routine);
  const [triggerSnapshot] = useObject(triggerRef);
  const trigger = triggerRef?.target;
  if (!routine) {
    return <Loading />;
  }

  return (
    <div role='none' className='w-full grid grid-cols-3 gap-2'>
      <RoutineArticle role='article' subject={routine} attendableId='story' />
      <div role='none' className='grid grid-rows-2 gap-2 min-h-0'>
        <EditableObject key={JSON.stringify(routineSnapshot)} title='Routine' object={routine} />
        {trigger && <EditableObject key={JSON.stringify(triggerSnapshot)} title='Trigger' object={trigger} />}
      </div>
      <JsonView data={routineSnapshot} db={Obj.getDatabase(routine)} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-routine/containers/RoutineArticle',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Empty automation — no trigger or action yet. The Run action is disabled until a runnable is set. */
export const Empty: Story = {
  decorators: [withAutomation(seedDefault)],
};

/**
 * Side-by-side: the composite editor, an editable properties form, and a live raw view of the
 * underlying objects (routine + primary trigger). Seeded with a trigger so trigger-spec edits are
 * immediately observable across all three columns.
 */
export const ThreeColumn: Story = {
  render: ThreeColumnStory,
  decorators: [withAutomation(seedWithTimerTrigger)],
};

/** Automation with a timer trigger pre-configured for a daily 9 AM schedule. */
export const WithTimerTrigger: Story = {
  decorators: [withAutomation(seedWithTimerTrigger)],
};
