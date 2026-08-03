//
// Copyright 2025 DXOS.org
//

import * as Toolkit from '@effect/ai/Toolkit';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { SpaceProperties } from '@dxos/client-protocol';
import { Skill } from '@dxos/compute';
import { Collection, Feed } from '@dxos/echo';
import { HasSubject } from '@dxos/types';

import { MarkdownOperationHandlerSet } from '#operations';
import { Markdown } from '#types';

// Eager re-export of `MarkdownPlugin`. See `@dxos/plugin-testing/src/core.ts`
// for the rationale. Uses the `#plugin` subpath so the node-only build is
// re-exported in test environments, avoiding the browser-only `MarkdownPlugin.tsx`
// which references React-surface capabilities that are intentionally omitted
// from `capabilities/node.ts`.
export * from '#plugin';

export const testToolkit = Toolkit.empty as Toolkit.Toolkit<any>;

/**
 * Shared layer for the operation tests: every markdown handler and the types they touch, with no
 * language model. Defined once so a `.test.ts` per handler does not restate it.
 */
export const OperationTestLayer = AssistantTestLayer({
  operationHandlers: MarkdownOperationHandlerSet,
  types: [SpaceProperties, Collection.Collection, Skill.Skill, Markdown.Document, HasSubject.HasSubject, Feed.Feed],
  disableLlmMemoization: true,
});
