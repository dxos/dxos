//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.crm',
    name: 'CRM',
    author: 'DXOS',
    description: trim`
      CRM maintains Person and Organization records with linked markdown Profile
      documents in your local-first ECHO space. Deterministic operations do the
      structural work: Process mailbox extracts contacts from a mailbox's new
      messages against a durable feed cursor (with the same extraction gate and
      identity-based dedup as mail sync), and Research person / Research
      organization scaffold a Profile document skeleton linked to its subject via
      a ProfileOf ECHO relation. A skill composes those operations with the
      web-search, database, and markdown skills so the AI assistant can enrich
      profiles with researched content.

      The plugin is a thin composition layer: contact-extraction semantics come
      from @dxos/extractor-lib, cursoring from @dxos/link, and heavy lifting such
      as web search, document creation, and ECHO database CRUD is delegated to
      existing skills from @dxos/assistant-toolkit. plugin-crm additionally
      contributes a best-effort image-attachment operation that uploads avatars
      and company logos to the DXOS image service, project/automation templates
      that run CRM processing when new mail arrives, and a pluggable
      ResearchSource contract for future extensions (such as a planned LinkedIn
      integration via the browser extension).
    `,
    icon: { key: 'ph--address-book--regular', hue: 'rose' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-crm',
    spec: 'PLUGIN.mdl',
    dependsOn: ['org.dxos.plugin.inbox'],
    tags: ['alpha'],
  },
});
