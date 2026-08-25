//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import * as Operation from '@dxos/compute/Operation';
import { Filter } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { TasksPlugin } from '#plugin';
import { Journal, OutlineOperation } from '#types';

describe('OutlineOperation.QuickJournalEntry', () => {
  test("creates the default space's journal on first use and appends a bullet", async ({ expect }) => {
    await using harness = await setup();

    await harness.runPromise(Operation.invoke(OutlineOperation.QuickJournalEntry, { text: 'ship the thing' }));

    const content = await todayContent(harness);
    expect(content).toBe('- [ ] ship the thing');
  });

  test('a second entry appends to the same day rather than starting another journal', async ({ expect }) => {
    await using harness = await setup();

    await harness.runPromise(Operation.invoke(OutlineOperation.QuickJournalEntry, { text: 'first' }));
    await harness.runPromise(Operation.invoke(OutlineOperation.QuickJournalEntry, { text: 'second' }));

    expect(await todayContent(harness)).toBe('- [ ] first\n- [ ] second');
    const journals = await defaultSpace(harness).db.query(Filter.type(Journal.Journal)).run();
    expect(journals).toHaveLength(1);
  });

  test('newlines are folded so one entry stays one bullet', async ({ expect }) => {
    await using harness = await setup();

    await harness.runPromise(
      Operation.invoke(OutlineOperation.QuickJournalEntry, { text: '  call Ana\n\nabout the budget  ' }),
    );

    expect(await todayContent(harness)).toBe('- [ ] call Ana about the budget');
  });

  test('blank text is ignored rather than filed as an empty bullet', async ({ expect }) => {
    await using harness = await setup();

    await harness.runPromise(Operation.invoke(OutlineOperation.QuickJournalEntry, { text: '   \n  ' }));

    const journals = await defaultSpace(harness).db.query(Filter.type(Journal.Journal)).run();
    expect(journals).toEqual([]);
  });
});

type Harness = Awaited<ReturnType<typeof createComposerTestApp>>;

const setup = async (): Promise<Harness> => {
  const harness = await createComposerTestApp({ plugins: [ClientPlugin.make({}), TasksPlugin()] });
  const client = harness.get(ClientCapabilities.Client);
  await EffectEx.runAndForwardErrors(initializeIdentity(client));
  await harness.waitForEvent(ClientEvents.SpacesReady);
  return harness;
};

const defaultSpace = (harness: Harness) => {
  const space = AppSpace.getDefaultSpace(harness.get(ClientCapabilities.Client));
  invariant(space, 'Expected a default space.');
  return space;
};

const todayContent = async (harness: Harness): Promise<string | undefined> => {
  const space = defaultSpace(harness);
  const [journal] = await space.db.query(Filter.type(Journal.Journal)).run();
  if (!journal) {
    return undefined;
  }
  const entry = await Journal.getOrCreateEntry(journal, space.db);
  const text = await entry.content.load();
  return text.content;
};
