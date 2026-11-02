//
// Copyright 2026 DXOS.org
//

import * as Layer from 'effect/Layer';
import * as Registry from 'effect/reactivity/AtomRegistry';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { SpaceProperties } from '@dxos/client-protocol';
import * as Skill from '@dxos/compute/Skill';
import { Collection } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { rootCollectionRule } from '@dxos/plugin-space/testing';
import { Text } from '@dxos/schema';

import { PresenterOperationHandlerSet } from '#operations';
import { Presentation } from '#types';

/** The host's capability manager, carrying the default-parent rule that files a presentation into the root collection. */
const makeCapabilities = () => {
  const manager = CapabilityManager.make({ registry: Registry.make() });
  manager.contribute({ module: 'test', interface: AppCapabilities.DefaultParent, implementation: rootCollectionRule });
  return manager;
};

/** Every presenter handler and the types they touch, with no language model. */
export const OperationTestLayer = AssistantTestLayer({
  extraServices: Layer.succeed(Capability.Service, makeCapabilities()),
  operationHandlers: PresenterOperationHandlerSet,
  types: [
    SpaceProperties,
    Collection.Collection,
    Skill.Skill,
    Presentation.Presentation,
    Presentation.Slide,
    Text.Text,
    Markdown.Document,
  ],
  disableLlmMemoization: true,
});
