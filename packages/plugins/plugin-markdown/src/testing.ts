//
// Copyright 2025 DXOS.org
//

import * as Toolkit from 'effect/ai/Toolkit';
import * as Layer from 'effect/Layer';
import * as Registry from 'effect/reactivity/AtomRegistry';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { SpaceProperties } from '@dxos/client-protocol';
import * as Skill from '@dxos/compute/Skill';
import { Collection, Feed } from '@dxos/echo';
import { rootCollectionRule } from '@dxos/plugin-space/testing';
import { HasSubject } from '@dxos/types';

import { MarkdownOperationHandlerSet } from '#operations';
import { Markdown } from '#types';

export * as MarkdownPlugin from './MarkdownPlugin.testing.ts';

export const testToolkit = Toolkit.empty as Toolkit.Toolkit<any>;

/** The host's capability manager, carrying the default-parent rule that files a document into the root collection. */
const makeCapabilities = () => {
  const manager = CapabilityManager.make({ registry: Registry.make() });
  manager.contribute({ module: 'test', interface: AppCapabilities.DefaultParent, implementation: rootCollectionRule });
  return manager;
};

/**
 * Shared layer for the operation tests: every markdown handler and the types they touch, with no
 * language model. Defined once so a `.test.ts` per handler does not restate it.
 */
export const OperationTestLayer = AssistantTestLayer({
  extraServices: Layer.succeed(Capability.Service, makeCapabilities()),
  operationHandlers: MarkdownOperationHandlerSet.handlers,
  types: [SpaceProperties, Collection.Collection, Skill.Skill, Markdown.Document, HasSubject.HasSubject, Feed.Feed],
  disableLlmMemoization: true,
});
