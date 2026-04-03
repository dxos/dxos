# Plugin Feed Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a new FeedPlugin that displays RSS feed subscriptions using ECHO schemas and the existing Mosaic/Card component patterns from plugin-inbox.

**Architecture:** Define `Subscription.Feed` and `Subscription.Post` ECHO schemas (namespaced under `Subscription` to disambiguate from the infrastructure `Feed` concept in `@dxos/echo`). Build a `PostStack` component (modeled on `EventStack` from plugin-inbox) to render posts in a virtual scrolling list, a `FeedArticle` container to bind it to a surface, and a test `Builder` utility to generate fake RSS-like data for storybooks. Register the plugin with `composer-app`.

**Tech Stack:** TypeScript, React, Effect-TS Schema, ECHO (`@dxos/echo`), `@dxos/app-framework`, `@dxos/react-ui-mosaic`, Storybook, Vitest

---

### Task 1: Scaffold the plugin package

**Files:**

- Create: `packages/plugins/plugin-feed/package.json`
- Create: `packages/plugins/plugin-feed/moon.yml`
- Create: `packages/plugins/plugin-feed/tsconfig.json`
- Create: `packages/plugins/plugin-feed/src/meta.ts`
- Create: `packages/plugins/plugin-feed/src/translations.ts`
- Create: `packages/plugins/plugin-feed/src/FeedPlugin.tsx`
- Create: `packages/plugins/plugin-feed/src/index.ts`
- Create: `packages/plugins/plugin-feed/src/types/index.ts`
- Create: `packages/plugins/plugin-feed/src/capabilities/index.ts`
- Create: `packages/plugins/plugin-feed/src/capabilities/react-surface/index.ts`
- Create: `packages/plugins/plugin-feed/src/capabilities/react-surface/react-surface.tsx`
- Create: `packages/plugins/plugin-feed/src/components/index.ts`
- Create: `packages/plugins/plugin-feed/src/containers/index.ts`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "@dxos/plugin-feed",
  "version": "0.8.3",
  "description": "Feed plugin for RSS and open protocol subscriptions.",
  "private": true,
  "homepage": "https://dxos.org",
  "bugs": "https://github.com/dxos/dxos/issues",
  "repository": {
    "type": "git",
    "url": "https://github.com/dxos/dxos"
  },
  "license": "MIT",
  "author": "DXOS.org",
  "sideEffects": true,
  "type": "module",
  "exports": {
    ".": {
      "source": "./src/index.ts",
      "types": "./dist/types/src/index.d.ts",
      "browser": "./dist/lib/browser/index.mjs"
    },
    "./meta": {
      "source": "./src/meta.ts",
      "types": "./dist/types/src/meta.d.ts",
      "browser": "./dist/lib/browser/meta.mjs"
    },
    "./types": {
      "source": "./src/types/index.ts",
      "types": "./dist/types/src/types/index.d.ts",
      "browser": "./dist/lib/browser/types/index.mjs"
    }
  },
  "types": "dist/types/src/index.d.ts",
  "typesVersions": {
    "*": {
      "meta": ["dist/types/src/meta.d.ts"],
      "types": ["dist/types/src/types/index.d.ts"]
    }
  },
  "files": ["dist", "src"],
  "dependencies": {
    "@dxos/app-framework": "workspace:*",
    "@dxos/app-toolkit": "workspace:*",
    "@dxos/echo": "workspace:*",
    "@dxos/plugin-space": "workspace:*",
    "@dxos/util": "workspace:*"
  },
  "devDependencies": {
    "@dxos/random": "workspace:*",
    "@dxos/react-ui": "workspace:*",
    "@dxos/react-ui-mosaic": "workspace:*",
    "@dxos/storybook-utils": "workspace:*",
    "@dxos/ui-theme": "workspace:*",
    "@types/react": "catalog:",
    "@types/react-dom": "catalog:",
    "effect": "catalog:",
    "react": "catalog:",
    "react-dom": "catalog:",
    "vite": "catalog:"
  },
  "peerDependencies": {
    "@dxos/react-ui": "workspace:*",
    "@dxos/react-ui-mosaic": "workspace:*",
    "@dxos/ui-theme": "workspace:*",
    "effect": "catalog:",
    "react": "catalog:",
    "react-dom": "catalog:"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

- [ ] **Step 2: Create `moon.yml`**

```yaml
layer: library
language: typescript
tags:
  - ts-build
  - ts-test
  - ts-test-storybook
  - pack
  - storybook
tasks:
  compile:
    args:
      - '--entryPoint=src/index.ts'
      - '--entryPoint=src/meta.ts'
      - '--entryPoint=src/types/index.ts'
      - '--platform=browser'
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "extends": ["../../../tsconfig.base.json"],
  "compilerOptions": {
    "types": ["node"]
  },
  "exclude": ["*.t.ts", "vite.config.ts"],
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/*.ts"],
  "references": [
    {
      "path": "../../common/random"
    },
    {
      "path": "../../common/storybook-utils"
    },
    {
      "path": "../../common/util"
    },
    {
      "path": "../../core/echo/echo"
    },
    {
      "path": "../../sdk/app-framework"
    },
    {
      "path": "../../sdk/app-toolkit"
    },
    {
      "path": "../../ui/react-ui"
    },
    {
      "path": "../../ui/react-ui-mosaic"
    },
    {
      "path": "../../ui/ui-theme"
    },
    {
      "path": "../plugin-space"
    }
  ]
}
```

- [ ] **Step 4: Create `src/meta.ts`**

```typescript
//
// Copyright 2025 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.feed',
  name: 'Feed',
  description: trim`
    Manage and display RSS and open protocol feed subscriptions.
  `,
  icon: 'ph--rss--regular',
  iconHue: 'orange',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-feed',
  tags: ['labs'],
};
```

- [ ] **Step 5: Create stub `src/translations.ts`**

```typescript
//
// Copyright 2025 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin name': 'Feed',
        'empty feed message': 'No posts yet',
      },
    },
  },
] as const satisfies Resource[];
```

- [ ] **Step 6: Create stub barrel files**

`src/types/index.ts`:

```typescript
//
// Copyright 2025 DXOS.org
//
```

`src/components/index.ts`:

```typescript
//
// Copyright 2025 DXOS.org
//
```

`src/containers/index.ts`:

```typescript
//
// Copyright 2025 DXOS.org
//
```

`src/capabilities/react-surface/react-surface.tsx`:

```typescript
//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';

import { meta } from '../../meta';

export default Capability.makeModule(() => Effect.succeed(Capability.contributes(Capabilities.ReactSurface, [])));
```

`src/capabilities/react-surface/index.ts`:

```typescript
//
// Copyright 2025 DXOS.org
//

export { default as ReactSurface } from './react-surface';
```

`src/capabilities/index.ts`:

```typescript
//
// Copyright 2025 DXOS.org
//

export * from './react-surface';
```

- [ ] **Step 7: Create `src/FeedPlugin.tsx`**

```typescript
//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const FeedPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
```

- [ ] **Step 8: Create `src/index.ts`**

```typescript
//
// Copyright 2025 DXOS.org
//

export * from './meta';
export * from './FeedPlugin';
```

- [ ] **Step 9: Install dependencies and verify build**

Run: `cd packages/plugins/plugin-feed && pnpm install`
Run: `moon run plugin-feed:build`
Expected: Build succeeds with no errors (ignore DEPOT_TOKEN warning).

- [ ] **Step 10: Commit**

```bash
git add packages/plugins/plugin-feed/
git commit -m "feat(plugin-feed): scaffold plugin package with stub files"
```

---

### Task 2: Define Subscription.Feed and Subscription.Post schemas

**Files:**

- Create: `packages/plugins/plugin-feed/src/types/Subscription.ts`
- Modify: `packages/plugins/plugin-feed/src/types/index.ts`
- Modify: `packages/plugins/plugin-feed/src/translations.ts`
- Modify: `packages/plugins/plugin-feed/src/FeedPlugin.tsx`

- [ ] **Step 1: Create `src/types/Subscription.ts`**

This file defines two ECHO schemas under the `Subscription` namespace to disambiguate from the infrastructure `Feed` in `@dxos/echo`. The `Feed` schema represents an RSS subscription (with a backing ECHO Feed for storing posts). The `Post` schema represents individual feed entries.

```typescript
//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Feed as EchoFeed, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';
import { FeedAnnotation } from '@dxos/schema';

/** Subscription feed schema — an RSS/Atom subscription. */
export const Feed = Schema.Struct({
  /** User-facing title of the feed. */
  name: Schema.String.pipe(Schema.optional),
  /** The URL of the RSS/Atom feed. */
  url: Schema.String.pipe(Schema.optional),
  /** Description of the feed. */
  description: Schema.String.pipe(Schema.optional),
  /** URL of the feed's associated website. */
  link: Schema.String.pipe(Schema.optional),
  /** URL of the feed's icon/image. */
  iconUrl: Schema.String.pipe(Schema.optional),
  /** Backing ECHO feed for posts. */
  feed: Ref.Ref(EchoFeed.Feed).pipe(FormInputAnnotation.set(false)),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.subscription.feed',
    version: '0.1.0',
  }),
  Annotation.IconAnnotation.set({
    icon: 'ph--rss--regular',
    hue: 'orange',
  }),
  FeedAnnotation.set(true),
);

export interface Feed extends Schema.Schema.Type<typeof Feed> {}

/** Checks if a value is a Subscription.Feed object. */
export const instanceOf = (value: unknown): value is Feed => Obj.instanceOf(Feed, value);

/** Creates a Subscription.Feed with a backing ECHO feed. */
export const makeFeed = (props: Omit<Obj.MakeProps<typeof Feed>, 'feed'> = {}): Feed => {
  const echoFeed = EchoFeed.make();
  const subscriptionFeed = Obj.make(Feed, {
    feed: Ref.make(echoFeed),
    ...props,
  });
  Obj.setParent(echoFeed, subscriptionFeed);
  return subscriptionFeed;
};

/** A single post/entry within a subscription feed. */
export const Post = Schema.Struct({
  /** Post title. */
  title: Schema.String.pipe(Schema.optional),
  /** URL link to the original article. */
  link: Schema.String.pipe(Schema.optional),
  /** Plain-text or HTML description/summary. */
  description: Schema.String.pipe(Schema.optional),
  /** Author name. */
  author: Schema.String.pipe(Schema.optional),
  /** ISO 8601 publication date. */
  published: Schema.String.pipe(Schema.optional),
  /** Unique identifier (guid) from the feed. */
  guid: Schema.String.pipe(Schema.optional),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.subscription.post',
    version: '0.1.0',
  }),
  Annotation.IconAnnotation.set({
    icon: 'ph--article--regular',
    hue: 'orange',
  }),
);

export interface Post extends Schema.Schema.Type<typeof Post> {}

/** Creates a Subscription.Post object. */
export const makePost = (props: Obj.MakeProps<typeof Post> = {}): Post => Obj.make(Post, props);
```

- [ ] **Step 2: Update `src/types/index.ts`**

```typescript
//
// Copyright 2025 DXOS.org
//

export * as Subscription from './Subscription';
```

- [ ] **Step 3: Update `src/translations.ts`** to add typename translations

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
      },
      [meta.id]: {
        'plugin name': 'Feed',
        'empty feed message': 'No posts yet',
      },
    },
  },
] as const satisfies Resource[];
```

- [ ] **Step 4: Update `src/FeedPlugin.tsx`** to register schemas and metadata

```typescript
//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';

import { ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Subscription } from './types';

export const FeedPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: [
      {
        id: Subscription.Feed.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Subscription.Feed).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Subscription.Feed).pipe(Option.getOrThrow).hue ?? 'white',
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
  AppPlugin.addSchemaModule({
    schema: [Subscription.Feed, Subscription.Post],
  }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
```

- [ ] **Step 5: Build and verify**

Run: `moon run plugin-feed:build`
Expected: Build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/plugins/plugin-feed/src/types/ packages/plugins/plugin-feed/src/translations.ts packages/plugins/plugin-feed/src/FeedPlugin.tsx
git commit -m "feat(plugin-feed): add Subscription.Feed and Subscription.Post ECHO schemas"
```

---

### Task 3: Create PostStack component

**Files:**

- Create: `packages/plugins/plugin-feed/src/components/PostStack/PostStack.tsx`
- Create: `packages/plugins/plugin-feed/src/components/PostStack/index.ts`
- Modify: `packages/plugins/plugin-feed/src/components/index.ts`

- [ ] **Step 1: Create `src/components/PostStack/PostStack.tsx`**

Modeled directly on `EventStack` from plugin-inbox, but rendering `Subscription.Post` objects.

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
// PostTile
//

export type PostStackAction = { type: 'current'; postId: string };

export type PostStackActionHandler = (action: PostStackAction) => void;

type PostTileData = {
  post: Subscription.Post;
  onAction?: PostStackActionHandler;
};

type PostTileProps = Pick<MosaicTileProps<PostTileData>, 'data' | 'location' | 'current'>;

const PostTile = forwardRef<HTMLDivElement, PostTileProps>(({ data, location, current }, forwardedRef) => {
  const { post } = data;
  const { setCurrentId } = useMosaicContainer('PostTile');

  const handleCurrentChange = useCallback(() => {
    setCurrentId(post.id);
  }, [post.id, setCurrentId]);

  const published = post.published ? new Date(post.published).toLocaleDateString() : undefined;

  return (
    <Mosaic.Tile asChild classNames='dx-hover dx-current' id={post.id} data={data} location={location}>
      <Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
        <Card.Root ref={forwardedRef}>
          <Card.Content>
            <Card.Row>
              <Card.Text>{post.title ?? 'Untitled'}</Card.Text>
            </Card.Row>
            {post.author && (
              <Card.Row icon='ph--user--regular'>
                <Card.Text classNames='text-xs text-description truncate'>{post.author}</Card.Text>
              </Card.Row>
            )}
            {published && (
              <Card.Row icon='ph--calendar--regular'>
                <Card.Text classNames='text-xs text-description'>{published}</Card.Text>
              </Card.Row>
            )}
            {post.description && (
              <Card.Row>
                <Card.Text classNames='text-xs text-description line-clamp-2'>{post.description}</Card.Text>
              </Card.Row>
            )}
          </Card.Content>
        </Card.Root>
      </Focus.Item>
    </Mosaic.Tile>
  );
});

PostTile.displayName = 'PostTile';

//
// PostStack
//

export type PostStackProps = {
  id: string;
  posts?: Subscription.Post[];
  currentId?: string;
  onAction?: PostStackActionHandler;
};

export const PostStack = composable<HTMLDivElement, PostStackProps>(
  ({ posts = [], currentId, onAction, ...props }, forwardedRef) => {
    const [viewport, setViewport] = useState<HTMLElement | null>(null);
    const items = useMemo(() => posts.map((post) => ({ post, onAction })), [posts, onAction]);

    const handleCurrentChange = useCallback(
      (id: string | undefined) => {
        if (id) {
          onAction?.({ type: 'current', postId: id });
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
                Tile={PostTile}
                classNames='my-2'
                gap={8}
                items={items}
                draggable={false}
                getId={(item) => item.post.id}
                getScrollElement={() => viewport}
                estimateSize={() => 120}
              />
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Mosaic.Container>
      </Focus.Group>
    );
  },
);

PostStack.displayName = 'PostStack';
```

- [ ] **Step 2: Create `src/components/PostStack/index.ts`**

```typescript
//
// Copyright 2025 DXOS.org
//

export * from './PostStack';
```

- [ ] **Step 3: Update `src/components/index.ts`**

```typescript
//
// Copyright 2025 DXOS.org
//

export * from './PostStack';
```

- [ ] **Step 4: Build and verify**

Run: `moon run plugin-feed:build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-feed/src/components/
git commit -m "feat(plugin-feed): add PostStack component for virtual scrolling post list"
```

---

### Task 4: Create FeedArticle container and wire to react-surface

**Files:**

- Create: `packages/plugins/plugin-feed/src/containers/FeedArticle/FeedArticle.tsx`
- Create: `packages/plugins/plugin-feed/src/containers/FeedArticle/index.ts`
- Modify: `packages/plugins/plugin-feed/src/containers/index.ts`
- Modify: `packages/plugins/plugin-feed/src/capabilities/react-surface/react-surface.tsx`

- [ ] **Step 1: Create `src/containers/FeedArticle/FeedArticle.tsx`**

This container receives a `Subscription.Feed` subject, queries its backing ECHO feed for posts, and renders a `PostStack`.

```typescript
//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';

import { PostStack, type PostStackAction } from '../../components';
import { type Subscription } from '../../types';

export type FeedArticleProps = SurfaceComponentProps<Subscription.Feed>;

export const FeedArticle = ({ role, subject }: FeedArticleProps) => {
  const [currentPostId, setCurrentPostId] = useState<string>();
  const feed = subject.feed?.target;
  const posts = useQuery<Subscription.Post>(
    Obj.getDatabase(subject),
    feed ? Query.select(Filter.type(Subscription.Post)).from(feed) : Filter.nothing(),
  );

  const handleAction = useCallback((action: PostStackAction) => {
    if (action.type === 'current') {
      setCurrentPostId(action.postId);
    }
  }, []);

  return (
    <Panel.Root role={role} className='dx-document'>
      <Panel.Content>
        <PostStack
          id={subject.id}
          posts={posts}
          currentId={currentPostId}
          onAction={handleAction}
        />
      </Panel.Content>
    </Panel.Root>
  );
};
```

- [ ] **Step 2: Create `src/containers/FeedArticle/index.ts`**

```typescript
//
// Copyright 2025 DXOS.org
//

export * from './FeedArticle';
```

- [ ] **Step 3: Update `src/containers/index.ts`**

```typescript
//
// Copyright 2025 DXOS.org
//

export * from './FeedArticle';
```

- [ ] **Step 4: Update `src/capabilities/react-surface/react-surface.tsx`**

```typescript
//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';

import { FeedArticle } from '../../containers';
import { meta } from '../../meta';
import { Subscription } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}.subscription-feed`,
        role: ['article'],
        filter: (data): data is { subject: Subscription.Feed; attendableId?: string } =>
          Subscription.instanceOf(data.subject),
        component: ({ data, role }) => (
          <FeedArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
    ]),
  ),
);
```

- [ ] **Step 5: Build and verify**

Run: `moon run plugin-feed:build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add packages/plugins/plugin-feed/src/containers/ packages/plugins/plugin-feed/src/capabilities/
git commit -m "feat(plugin-feed): add FeedArticle container with react-surface binding"
```

---

### Task 5: Create testing Builder utility

**Files:**

- Create: `packages/plugins/plugin-feed/src/testing/builder.ts`
- Create: `packages/plugins/plugin-feed/src/testing/index.ts`

- [ ] **Step 1: Create `src/testing/builder.ts`**

A chainable builder (modeled on plugin-inbox's `Builder`) that generates fake `Subscription.Post` objects and optionally a `Subscription.Feed`.

````typescript
//
// Copyright 2025 DXOS.org
//

import { subDays } from 'date-fns';

import { faker } from '@dxos/random';

import { Subscription } from '../types';

export type DateRange = {
  start?: Date;
  end?: Date;
};

export type BuilderOptions = {
  posts?: DateRange;
};

export type BuildResult = {
  feed: Subscription.Feed;
  posts: Subscription.Post[];
};

/**
 * Chainable builder for creating test feed data.
 *
 * @example
 * ```ts
 * const { feed, posts } = new Builder()
 *   .createPosts(50)
 *   .build();
 * ```
 */
export class Builder {
  private readonly _posts: Subscription.Post[] = [];
  private readonly _postRange: Required<DateRange>;
  private _feedName: string;
  private _feedUrl: string;

  constructor({ posts }: BuilderOptions = {}) {
    const now = new Date();
    this._postRange = {
      start: posts?.start ?? subDays(now, 30),
      end: posts?.end ?? now,
    };
    this._feedName = faker.company.name() + ' Blog';
    this._feedUrl = faker.internet.url();
  }

  private _randomTimeInRange(range: Required<DateRange>): Date {
    const rangeMs = range.end.getTime() - range.start.getTime();
    return new Date(range.start.getTime() + Math.random() * rangeMs);
  }

  /** Creates a single post with random data. */
  createPost(): this {
    const published = this._randomTimeInRange(this._postRange);
    this._posts.push(
      Subscription.makePost({
        title: faker.lorem.sentence({ min: 4, max: 10 }),
        link: faker.internet.url(),
        description: faker.lorem.paragraph({ min: 1, max: 3 }),
        author: faker.person.fullName(),
        published: published.toISOString(),
        guid: faker.string.uuid(),
      }),
    );
    return this;
  }

  /** Creates multiple posts with random data. */
  createPosts(count: number): this {
    for (let index = 0; index < count; index++) {
      this.createPost();
    }
    return this;
  }

  /** Builds the result: a feed and sorted posts. */
  build(): BuildResult {
    const feed = Subscription.makeFeed({
      name: this._feedName,
      url: this._feedUrl,
      description: faker.lorem.sentence(),
    });

    const sortedPosts = [...this._posts].sort((postA, postB) =>
      (postB.published ?? '').localeCompare(postA.published ?? ''),
    );

    return { feed, posts: sortedPosts };
  }
}
````

- [ ] **Step 2: Create `src/testing/index.ts`**

```typescript
//
// Copyright 2025 DXOS.org
//

export * from './builder';
```

- [ ] **Step 3: Build and verify**

Run: `moon run plugin-feed:build`
Expected: Build succeeds.

Note: We need to add `date-fns` if not already available. Check the catalog:
Run: `grep 'date-fns' pnpm-workspace.yaml` (from repo root)
If it exists in the catalog, add it:
Run: `pnpm add --filter "@dxos/plugin-feed" --save-catalog "date-fns"`
Also add `@dxos/random`:
Run: `pnpm add --filter "@dxos/plugin-feed" --save-catalog "@dxos/random"` — but since `@dxos/random` is a workspace package, it's already in devDependencies as `workspace:*`.

- [ ] **Step 4: Commit**

```bash
git add packages/plugins/plugin-feed/src/testing/
git commit -m "feat(plugin-feed): add test Builder utility for generating fake feed data"
```

---

### Task 6: Create PostStack storybook

**Files:**

- Create: `packages/plugins/plugin-feed/src/components/PostStack/PostStack.stories.tsx`

- [ ] **Step 1: Create `src/components/PostStack/PostStack.stories.tsx`**

```typescript
//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';

import { Builder } from '../../testing';

import { PostStack, type PostStackProps } from './PostStack';

const PostStackStory = (props: Omit<PostStackProps, 'id' | 'posts'>) => {
  const { posts } = useMemo(() => new Builder().createPosts(100).build(), []);
  return <PostStack id='story' posts={posts} {...props} />;
};

const meta: Meta<typeof PostStackStory> = {
  title: 'plugins/plugin-feed/components/PostStack',
  component: PostStackStory,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [withTheme(), withLayout({ layout: 'column' }), withAttention(), withMosaic()],
};

export const Responsive: Story = {
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'w-[30rem]' }), withAttention(), withMosaic()],
};
```

- [ ] **Step 2: Verify storybook builds**

Run: `moon run plugin-feed:build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/plugin-feed/src/components/PostStack/PostStack.stories.tsx
git commit -m "feat(plugin-feed): add PostStack storybook stories"
```

---

### Task 7: Create FeedArticle storybook

**Files:**

- Create: `packages/plugins/plugin-feed/src/containers/FeedArticle/FeedArticle.stories.tsx`

- [ ] **Step 1: Create `src/containers/FeedArticle/FeedArticle.stories.tsx`**

Since `FeedArticle` depends on `useQuery` (ECHO reactive queries), the storybook story should use a simpler wrapper that renders the `PostStack` directly with test data, rather than requiring a full ECHO client setup.

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

import { PostStack, type PostStackAction } from '../../components';
import { Builder } from '../../testing';

/** Standalone FeedArticle story that renders PostStack with generated test data. */
const FeedArticleStory = () => {
  const { feed, posts } = useMemo(() => new Builder().createPosts(50).build(), []);
  const [currentPostId, setCurrentPostId] = useState<string>();

  const handleAction = (action: PostStackAction) => {
    if (action.type === 'current') {
      setCurrentPostId(action.postId);
    }
  };

  return (
    <Panel.Root role='article' className='dx-document'>
      <Panel.Content>
        <div className='p-2 border-b border-separator'>
          <h2 className='text-lg font-medium'>{feed.name}</h2>
          {feed.description && <p className='text-sm text-description'>{feed.description}</p>}
        </div>
        <PostStack id='story-feed' posts={posts} currentId={currentPostId} onAction={handleAction} />
      </Panel.Content>
    </Panel.Root>
  );
};

const meta: Meta<typeof FeedArticleStory> = {
  title: 'plugins/plugin-feed/containers/FeedArticle',
  component: FeedArticleStory,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [withTheme(), withLayout({ layout: 'column' }), withAttention(), withMosaic()],
};
```

- [ ] **Step 2: Build and verify**

Run: `moon run plugin-feed:build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/plugin-feed/src/containers/FeedArticle/FeedArticle.stories.tsx
git commit -m "feat(plugin-feed): add FeedArticle storybook story"
```

---

### Task 8: Register plugin with composer-app

**Files:**

- Modify: `packages/apps/composer-app/package.json`
- Modify: `packages/apps/composer-app/src/plugin-defs.tsx`
- Modify: `packages/apps/composer-app/tsconfig.json`

- [ ] **Step 1: Add dependency to `packages/apps/composer-app/package.json`**

Add to `dependencies` (alphabetically, after `@dxos/plugin-explorer`):

```json
"@dxos/plugin-feed": "workspace:*",
```

- [ ] **Step 2: Update `packages/apps/composer-app/src/plugin-defs.tsx`**

Add import (alphabetically, after `ExplorerPlugin` import on line 22):

```typescript
import { FeedPlugin } from '@dxos/plugin-feed';
```

Add to `getDefaults()` function in the labs section (after line 143, inside the `(isDev || isLabs) && [` block):

```typescript
FeedPlugin.meta.id,
```

Add to `getPlugins()` return array (alphabetically, after `ExplorerPlugin()` on line 191):

```typescript
FeedPlugin(),
```

- [ ] **Step 3: Update `packages/apps/composer-app/tsconfig.json`**

Add reference (alphabetically, in the references array):

```json
{
  "path": "../../plugins/plugin-feed"
}
```

- [ ] **Step 4: Install and build**

Run: `pnpm install` (from repo root)
Run: `moon run plugin-feed:build`
Run: `moon run composer-app:build`
Expected: Both builds succeed.

- [ ] **Step 5: Commit**

```bash
git add packages/apps/composer-app/package.json packages/apps/composer-app/src/plugin-defs.tsx packages/apps/composer-app/tsconfig.json
git commit -m "feat(plugin-feed): register FeedPlugin with composer-app"
```

---

### Task 9: Lint, final build check, and update PLAN.md

**Files:**

- Modify: `packages/plugins/plugin-feed/PLAN.md`

- [ ] **Step 1: Run linter**

Run: `moon run plugin-feed:lint -- --fix`
Expected: No errors (warnings are OK).

- [ ] **Step 2: Run full build**

Run: `moon run plugin-feed:build`
Expected: Build succeeds.

- [ ] **Step 3: Update PLAN.md checkboxes**

Mark all Phase 1 items as complete with `[x]`.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat(plugin-feed): complete Phase 1 implementation"
```
