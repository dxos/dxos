//
// Copyright 2025 DXOS.org
//

import * as Toolkit from 'effect/unstable/ai/Toolkit';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { SpaceProperties } from '@dxos/client-protocol';
import * as Skill from '@dxos/compute/Skill';
import { Collection, Feed } from '@dxos/echo';
import { HasSubject } from '@dxos/types';

import { MarkdownOperationHandlerSet } from '#operations';
import { Markdown } from '#types';

export * as MarkdownPlugin from './MarkdownPlugin.testing.ts';

export const testToolkit = Toolkit.empty as Toolkit.Toolkit<any>;

/**
 * Shared layer for the operation tests: every markdown handler and the types they touch, with no
 * language model. Defined once so a `.test.ts` per handler does not restate it.
 */
export const OperationTestLayer = AssistantTestLayer({
  operationHandlers: MarkdownOperationHandlerSet.handlers,
  types: [SpaceProperties, Collection.Collection, Skill.Skill, Markdown.Document, HasSubject.HasSubject, Feed.Feed],
  disableLlmMemoization: true,
});
