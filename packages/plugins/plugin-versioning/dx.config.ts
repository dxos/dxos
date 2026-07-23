//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.versioning',
    name: 'Versioning',
    author: 'DXOS',
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-versioning',
    spec: 'PLUGIN.mdl',
    description: trim`
      Provides a generic version and review layer for workspace objects. Any object type can opt in
      to the history companion by contributing a HistoryProvider that resolves the versioned Text
      root, gaining a git-graph timeline of checkpoints, branch forks, and merges.

      Version selection, branch view, and per-document review mode (editing / suggesting / viewing)
      are kept as in-memory, per-user session state that is never replicated, so collaborators can
      each read their own revision without affecting others. A default review-render policy maps the
      review mode to the editor's render config (suggestions, comments, editability) with GDocs
      parity; plugins may override it by contributing a stronger policy earlier in plugin order.
    `,
    icon: { key: 'ph--git-branch--regular', hue: 'amber' },
    tags: ['system'],
  },
});
