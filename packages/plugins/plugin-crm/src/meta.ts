//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.crm'),
  name: 'CRM',
  author: 'DXOS',
  description: trim`
    CRM adds a blueprint that drives the AI assistant to research people and
    organizations and produce structured Profile documents stored in your
    local-first ECHO space. Given a Person, Organization, or email Message as
    input, the blueprint locates or creates the corresponding ECHO objects,
    performs web research, and composes a markdown Profile following an editable
    section template (Overview, Background, Current Role, Organization, Key
    Links, Notes, Sources).

    The plugin is a thin composition layer: heavy lifting such as web search,
    document creation, and ECHO database CRUD is delegated to existing
    blueprints from @dxos/assistant-toolkit (research, web-search, database,
    markdown). plugin-crm contributes CRM-specific instructions, a ProfileOf
    ECHO relation that links a Profile document to its subject, a best-effort
    image-attachment operation that uploads avatars and company logos to the
    DXOS image service, and a pluggable ResearchSource contract for future
    extensions.

    Person and Organization records are deduplicated by email address and domain
    before creation, and a free-mail heuristic prevents personal-email senders
    (gmail, outlook, icloud, etc.) from being incorrectly attributed to consumer
    providers. A pure extractContactFromMessage utility parses email signatures
    into structured ContactExtract output, making contact extraction
    regression-testable independently of the LLM loop.

    v1 is a library-layer plugin with no UI surfaces. All customisation is done
    through the blueprint editor: the section template and research instructions
    are editable prose, and additional research sources (such as a planned
    LinkedIn integration via the browser extension) register themselves via the
    ResearchSource contract without modifying the core blueprint.
  `,
  icon: 'ph--address-book--regular',
  iconHue: 'emerald',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-crm',
  spec: 'PLUGIN.mdl',
  tags: ['labs'],
});
