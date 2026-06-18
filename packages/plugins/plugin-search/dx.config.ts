//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.search',
    name: 'Search',
    description: trim`
      Full-text search engine for finding content across all spaces and object types in DXOS Composer.
      The plugin provides a global command-palette style dialog (invoked via the OpenSearch operation)
      that debounces user input and matches it against every field of every ECHO object in the active
      space, returning ranked results with field-level match context.

      A persistent SearchArticle panel can be pinned in the deck companion sidebar so the query stays
      visible while navigating documents. Both surfaces share a SearchContextProvider that drives the
      GlobalFilterProvider, allowing any view that uses useGlobalFilteredObjects to automatically show
      only the objects matching the current query.

      Web search is available through the Exa integration: when an API key is configured, the plugin
      can fetch and rank external web results alongside local objects. The results are structured with
      URL, title, and snippet fields ready for use in Composer documents.

      All search operations are registered through the standard DXOS operations system and can be
      wired into keyboard shortcuts, command palettes, and AI assistants via the OperationHandlerSet.
    `,
    icon: { key: 'ph--magnifying-glass--regular', hue: 'rose' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-search',
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
});
