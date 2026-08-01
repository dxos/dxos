//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useState } from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { Filter, Obj, Ref, Tag } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { random } from '@dxos/random';
import { useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Person } from '@dxos/types';

import { translations } from '#translations';

import { TestLayout } from '../../testing';
import { ObjectForm } from './ObjectForm';

// Seed so the first background mutation deterministically targets `fullName` (moving it off 'Alice Carroll'), which
// the play asserts. Seeded inside the component (below) rather than at module level: `@dxos/random` is a shared
// singleton, and the full storybook run imports every story up front and runs them in sequence, so a module-level
// seed gets consumed by other stories before this story's first tick.
const REACTIVE_SEED = 42;

const DefaultStory = () => {
  const { space } = useClientStory();
  const [person] = useQuery(space?.db, Filter.type(Person.Person));
  if (!person) {
    return <></>;
  }

  return <ObjectForm object={person} type={Person.Person} />;
};

const meta = {
  title: 'ui/react-ui-form/ObjectForm',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ classNames: 'p-2', scroll: true }),
    withClientProvider({
      types: [Person.Person, Tag.Tag],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }) => {
        const tag = space.db.add(Tag.make({ label: 'Friend', hue: 'emerald' }));
        const person = space.db.add(
          Obj.make(Person.Person, {
            fullName: 'Alice Carroll',
            jobTitle: 'Engineer',
            emails: [{ value: 'alice@example.com' }],
          }),
        );
        Obj.update(person, (person) => {
          Obj.getMeta(person).tags = [Ref.make(tag)];
        });
      },
    }),
  ],
  parameters: {
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Exercises the reactive companion form against a live ECHO object. The toolbar mutates the object's fields in the
 * background (outside the form); because `ObjectForm` subscribes via `useObject`, those external changes appear in the
 * inputs immediately. Editing a field holds your (possibly invalid) draft locally without snapping back, while the
 * other fields keep updating from the background mutations.
 */
const ReactiveStory = () => {
  const { space } = useClientStory();
  const [person] = useQuery(space?.db, Filter.type(Person.Person));
  // Reactive snapshot for the JSON panel: reflects both background mutations and the form's own writes, so it shows
  // whether a form edit reaches the object immediately.
  const [snapshot] = useObject(person);
  const [running, setRunning] = useState(true);

  const mutate = useCallback(() => {
    if (!person) {
      return;
    }
    Obj.update(person, (person) => {
      if (random.datatype.boolean()) {
        person.fullName = random.person.fullName();
      } else {
        person.jobTitle = random.person.jobTitle();
      }
    });
  }, [person]);

  useEffect(() => {
    if (!running || !person) {
      return;
    }
    // Seed here — the mounted component is the RNG's sole consumer during its test — so the first tick is deterministic.
    random.seed(REACTIVE_SEED);
    const interval = setInterval(mutate, 1000);
    return () => clearInterval(interval);
  }, [running, person, mutate]);

  if (!person) {
    return <></>;
  }

  return (
    <TestLayout json={snapshot}>
      <div className='flex flex-col gap-2'>
        <Toolbar.Root>
          <Toolbar.IconButton
            icon={running ? 'ph--pause--regular' : 'ph--play--regular'}
            label={running ? 'Stop background mutations' : 'Start background mutations'}
            onClick={() => setRunning((value) => !value)}
          />
          <Toolbar.IconButton
            icon='ph--shuffle--regular'
            label='Mutate a random field once'
            disabled={running}
            onClick={mutate}
          />
        </Toolbar.Root>
        <ObjectForm object={person} type={Person.Person} />
      </div>
    </TestLayout>
  );
};

export const Reactive: Story = {
  render: () => <ReactiveStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // The form initially reflects the live object (generous timeout: the client provider creates the identity/space
    // asynchronously, which is slow under full-suite browser load).
    await canvas.findByDisplayValue('Alice Carroll', {}, { timeout: 15_000 });

    // The first background tick mutates `fullName` outside the form; the form reflects it reactively, so the initial
    // value disappears. `waitFor` re-runs the selector until the assertion holds.
    await waitFor(() => expect(canvas.queryByDisplayValue('Alice Carroll')).not.toBeInTheDocument(), {
      timeout: 5_000,
    });
  },
};
