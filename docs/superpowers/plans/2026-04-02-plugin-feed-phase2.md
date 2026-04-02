# Plugin Feed Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add subscription management (create/delete feeds), companion-panel navigation (selecting a feed shows its posts), a storybook for SubscriptionArticle, and a sync operation that fetches RSS and writes posts into the ECHO feed.

**Architecture:** Create a `SubscriptionArticle` container (modeled on `MailboxArticle`) that shows a list of `Subscription.Feed` objects via a new `SubscriptionStack` component. Selecting a feed opens `FeedArticle` as a companion panel using the deck companion pattern. A `CreateFeedSchema` with `inputSchema` metadata enables the framework's built-in create dialog. A `SyncFeed` operation fetches RSS via the `Builder.fromRss()` utility and appends posts to the ECHO feed. An `app-graph-builder` capability wires the graph extensions for navigation and companion resolution.

**Tech Stack:** TypeScript, React, Effect-TS, ECHO, `@dxos/app-framework`, `@dxos/operation`, `@dxos/react-ui-mosaic`, `@dxos/plugin-attention`, `@dxos/plugin-deck`, Storybook

---

### Task 1: Create SubscriptionStack component

**Files:**

- Create: `packages/plugins/plugin-feed/src/components/SubscriptionStack/SubscriptionStack.tsx`
- Create: `packages/plugins/plugin-feed/src/components/SubscriptionStack/index.ts`
- Modify: `packages/plugins/plugin-feed/src/components/index.ts`

- [ ] **Step 1: Create `src/components/SubscriptionStack/SubscriptionStack.tsx`**

A card-based virtual scrolling list of `Subscription.Feed` objects, modeled on `EventStack` from plugin-inbox. Each tile shows the feed name, URL, and description.

```typescript
//
// Copyright 2025 DXOS.org
//

import React, { type KeyboardEvent, forwardRef, useCallback, useMemo, useState } from 'react';

import { Card, ScrollArea } from '@dxos/react-ui';
import { Focus, Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';
import { composable, composableProps } from '@dxos/ui-theme';

import { type Subscription } from '../../types';

//
// SubscriptionTile
//

export type SubscriptionStackAction = { type: 'current'; feedId: string };

export type SubscriptionStackActionHandler = (action: SubscriptionStackAction) => void;

type SubscriptionTileData = {
  feed: Subscription.Feed;
  onAction?: SubscriptionStackActionHandler;
};

type SubscriptionTileProps = Pick<MosaicTileProps<SubscriptionTileData>, 'location' | 'data'> & { current?: boolean };

const SubscriptionTile = forwardRef<HTMLDivElement, SubscriptionTileProps>(
  ({ data, location, current }, forwardedRef) => {
    const { feed } = data;
    const { setCurrentId } = useMosaicContainer('SubscriptionTile');

    const handleCurrentChange = useCallback(() => {
      setCurrentId(feed.id);
    }, [feed.id, setCurrentId]);

    return (
      <Mosaic.Tile asChild classNames='dx-hover dx-current' id={feed.id} data={data} location={location}>
        <Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
          <Card.Root ref={forwardedRef}>
            <Card.Content>
              <Card.Row icon='ph--rss--regular'>
                <Card.Text>{feed.name ?? 'Untitled feed'}</Card.Text>
              </Card.Row>
              {feed.url && (
                <Card.Row>
                  <Card.Text classNames='text-xs text-description truncate'>{feed.url}</Card.Text>
                </Card.Row>
              )}
              {feed.description && (
                <Card.Row>
                  <Card.Text classNames='text-xs text-description line-clamp-2'>{feed.description}</Card.Text>
                </Card.Row>
              )}
            </Card.Content>
          </Card.Root>
        </Focus.Item>
      </Mosaic.Tile>
    );
  },
);

SubscriptionTile.displayName = 'SubscriptionTile';

//
// SubscriptionStack
//

export type SubscriptionStackProps = {
  id: string;
  feeds?: Subscription.Feed[];
  currentId?: string;
  onAction?: SubscriptionStackActionHandler;
};

export const SubscriptionStack = composable<HTMLDivElement, SubscriptionStackProps>(
  ({ feeds = [], currentId, onAction, ...props }, forwardedRef) => {
    const [viewport, setViewport] = useState<HTMLElement | null>(null);
    const items = useMemo(() => feeds.map((feed) => ({ feed, onAction })), [feeds, onAction]);

    const handleCurrentChange = useCallback(
      (id: string | undefined) => {
        if (id) {
          onAction?.({ type: 'current', feedId: id });
        }
      },
      [onAction],
    );

    const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        (document.activeElement as HTMLElement | null)?.click();
      }
    }, []);

    return (
      <Focus.Group asChild {...composableProps(props)} onKeyDown={handleKeyDown} ref={forwardedRef}>
        <Mosaic.Container
          asChild
          withFocus
          autoScroll={viewport}
          currentId={currentId}
          onCurrentChange={handleCurrentChange}
        >
          <ScrollArea.Root orientation='vertical' padding centered>
            <ScrollArea.Viewport ref={setViewport}>
              <Mosaic.VirtualStack
                Tile={SubscriptionTile}
                classNames='my-2'
                gap={8}
                items={items}
                draggable={false}
                getId={(item) => item.feed.id}
                getScrollElement={() => viewport}
                estimateSize={() => 100}
              />
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Mosaic.Container>
      </Focus.Group>
    );
  },
);

SubscriptionStack.displayName = 'SubscriptionStack';
```

- [ ] **Step 2: Create `src/components/SubscriptionStack/index.ts`**

```typescript
//
// Copyright 2025 DXOS.org
//

export * from './SubscriptionStack';
```

- [ ] **Step 3: Update `src/components/index.ts`**

```typescript
//
// Copyright 2025 DXOS.org
//

export * from './PostStack';
export * from './SubscriptionStack';
```

- [ ] **Step 4: Build and verify**

Run: `moon run plugin-feed:build`

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(plugin-feed): add SubscriptionStack component"
```

---

### Task 2: Create SubscriptionArticle container

**Files:**

- Create: `packages/plugins/plugin-feed/src/containers/SubscriptionArticle/SubscriptionArticle.tsx`
- Create: `packages/plugins/plugin-feed/src/containers/SubscriptionArticle/index.ts`
- Modify: `packages/plugins/plugin-feed/src/containers/index.ts`

- [ ] **Step 1: Create `src/containers/SubscriptionArticle/SubscriptionArticle.tsx`**

This container queries all `Subscription.Feed` objects from the space database, renders them in a `SubscriptionStack`, and handles selection to open `FeedArticle` as a companion.

```typescript
//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, companionSegment } from '@dxos/app-toolkit';
import { type SurfaceComponentProps, useLayout } from '@dxos/app-toolkit/ui';
import { Filter, Obj } from '@dxos/echo';
import { AttentionOperation } from '@dxos/plugin-attention/operations';
import { DeckOperation } from '@dxos/plugin-deck/operations';
import { useQuery } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { useSelected } from '@dxos/react-ui-attention';

import { SubscriptionStack, type SubscriptionStackAction } from '../../components';
import { Subscription } from '../../types';

export type SubscriptionArticleProps = SurfaceComponentProps<
  Subscription.Feed,
  {
    attendableId?: string;
  }
>;

export const SubscriptionArticle = ({ role, subject, attendableId }: SubscriptionArticleProps) => {
  const { invokePromise } = useOperationInvoker();
  const id = attendableId ?? Obj.getDXN(subject).toString();
  const db = Obj.getDatabase(subject);
  const layout = useLayout();

  const feeds = useQuery(db, Filter.type(Subscription.Feed));
  const currentId = useSelected(id, 'single');

  const handleAction = useCallback(
    (action: SubscriptionStackAction) => {
      if (action.type === 'current') {
        void invokePromise(AttentionOperation.Select, {
          contextId: id,
          selection: { mode: 'single', id: action.feedId },
        });

        const companion = companionSegment('feed');
        if (layout.mode === 'simple') {
          void invokePromise(LayoutOperation.UpdateComplementary, {
            subject: companion,
            state: 'expanded',
          });
        } else {
          void invokePromise(DeckOperation.ChangeCompanion, {
            companion,
          });
        }
      }
    },
    [id, layout.mode, invokePromise],
  );

  return (
    <Panel.Root role={role}>
      <Panel.Content asChild>
        <SubscriptionStack id={id} feeds={feeds} currentId={currentId} onAction={handleAction} />
      </Panel.Content>
    </Panel.Root>
  );
};
```

- [ ] **Step 2: Create `src/containers/SubscriptionArticle/index.ts`**

```typescript
//
// Copyright 2025 DXOS.org
//

export * from './SubscriptionArticle';
```

- [ ] **Step 3: Update `src/containers/index.ts`**

```typescript
//
// Copyright 2025 DXOS.org
//

export * from './FeedArticle';
export * from './SubscriptionArticle';
```

- [ ] **Step 4: Add missing dependencies**

The SubscriptionArticle needs several new workspace dependencies. Run:

```bash
pnpm add --filter "@dxos/plugin-feed" "@dxos/plugin-attention@workspace:*" "@dxos/plugin-deck@workspace:*" "@dxos/plugin-graph@workspace:*" "@dxos/operation@workspace:*" "@dxos/react-ui-attention@workspace:*" "@dxos/invariant@workspace:*"
```

Also add tsconfig references for:

- `../../ui/react-ui-attention` (may already exist)
- `../plugin-attention`
- `../plugin-deck`
- `../plugin-graph`
- `../../core/operation`
- `../../common/invariant`

- [ ] **Step 5: Build and verify**

Run: `moon run plugin-feed:build`

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(plugin-feed): add SubscriptionArticle container with companion selection"
```

---

### Task 3: Create app-graph-builder capability

**Files:**

- Create: `packages/plugins/plugin-feed/src/capabilities/app-graph-builder/app-graph-builder.ts`
- Create: `packages/plugins/plugin-feed/src/capabilities/app-graph-builder/index.ts`
- Modify: `packages/plugins/plugin-feed/src/capabilities/index.ts`

- [ ] **Step 1: Create `src/capabilities/app-graph-builder/app-graph-builder.ts`**

Registers graph extensions that:

1. Show `Subscription.Feed` objects as nodes under each space
2. Resolve a companion panel when a feed is selected (using `PLANK_COMPANION_TYPE`)
3. Add a delete action to each feed node

```typescript
//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, createObjectNode } from '@dxos/app-toolkit';
import { type Space, isSpace } from '@dxos/client/echo';
import { type Feed, Filter, Obj, Query } from '@dxos/echo';
import { AtomQuery, AtomRef } from '@dxos/echo-atom';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { GraphBuilder, Node } from '@dxos/plugin-graph';
import { SPACE_TYPE } from '@dxos/plugin-space/types';
import { Atom } from '@effect-atom/atom-react';

import { meta } from '../../meta';
import { Subscription } from '../../types';

const whenSpace = (node: Node.Node): Option.Option<Space> =>
  node.type === SPACE_TYPE && isSpace(node.data) ? Option.some(node.data) : Option.none();

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    const resolve = (typename: string) =>
      capabilities.getAll(AppCapabilities.Metadata).find(({ id }) => id === typename)?.metadata ?? {};

    const selectionManager = yield* Capability.get(AttentionCapabilities.Selection);
    const selectedId = Atom.family((nodeId: string) =>
      Atom.make((get) => {
        const state = get(selectionManager.state);
        const selection = state.selections[nodeId];
        return selection?.mode === 'single' ? selection.id : undefined;
      }),
    );

    const extensions = yield* Effect.all([
      // Show Subscription.Feed objects as nodes under each space.
      GraphBuilder.createExtension({
        id: `${meta.id}.subscription-feed-listing`,
        match: whenSpace,
        connector: (space, get) => {
          const feeds = get(AtomQuery.make(space.db, Filter.type(Subscription.Feed)));
          return Effect.succeed(
            feeds
              .map((feed: Subscription.Feed) =>
                createObjectNode({ db: space.db, object: feed, resolve, disposition: undefined }),
              )
              .filter((node): node is NonNullable<typeof node> => node !== null),
          );
        },
      }),

      // Companion panel: when a Subscription.Feed is selected, show FeedArticle.
      GraphBuilder.createExtension({
        id: `${meta.id}.subscription-feed-companion`,
        match: (node) =>
          Subscription.instanceOf(node.data)
            ? Option.some({ feed: node.data as Subscription.Feed, nodeId: node.id })
            : Option.none(),
        connector: (matched, get) => {
          const subscriptionFeed = matched.feed;
          const db = Obj.getDatabase(subscriptionFeed);
          const echoFeed = subscriptionFeed.feed
            ? (get(AtomRef.make(subscriptionFeed.feed)) as Feed.Feed | undefined)
            : undefined;
          if (!db || !echoFeed) {
            return Effect.succeed([]);
          }

          const postId = get(selectedId(matched.nodeId));
          const post = get(
            AtomQuery.make(db, Query.select(postId ? Filter.id(postId) : Filter.nothing()).from(echoFeed)),
          )[0];

          return Effect.succeed([
            {
              id: 'feed',
              type: PLANK_COMPANION_TYPE,
              data: post ?? 'feed',
              properties: {
                label: ['feed companion label', { ns: meta.id }],
                icon: 'ph--article--regular',
                disposition: 'hidden',
              },
            },
          ]);
        },
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
```

- [ ] **Step 2: Create `src/capabilities/app-graph-builder/index.ts`**

```typescript
//
// Copyright 2025 DXOS.org
//

export { default as AppGraphBuilder } from './app-graph-builder';
```

- [ ] **Step 3: Update `src/capabilities/index.ts`**

```typescript
//
// Copyright 2025 DXOS.org
//

export * from './app-graph-builder';
export * from './react-surface';
```

- [ ] **Step 4: Add dependencies**

Need `@dxos/echo-atom`, `@dxos/client`, `@effect-atom/atom-react` as dependencies. Run:

```bash
pnpm add --filter "@dxos/plugin-feed" "@dxos/echo-atom@workspace:*" "@dxos/client@workspace:*" "@effect-atom/atom-react@catalog:"
```

Add tsconfig references for `../../core/echo/echo-atom` and `../../sdk/client`.

- [ ] **Step 5: Build and verify**

Run: `moon run plugin-feed:build`

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(plugin-feed): add app-graph-builder for feed navigation and companions"
```

---

### Task 4: Add CreateFeedSchema, update metadata, and wire surfaces

**Files:**

- Modify: `packages/plugins/plugin-feed/src/types/Subscription.ts`
- Modify: `packages/plugins/plugin-feed/src/FeedPlugin.tsx`
- Modify: `packages/plugins/plugin-feed/src/capabilities/react-surface/react-surface.tsx`
- Modify: `packages/plugins/plugin-feed/src/translations.ts`

- [ ] **Step 1: Add `CreateFeedSchema` to `src/types/Subscription.ts`**

Append after the `makePost` function:

```typescript
/** Schema for the create-feed dialog form. */
export const CreateFeedSchema = Schema.Struct({
  name: Schema.optional(Schema.String.annotations({ title: 'Name' })),
  url: Schema.optional(
    Schema.String.annotations({
      title: 'URL',
      description: 'RSS or Atom feed URL.',
    }),
  ),
});
```

- [ ] **Step 2: Update `src/FeedPlugin.tsx`**

Replace the entire file. Adds `inputSchema`, `createObject`, `AppGraphBuilder` activation, and `OperationHandler`.

```typescript
//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { ActivationEvent, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { AttentionEvents } from '@dxos/plugin-attention';
import { type CreateObject } from '@dxos/plugin-space/types';
import { SpaceOperation } from '@dxos/plugin-space/operations';

import { AppGraphBuilder, ReactSurface } from './capabilities';
import { OperationHandler } from './capabilities/operation-handler';
import { meta } from './meta';
import { translations } from './translations';
import { Subscription } from './types';

export const FeedPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({
    activatesOn: ActivationEvent.allOf(AppActivationEvents.SetupAppGraph, AttentionEvents.AttentionReady),
    activate: AppGraphBuilder,
  }),
  AppPlugin.addMetadataModule({
    metadata: [
      {
        id: Subscription.Feed.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Subscription.Feed).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Subscription.Feed).pipe(Option.getOrThrow).hue ?? 'white',
          inputSchema: Subscription.CreateFeedSchema,
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const object = Subscription.makeFeed(props);
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                hidden: true,
                targetNodeId: options.targetNodeId,
              });
            })) satisfies CreateObject,
        },
      },
      {
        id: Subscription.Post.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Subscription.Post).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Subscription.Post).pipe(Option.getOrThrow).hue ?? 'white',
        },
      },
    ],
  }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({
    schema: [Subscription.Feed, Subscription.Post],
  }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
```

- [ ] **Step 3: Update `src/capabilities/react-surface/react-surface.tsx`**

Add a surface for `SubscriptionArticle` and update the `FeedArticle` surface to accept `companionTo`.

```typescript
//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';

import { FeedArticle, SubscriptionArticle } from '../../containers';
import { meta } from '../../meta';
import { Subscription } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      // Main subscription feed list view.
      Surface.create({
        id: `${meta.id}.subscription-feed`,
        role: ['article'],
        filter: (data): data is { subject: Subscription.Feed; attendableId?: string } =>
          Subscription.instanceOf(data.subject) && !data.companionTo,
        component: ({ data, role }) => (
          <SubscriptionArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      // Companion view: FeedArticle shown alongside a selected Subscription.Feed.
      Surface.create({
        id: `${meta.id}.feed-article`,
        role: ['article', 'section'],
        filter: (
          data,
        ): data is { subject: Subscription.Feed; companionTo: Subscription.Feed; attendableId?: string } =>
          Subscription.instanceOf(data.subject) && Subscription.instanceOf(data.companionTo),
        component: ({ data, role }) => (
          <FeedArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
    ]),
  ),
);
```

- [ ] **Step 4: Update `src/translations.ts`**

Add new translation keys:

```typescript
//
// Copyright 2025 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';
import { Subscription } from './types';

export const translations = [
  {
    'en-US': {
      [Subscription.Feed.typename]: {
        'typename label': 'Feed',
        'typename label_zero': 'Feeds',
        'typename label_one': 'Feed',
        'typename label_other': 'Feeds',
        'object name placeholder': 'New feed',
        'add object label': 'Add feed',
        'rename object label': 'Rename feed',
        'delete object label': 'Delete feed',
        'object deleted label': 'Feed deleted',
      },
      [Subscription.Post.typename]: {
        'typename label': 'Post',
        'typename label_zero': 'Posts',
        'typename label_one': 'Post',
        'typename label_other': 'Posts',
        'post title placeholder': 'Untitled',
      },
      [meta.id]: {
        'plugin name': 'Feed',
        'empty feed message': 'No posts yet',
        'feed companion label': 'Feed',
        'sync feed label': 'Sync feed',
        'sync feed error title': 'Failed to sync feed',
      },
    },
  },
] as const satisfies Resource[];
```

- [ ] **Step 5: Build and verify**

Run: `moon run plugin-feed:build`

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(plugin-feed): add CreateFeedSchema, graph builder, and companion surfaces"
```

---

### Task 5: Create SyncFeed operation and handler

**Files:**

- Create: `packages/plugins/plugin-feed/src/operations/definitions.ts`
- Create: `packages/plugins/plugin-feed/src/operations/sync-feed.ts`
- Create: `packages/plugins/plugin-feed/src/operations/index.ts`
- Create: `packages/plugins/plugin-feed/src/capabilities/operation-handler/operation-handler.ts`
- Create: `packages/plugins/plugin-feed/src/capabilities/operation-handler/index.ts`
- Modify: `packages/plugins/plugin-feed/src/capabilities/index.ts`

- [ ] **Step 1: Create `src/operations/definitions.ts`**

```typescript
//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { meta } from '../meta';
import { Subscription } from '../types';

const FEED_OPERATION = `${meta.id}.operation`;

/** Fetches an RSS/Atom feed and appends new posts to the backing ECHO feed. */
export const SyncFeed = Operation.make({
  meta: {
    key: `${FEED_OPERATION}.sync-feed`,
    name: 'Sync Feed',
    description: 'Fetches RSS/Atom feed and writes posts to the ECHO feed.',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    feed: Subscription.Feed,
  }),
  output: Schema.Void,
});
```

- [ ] **Step 2: Create `src/operations/sync-feed.ts`**

```typescript
//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Feed, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';

import { meta } from '../meta';
import { Subscription } from '../types';

import { SyncFeed } from './definitions';

const handler: Operation.WithHandler<typeof SyncFeed> = SyncFeed.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ feed: subscriptionFeed }) {
      const url = subscriptionFeed.url;
      invariant(url, 'Feed URL is required.');
      const echoFeed = subscriptionFeed.feed?.target;
      invariant(echoFeed, 'Backing ECHO feed not found.');

      yield* Effect.tryPromise(async () => {
        // Dynamic import to keep fast-xml-parser out of the main bundle.
        const { XMLParser } = await import('fast-xml-parser');
        const response = await fetch(url);
        const xml = await response.text();
        const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
        const parsed = parser.parse(xml);

        const channel = parsed.rss?.channel ?? parsed.feed;
        if (!channel) {
          throw new Error('Unrecognized feed format');
        }

        const isAtom = !parsed.rss;
        const items: any[] = (isAtom ? channel.entry : channel.item) ?? [];
        const itemList = Array.isArray(items) ? items : [items];

        // Query existing posts to deduplicate by guid.
        const existingPosts = yield * Feed.runQuery(echoFeed, Subscription.Post);
        const existingGuids = new Set(existingPosts.map((post) => post.guid).filter(Boolean));

        const newPosts = itemList
          .map((item) => {
            const link = isAtom
              ? ((Array.isArray(item.link)
                  ? item.link.find((l: any) => l['@_rel'] === 'alternate')?.['@_href']
                  : item.link?.['@_href']) ?? '')
              : (item.link ?? '');

            const guid = isAtom ? item.id : (item.guid?.['#text'] ?? item.guid ?? link);

            return {
              title: isAtom ? (item.title?.['#text'] ?? item.title) : item.title,
              link,
              description: isAtom
                ? (item.summary ?? item.content?.['#text'] ?? item.content)
                : (item.description ?? ''),
              author: isAtom ? (item.author?.name ?? item.author) : (item['dc:creator'] ?? item.author),
              published: item.pubDate ?? item.published ?? item.updated,
              guid,
            };
          })
          .filter((post) => !existingGuids.has(post.guid));

        if (newPosts.length > 0) {
          const postObjects = newPosts.map((props) => Obj.make(Subscription.Post, props));
          await Feed.append(echoFeed, postObjects);
        }

        // Update feed metadata from channel.
        const channelTitle = isAtom ? (channel.title?.['#text'] ?? channel.title) : channel.title;
        const channelDescription = isAtom ? channel.subtitle : channel.description;

        if (channelTitle && !subscriptionFeed.name) {
          Obj.change(subscriptionFeed, (obj) => {
            obj.name = channelTitle;
          });
        }
        if (channelDescription && !subscriptionFeed.description) {
          Obj.change(subscriptionFeed, (obj) => {
            obj.description = channelDescription;
          });
        }
      }).pipe(
        Effect.catchAll((error) => {
          log.catch(error);
          return Operation.invoke(LayoutOperation.AddToast, {
            id: `${meta.id}/sync-feed-error`,
            icon: 'ph--warning--regular',
            duration: 5_000,
            title: ['sync feed error title', { ns: meta.id }],
          });
        }),
      );
    }),
  ),
);

export default handler;
```

**Note:** The `Feed.append` and `Feed.runQuery` calls are Effect-based. The handler uses `Effect.tryPromise` which flattens the async fetch + sync into a single effect. The actual `Feed.append` needs the `Feed.Service` layer — if this doesn't work directly, the posts may need to be added via `db.add()` instead. Check at build time and adjust.

- [ ] **Step 3: Create `src/operations/index.ts`**

```typescript
//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * as FeedOperation from './definitions';

export const FeedOperationHandlerSet = OperationHandlerSet.lazy(() => import('./sync-feed'));
```

- [ ] **Step 4: Create `src/capabilities/operation-handler/operation-handler.ts`**

```typescript
//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import type { OperationHandlerSet } from '@dxos/operation';

import { FeedOperationHandlerSet } from '../../operations';

export default Capability.makeModule<OperationHandlerSet.OperationHandlerSet>(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.OperationHandler, FeedOperationHandlerSet);
  }),
);
```

- [ ] **Step 5: Create `src/capabilities/operation-handler/index.ts`**

```typescript
//
// Copyright 2025 DXOS.org
//

export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
```

Wait — this needs imports. Full file:

```typescript
//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { OperationHandlerSet } from '@dxos/operation';

export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
```

- [ ] **Step 6: Update `src/capabilities/index.ts`**

```typescript
//
// Copyright 2025 DXOS.org
//

export * from './app-graph-builder';
export * from './operation-handler';
export * from './react-surface';
```

- [ ] **Step 7: Add dependencies**

```bash
pnpm add --filter "@dxos/plugin-feed" "@dxos/log@workspace:*"
```

Add `operations` sub-export to `package.json` exports, moon.yml entrypoint, and typesVersions (similar to plugin-help pattern).

In `package.json` exports add:

```json
"./operations": {
  "source": "./src/operations/index.ts",
  "types": "./dist/types/src/operations/index.d.ts",
  "browser": "./dist/lib/browser/operations/index.mjs"
}
```

In `typesVersions` add:

```json
"operations": ["dist/types/src/operations/index.d.ts"]
```

In `moon.yml` compile args add:

```yaml
- '--entryPoint=src/operations/index.ts'
```

- [ ] **Step 8: Build and verify**

Run: `moon run plugin-feed:build`

- [ ] **Step 9: Commit**

```bash
git commit -m "feat(plugin-feed): add SyncFeed operation with RSS/Atom parsing"
```

---

### Task 6: Wire sync action into app-graph-builder

**Files:**

- Modify: `packages/plugins/plugin-feed/src/capabilities/app-graph-builder/app-graph-builder.ts`
- Modify: `packages/plugins/plugin-feed/src/index.ts`

- [ ] **Step 1: Add sync action extension to app-graph-builder**

Add a third extension to the `Effect.all([...])` array in `app-graph-builder.ts`:

```typescript
      // Sync action on each Subscription.Feed node.
      GraphBuilder.createExtension({
        id: `${meta.id}.sync-feed`,
        match: (node) =>
          Subscription.instanceOf(node.data) ? Option.some(node.data as Subscription.Feed) : Option.none(),
        actions: (feed) =>
          Effect.succeed([
            {
              id: 'sync',
              data: () => Operation.invoke(FeedOperation.SyncFeed, { feed }),
              properties: {
                label: ['sync feed label', { ns: meta.id }],
                icon: 'ph--arrows-clockwise--regular',
                disposition: 'list-item',
              },
            },
          ]),
      }),
```

Also add these imports at the top of the file:

```typescript
import { Operation } from '@dxos/operation';
import { FeedOperation } from '../../operations';
```

- [ ] **Step 2: Update `src/index.ts`** to export operations

```typescript
//
// Copyright 2025 DXOS.org
//

export * from './meta';
export * from './operations';
export * from './FeedPlugin';
```

- [ ] **Step 3: Build and verify**

Run: `moon run plugin-feed:build`

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(plugin-feed): wire sync action into feed graph nodes"
```

---

### Task 7: Create SubscriptionArticle storybook

**Files:**

- Create: `packages/plugins/plugin-feed/src/containers/SubscriptionArticle/SubscriptionArticle.stories.tsx`

- [ ] **Step 1: Create story file**

Since `SubscriptionArticle` depends on ECHO queries and operations, create a standalone story that renders `SubscriptionStack` directly with generated data.

```typescript
//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';

import { Panel } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';

import { SubscriptionStack, type SubscriptionStackAction } from '../../components';
import { Subscription } from '../../types';

const createFeeds = (count: number): Subscription.Feed[] =>
  Array.from({ length: count }, (_, index) =>
    Subscription.makeFeed({
      name: `Feed ${index + 1}`,
      url: `https://example.com/feed-${index + 1}.xml`,
      description: `Description for feed ${index + 1}.`,
    }),
  );

const SubscriptionArticleStory = () => {
  const feeds = useMemo(() => createFeeds(10), []);
  const [currentId, setCurrentId] = useState<string>();

  const handleAction = (action: SubscriptionStackAction) => {
    if (action.type === 'current') {
      setCurrentId(action.feedId);
    }
  };

  return (
    <Panel.Root role='article'>
      <Panel.Content asChild>
        <SubscriptionStack id='story' feeds={feeds} currentId={currentId} onAction={handleAction} />
      </Panel.Content>
    </Panel.Root>
  );
};

const meta: Meta<typeof SubscriptionArticleStory> = {
  title: 'plugins/plugin-feed/containers/SubscriptionArticle',
  component: SubscriptionArticleStory,
  decorators: [withTheme(), withLayout({ layout: 'column' }), withAttention(), withMosaic()],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
```

- [ ] **Step 2: Build and verify**

Run: `moon run plugin-feed:build`

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(plugin-feed): add SubscriptionArticle storybook story"
```

---

### Task 8: Lint, final build, update PLAN.md

**Files:**

- Modify: `packages/plugins/plugin-feed/PLAN.md`

- [ ] **Step 1: Run linter**

Run: `moon run plugin-feed:lint -- --fix`

- [ ] **Step 2: Run format**

Run: `pnpm format`

- [ ] **Step 3: Run full build**

Run: `moon run plugin-feed:build`

- [ ] **Step 4: Update PLAN.md** — mark Phase 2 items complete with `[x]`.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(plugin-feed): complete Phase 2 implementation"
```
