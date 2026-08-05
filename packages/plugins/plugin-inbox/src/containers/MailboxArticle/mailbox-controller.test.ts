//
// Copyright 2026 DXOS.org
//

import { Atom, Registry } from '@effect-atom/atom';
import * as Effect from 'effect/Effect';
import * as PubSub from 'effect/PubSub';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { type Capabilities } from '@dxos/app-framework';
import { Database, Feed, Tag } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { type ObjectExtractor } from '@dxos/extractor';
import { TagIndex } from '@dxos/schema';
import { Message } from '@dxos/types';

import { InboxCapabilities, Mailbox, type Settings, type SystemTags } from '#types';

import { Builder } from '../../testing/builder';
import { type MailboxController, createMailboxController } from './mailbox-controller';

/**
 * Headless controller tests (experiment H2, see the declarative-ui-abstraction spec): the whole
 * mailbox view logic — queries, debounced filter, pagination, tag machinery, dispatch — runs and
 * asserts against a bare atom `Registry`, with no DOM, renderer, or `renderHook`.
 */
describe('MailboxController', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const stubInvoker = (): Capabilities.OperationInvoker => {
    const invocations: Capabilities.OperationInvoker['invocations'] = Effect.runSync(PubSub.unbounded());
    return {
      invoke: () => Effect.die('stub invoker'),
      invokePromise: async () => ({}),
      schedule: () => Effect.void,
      invocations,
      pendingFollowups: Effect.succeed(0),
      awaitFollowups: Effect.void,
    };
  };

  const setup = async (options?: { messageCount?: number; systemTag?: SystemTags.SystemTagId }) => {
    const { db } = await builder.createDatabase({
      types: [Feed.Feed, Tag.Tag, Mailbox.Mailbox, Message.Message, TagIndex.TagIndex],
    });
    const mailbox = db.add(Mailbox.make());
    await db.flush();
    const feed = mailbox.feed!.target!;
    const count = options?.messageCount ?? 3;
    // One thread per message: the mailbox's whole-thread semi-join matches on `threadId`, so
    // messages without one (the Builder default) never qualify — mirroring providers, which
    // always set it.
    const { messages } = new Builder().createMessages(count, { threads: count }).build();
    await EffectEx.runAndForwardErrors(Feed.append(feed, messages).pipe(Effect.provide(Database.layer(db))));

    const registry = Registry.make();
    const controller = createMailboxController({
      registry,
      mailbox,
      systemTag: options?.systemTag,
      invoker: stubInvoker(),
      settings: Atom.make<Settings.Settings>({}),
      extractors: Atom.make<readonly ObjectExtractor[]>([]),
      injectedActions: Atom.make<readonly InboxCapabilities.MailboxAction[]>([]),
      openTopic: () => {},
      anchors: {},
      slots: {},
    });
    return { db, mailbox, registry, controller, messages };
  };

  /** Keeps an atom mounted (subscribed) so it tracks its sources, as the template would. */
  const mount = (registry: Registry.Registry, controller: MailboxController) =>
    registry.subscribe(controller.state.messages, () => {});

  test('derives stack items from the feed with no React in the loop', async ({ expect }) => {
    const { registry, controller } = await setup({ messageCount: 3 });
    mount(registry, controller);

    await expect.poll(() => registry.get(controller.state.messages).length, { timeout: 3_000 }).toBe(3);
    expect(registry.get(controller.state.loading)).toBe(false);
    expect(registry.get(controller.state.showEmptyState)).toBe(false);
  });

  test('filter text rebuilds the query only after the debounce settles', async ({ expect }) => {
    const { registry, controller } = await setup({ messageCount: 3 });
    mount(registry, controller);
    await expect.poll(() => registry.get(controller.state.messages).length, { timeout: 3_000 }).toBe(3);

    // A structural filter matching no message: narrowing to empty proves the debounced text
    // reached the query, and the empty state derives only once the query settles.
    registry.set(controller.state.filterText, 'from:nobody@example.com');

    // The immediate filter parses right away (it gates the save affordance)...
    expect(registry.get(controller.state.filter)).toBeDefined();
    // ...while the visible list changes only once the debounced value lands in the query.
    await expect.poll(() => registry.get(controller.state.messages).length, { timeout: 3_000 }).toBe(0);
    await expect.poll(() => registry.get(controller.state.showEmptyState), { timeout: 3_000 }).toBe(true);

    controller.dispatch({ type: 'clear-filter' });
    await expect.poll(() => registry.get(controller.state.messages).length, { timeout: 3_000 }).toBe(3);
  });

  test('star dispatch toggles tag membership through the tag index', async ({ expect }) => {
    const { registry, controller } = await setup({ messageCount: 2 });
    mount(registry, controller);
    await expect.poll(() => registry.get(controller.state.messages).length, { timeout: 3_000 }).toBe(2);

    const [message] = registry.get(controller.state.messages);
    // Mounted like a tile would: an unmounted atom's `get` returns a cached first value.
    registry.subscribe(controller.state.starred(message.id), () => {});
    expect(registry.get(controller.state.starred(message.id))).toBe(false);

    controller.dispatch({ type: 'star', messageId: message.id });
    await expect.poll(() => registry.get(controller.state.starred(message.id)), { timeout: 3_000 }).toBe(true);

    controller.dispatch({ type: 'star', messageId: message.id });
    await expect.poll(() => registry.get(controller.state.starred(message.id)), { timeout: 3_000 }).toBe(false);
  });

  test('menu model exposes the core actions; the drafts view drops the filter slot', async ({ expect }) => {
    const { registry, controller } = await setup();
    const ids = registry.get(controller.menu).nodes.map((node) => node.id);
    expect(ids).toEqual(expect.arrayContaining(['sortAscending', 'loadRemoteImages', 'composeEmail', 'filter']));

    const { registry: draftRegistry, controller: draftController } = await setup({ systemTag: 'draft' });
    expect(draftController.hideFilterEditor).toBe(true);
    const draftIds = draftRegistry.get(draftController.menu).nodes.map((node) => node.id);
    expect(draftIds).not.toContain('filter');
  });
});
