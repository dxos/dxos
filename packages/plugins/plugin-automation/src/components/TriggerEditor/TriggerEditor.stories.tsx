//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { Trigger } from '@dxos/compute';
import { Feed, Filter, Obj, Ref } from '@dxos/echo';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { Automation } from '#types';

import { TriggerEditor } from './TriggerEditor';

// Exposes the live automation to the play function so it can assert the primary trigger's spec kind.
const DEBUG_SYMBOL = Symbol.for('dxos.test.triggerEditor');

const DefaultStory = () => {
  const { space } = useClientStory();
  const [automation] = useQuery(space?.db, Filter.type(Automation.Automation));
  const [trigger] = useQuery(space?.db, Filter.type(Trigger.Trigger));
  if (space?.db && automation && typeof window !== 'undefined') {
    (window as any)[DEBUG_SYMBOL] = { automation };
  }
  if (!space || !automation) {
    return <Loading />;
  }

  return <TriggerEditor db={space.db} automation={automation} trigger={trigger} />;
};

const withSeededSpace = (seed: (space: Space) => void) =>
  withClientProvider({
    createIdentity: true,
    createSpace: true,
    types: [Automation.Automation, Trigger.Trigger, Feed.Feed],
    onCreateSpace: async ({ space }) => seed(space),
  });

const meta = {
  title: 'plugins/plugin-automation/components/TriggerEditor',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** No trigger yet: the editor shows the variant picker (nothing selected). */
export const Empty: Story = {
  decorators: [
    withSeededSpace((space) => {
      space.db.add(Automation.make({ name: 'Morning Report', triggers: [] }));
    }),
  ],
};

/** Existing timer trigger: the picker is replaced by the Schedule editor for the selected variant. */
export const WithTimerTrigger: Story = {
  decorators: [
    withSeededSpace((space) => {
      const trigger = space.db.add(Trigger.make({ enabled: false, spec: Trigger.specTimer('0 9 * * *') }));
      const automation = space.db.add(Automation.make({ name: 'Daily Digest', triggers: [] }));
      Obj.update(automation, (automation) => {
        automation.triggers = [...automation.triggers, Ref.make(trigger)];
      });
    }),
  ],
};

// Each variant by picker label (regex anchors the card's title; its accessible name also includes the
// description) paired with the spec discriminant it must produce.
const VARIANTS: { kind: Trigger.Spec['kind']; name: RegExp }[] = [
  { kind: 'timer', name: /^Schedule/ },
  { kind: 'feed', name: /^Feed/ },
  { kind: 'subscription', name: /^Query/ },
  { kind: 'webhook', name: /^Webhook/ },
  { kind: 'email', name: /^Email/ },
];

/**
 * Drives the picker to create a trigger of every kind: selecting a card creates/updates the automation's
 * primary trigger with that kind's spec, then Clear reverts to the picker for the next kind. Asserts each
 * selection round-trips to the expected `spec.kind`.
 */
export const CreateEachKindPlay: Story = {
  decorators: [
    withSeededSpace((space) => {
      space.db.add(Automation.make({ name: 'Morning Report', triggers: [] }));
    }),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const primaryTriggerKind = (): string | undefined => {
      const automation = (window as any)[DEBUG_SYMBOL]?.automation as Automation.Automation | undefined;
      // `Automation.triggers` is typed `Ref.Ref(Obj.Unknown)`, so narrow the target to read its spec.
      const target = automation?.triggers?.[0]?.target;
      return target && Obj.instanceOf(Trigger.Trigger, target) ? target.spec?.kind : undefined;
    };

    // The spec is written via Obj.update on the next tick, so poll until it settles.
    const waitForKind = async (expected: string | undefined): Promise<void> => {
      for (let attempt = 0; attempt < 100; attempt++) {
        if (primaryTriggerKind() === expected) {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      throw new Error(`expected spec.kind=${expected}, got ${primaryTriggerKind()}`);
    };

    for (const { kind, name } of VARIANTS) {
      // Pick the variant (creates the trigger on first selection, updates it thereafter).
      const card = await canvas.findByRole('radio', { name }, { timeout: 10_000 });
      await userEvent.click(card);
      await waitForKind(kind);
      await expect(primaryTriggerKind()).toBe(kind);

      // Revert to the picker so the next variant can be selected.
      const clear = await canvas.findByRole('button', { name: /clear/i }, { timeout: 5000 });
      await userEvent.click(clear);
      await waitForKind(undefined);
    }
  },
};
