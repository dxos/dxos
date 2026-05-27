//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: DXN.make('org.dxos.plugin.mermaid'),
  name: 'Mermaid',
  author: 'DXOS',
  description: trim`
    Generate diagrams from simple text-based definitions using Mermaid syntax.
    Create flowcharts, sequence diagrams, class diagrams, state diagrams, entity-relationship
    diagrams, Gantt charts, pie charts, Git graphs, mindmaps, and timelines — all from
    plain-text source embedded directly in your documents.

    The plugin integrates with the markdown editor as a CodeMirror extension.
    Any fenced code block tagged with the \`mermaid\` language identifier is automatically
    detected and replaced with a live SVG preview rendered by the Mermaid JS library.
    The raw source is revealed for editing whenever the cursor moves inside the block,
    then the rendered diagram is restored when the cursor moves away, providing a seamless
    live-preview experience without leaving the editor.

    Diagram rendering adapts to the editor's current color scheme: dark-mode documents
    use Mermaid's dark theme while light-mode documents use the neutral theme.
    Parse and render errors are shown inline in place of the diagram so that
    invalid syntax is immediately visible without disrupting the rest of the document.
  `,
  icon: 'ph--anchor-simple--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-mermaid',
  spec: 'PLUGIN.mdl',
};
