//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { Operation, Trigger } from '@dxos/compute';
import { Filter, Obj, Ref, Tag, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { random } from '@dxos/random';
import { useQuery } from '@dxos/react-client/echo';
import { TestSchema, useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { useAsyncEffect } from '@dxos/react-ui';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Employer, Organization, Person, Pipeline } from '@dxos/types';

import { functions } from '#testing';
import { translations } from '#translations';

import { TriggerEditor, type TriggerEditorProps } from './TriggerEditor';

const types = [
  // TODO(burdon): Get label from annotation.
  { value: Type.getTypename(Organization.Organization), label: 'Organization' },
  { value: Type.getTypename(Person.Person), label: 'Person' },
  { value: Type.getTypename(Pipeline.Pipeline), label: 'Project' },
  { value: Type.getTypename(Employer.Employer), label: 'Employer' },
];

const DefaultStory = (props: Partial<TriggerEditorProps>) => {
  const { space } = useClientStory();
  const [trigger, setTrigger] = useState<Trigger.Trigger>();
  const tags = useQuery(space?.db, Filter.type(Tag.Tag));

  useAsyncEffect(async () => {
    if (!space) {
      return;
    }

    const functions = await space.db.query(Filter.type(Operation.PersistentOperation)).run();
    const fn = functions.find((fn) => fn.name === 'com.example.function.forex');
    invariant(fn);
    const trigger = space.db.add(
      Trigger.make({
        function: Ref.make(fn),
        spec: Trigger.specWebhook(),
        input: {
          from: 'USD',
          to: 'JPY',
        },
      }),
    );
    setTrigger(trigger);
  }, [space]);

  if (!space || !trigger) {
    return <div />;
  }

  return (
    <TriggerEditor
      db={space.db}
      trigger={trigger}
      types={types}
      tags={tags}
      onSave={(values) => console.log('on save', values)}
      {...props}
    />
  );
};

const meta = {
  title: 'plugins/plugin-automation/components/TriggerEditor',
  component: TriggerEditor as any,
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Tag.Tag, Operation.PersistentOperation, Trigger.Trigger, TestSchema.ContactType],
      onCreateSpace: ({ space }) => {
        // Tags.
        ['Important', 'Investor', 'New'].forEach((label) => {
          space.db.add(Tag.make({ label }));
        });

        // Functions.
        functions.forEach((fn) => {
          const { key, version, ...data } = fn;
          space.db.add(
            Obj.make(Operation.PersistentOperation, {
              [Obj.Meta]: { key, version: version ?? '0.1.0' },
              ...data,
            }),
          );
        });

        // Objects.
        Array.from({ length: 10 }).map(() => {
          return space.db.add(
            Obj.make(TestSchema.ContactType, {
              name: random.person.fullName(),
              identifiers: [],
            }),
          );
        });
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations: [...formTranslations, ...translations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ReadonlySpec: Story = {
  args: {
    readonlySpec: true,
  },
};

export const Spec: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const webhookText = await canvas.findByText('Webhook', {}, { timeout: 10_000 });
    const combobox = webhookText.closest('[role="combobox"]') as HTMLElement;
    await expect(combobox).not.toBeDisabled();

    // Helper to switch to a kind via keyboard.
    // TODO(wittjosiah): Radix Select in popper mode doesn't close on click.
    //   Use keyboard navigation: open, type first letter to jump, Enter to select.
    const selectKind = async (combobox: HTMLElement, firstLetter: string) => {
      combobox.focus();
      await userEvent.keyboard('{Enter}');
      await userEvent.keyboard(firstLetter);
      await userEvent.keyboard('{Enter}');
    };

    // Timer — should show "Cron" field.
    await selectKind(combobox, 't');
    await expect(canvas.findByLabelText('Cron')).resolves.toBeInTheDocument();

    // Email — no extra fields; Cron should be gone.
    await selectKind(combobox, 'e');
    await expect(combobox).not.toBeDisabled();
    await expect(canvas.queryByLabelText('Cron')).not.toBeInTheDocument();

    // Webhook — should show "Method" field.
    await selectKind(combobox, 'w');
    await expect(canvas.findByLabelText('Method')).resolves.toBeInTheDocument();

    // Subscription — should show query editor.
    await selectKind(combobox, 's');
    await expect(combobox).not.toBeDisabled();
    await expect(canvas.queryByLabelText('Method')).not.toBeInTheDocument();

    // Feed — should show the Feed selector field (a Ref(Feed) combobox). The combobox
    // isn't associated with its label, so match the field's <label> element directly.
    await selectKind(combobox, 'f');
    await expect(combobox).not.toBeDisabled();
    await expect(await canvas.findByText('Feed', { selector: 'label' })).toBeInTheDocument();
  },
};
