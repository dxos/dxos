//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.assistant'),
  name: 'Assistant',
  author: 'DXOS',
  description: trim`
    AssistantPlugin brings a conversational AI assistant into DXOS Composer, letting users chat naturally
    with objects in their spaces. Every Chat is a first-class ECHO object — messages are persisted,
    replicated across peers in real time, and can be bound to any document or collection as a companion
    panel that appears alongside the primary view.

    AI capabilities are delivered through a flexible multi-provider model layer. Users can route requests
    to the DXOS Edge service, a locally running Ollama instance, or LM Studio, and switch providers at
    any time in Settings. Each provider can be configured with a preferred model, and the runtime
    automatically falls back when a provider is unavailable.

    Blueprints give every chat a specialised identity. Built-in blueprints cover general assistance,
    web browsing, database interaction, web search, Discord and Linear integration, autonomous agents,
    planning, memory, automation, and a wizard for authoring new blueprints. Binding a blueprint
    changes the system instructions and the tool set exposed to the model in a single step.

    Tool execution runs through the DXOS compute runtime so every AI action — opening a document,
    searching the web, querying a database — produces a structured execution trace. The optional
    TracePanel visualises that trace as a commit graph or raw JSON, giving developers full observability
    into what the model did and why.
  `,
  icon: 'ph--sparkle--regular',
  iconHue: 'sky',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-assistant',
  spec: 'PLUGIN.mdl',
});

export const ASSISTANT_DIALOG = DXN.make(`${meta.id}.assistantDialog`);

/** Companion variant identifier for the assistant chat panel. */
export const ASSISTANT_COMPANION_VARIANT = 'assistant-chat';

/** Local segment id for the per-space home virtual node (one per space, under the space node). */
export const SPACE_HOME_NODE_ID = 'home';

/** Type tag for the per-space home virtual node. */
export const SPACE_HOME_NODE_TYPE = `${meta.id}.space-home-node`;

/**
 * Prefix for the home node's surface subject. The space id is appended so each space's home node
 * resolves to its own space (`${SPACE_HOME_SUBJECT_PREFIX}${space.id}`).
 */
export const SPACE_HOME_SUBJECT_PREFIX = `${meta.id}/home/`;
