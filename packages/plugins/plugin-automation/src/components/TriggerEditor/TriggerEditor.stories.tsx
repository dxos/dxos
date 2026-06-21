//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { Trigger } from '@dxos/compute';
import { Feed, Filter, Obj } from '@dxos/echo';
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

  return <TriggerEditor classNames='p-2' db={space.db} automation={automation} trigger={trigger} />;
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

// Reads the automation's primary trigger spec kind. `Automation.triggers` is typed `Ref.Ref(Obj.Unknown)`,
// so the target is narrowed before reading its spec.
const primaryTriggerKind = (): string | undefined => {
  const automation = (window as any)[DEBUG_SYMBOL]?.automation as Automation.Automation | undefined;
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

/**
 * Builds a play story that drives the picker to create a trigger of a single kind: selecting the card creates
 * the automation's primary trigger with that kind's spec, asserted to round-trip to the expected `spec.kind`.
 * `name` regex anchors the card's title (its accessible name also includes the description).
 */
const createKindStory = (kind: Trigger.Spec['kind'], name: RegExp): Story => ({
  decorators: [
    withSeededSpace((space) => {
      space.db.add(Automation.make({ name: 'Morning Report', triggers: [] }));
    }),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = await canvas.findByRole('option', { name }, { timeout: 10_000 });
    await userEvent.click(card);
    await waitForKind(kind);
    await expect(primaryTriggerKind()).toBe(kind);
  },
});

/** Create a Schedule (timer) trigger via the picker. */
export const CreateScheduleTrigger: Story = createKindStory('timer', /^Schedule/);

/** Create a Feed trigger via the picker. */
export const CreateFeedTrigger: Story = createKindStory('feed', /^Feed/);

/** Create a Query (subscription) trigger via the picker. */
export const CreateQueryTrigger: Story = createKindStory('subscription', /^Query/);

// Webhook and Email kinds are gated off in `TriggerKindSelector` (disabled options), so the picker cannot
// create them; these stories are excluded from the CI test run (`tags: ['!test']`) until the kinds are enabled.

/** Create a Webhook trigger via the picker. */
export const CreateWebhookTrigger: Story = { ...createKindStory('webhook', /^Webhook/), tags: ['!test'] };

/** Create an Email trigger via the picker. */
export const CreateEmailTrigger: Story = { ...createKindStory('email', /^Email/), tags: ['!test'] };
