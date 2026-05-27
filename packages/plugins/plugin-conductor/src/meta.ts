//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.conductor',
  name: 'Conductor',
  author: 'DXOS',
  description: trim`
    Conductor is a visual node-based compute graph plugin for DXOS Composer.
    It lets you compose reactive data pipelines by connecting typed input and output ports on a
    drag-and-drop infinite canvas — no code required for common automation patterns.

    Each node in the graph is a first-class ECHO object, so the full pipeline topology is
    replicated to every collaborator in real time via the local-first runtime.
    Built-in node types cover constants, templates, boolean logic, control flow, JSON transforms,
    ECHO database access, append-only queues, and conversation threads.

    AI orchestration is a first-class concern: the GPT node connects to plugin-assistant's AiService
    and supports tool calling, streaming replies, and configurable system prompts.
    Function nodes can invoke any Blueprint operation registered in the space, making it straightforward
    to compose multi-step agent workflows visually and share them across teams.
  `,
  icon: 'ph--infinity--regular',
  iconHue: 'sky',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-conductor',
  spec: 'PLUGIN.mdl',
  tags: ['labs'],
  screenshots: ['https://dxos.network/plugin-details-canvas-dark.png'],
};
