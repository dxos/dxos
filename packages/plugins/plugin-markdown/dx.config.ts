//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.markdown',
    name: 'Markdown',
    author: 'DXOS',
    description: trim`
      A full-featured markdown editor for authoring documents in your space. Edits flow through a collaborative CodeMirror surface backed by ECHO Text, so every keystroke replicates to other peers in real time without merge conflicts or lost work.

      Documents can be opened in source, preview, or read-only mode and rendered as a full-surface article or as embeddable cards. An optional formatting toolbar exposes headings, lists, links, and other common markdown actions, and dispositional toolbar actions contributed by other plugins are surfaced inline alongside it.

      The editor integrates with the rest of the workspace through @ references that link to any ECHO object, image and file uploads stored in the active space, and anchored comment threads on text ranges. Comments can optionally be routed to an AI agent on every message or only on @mention.

      A built-in skill exposes create, open, and update operations as tools for AI agents. Updates are applied as compact find-and-replace diffs against the document, making it safe for agents to edit large documents incrementally while you continue collaborating.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-markdown',
    icon: { key: 'ph--text-aa--regular', hue: 'indigo' },
    screenshots: [
      {
        dark: 'https://customer-5rxcjpyab08avpmn.cloudflarestream.com/cdf2656365bb1fd327c1fc2105d75e5a/iframe?poster=https%3A%2F%2Fcustomer-5rxcjpyab08avpmn.cloudflarestream.com%2Fcdf2656365bb1fd327c1fc2105d75e5a%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D%26height%3D600',
      },
      { dark: 'https://dxos.network/plugin-details-markdown-dark.png' },
    ],
  },
});
