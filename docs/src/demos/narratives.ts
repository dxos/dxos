//
// Copyright 2026 DXOS.org
//

/**
 * What a reader is looking at in each demo, by id in `DEMOS`, as HTML: `data`, a sentence or two for its tab on
 * `/echo`, and `plugins` for the PLEX Overview. Kept apart from the demos so that pages read it at build time without
 * loading the plugins.
 */
export type Narrative = { readonly title: string; readonly data: string; readonly plugins: string };

export const NARRATIVES: Record<string, Narrative> = {
  editor: {
    title: 'Collaborative editor',
    data:
      'One document, its text a CRDT, open on both peers. Switch a peer offline, keep typing on both sides, and ' +
      'the edits merge when it comes back.',
    plugins:
      'Each peer runs a small PLEX app: the core plugins, the Space plugin and the Markdown plugin. The Markdown ' +
      'plugin defines the document type and contributes the editor as a surface for it. The app asks for an ' +
      '<code>article</code> surface for the document and renders whichever plugin answers, so nothing else in the ' +
      'app knows about markdown. The editor takes extensions too: the Mermaid plugin contributes one through the ' +
      'Markdown plugin’s extension capability, and it draws each <code>mermaid</code> block as a live diagram. A ' +
      'plugin of your own can add custom widgets to the editor the same way.',
  },
  views: {
    title: 'Table and board',
    data:
      'A table and a board over the same companies. Drag a card on Bob’s board, and the company’s row in ' +
      'Alice’s table changes.',
    plugins:
      'The Table plugin and the Kanban plugin each contribute a surface for their own view type, and both views ' +
      'point at the same companies. Neither plugin imports the other or knows the company type: each reads the ' +
      'fields its view names from the schema. Another plugin that adds a view over the same query shows the same ' +
      'data and the same edits.',
  },
  explorer: {
    title: 'Graph explorer',
    data:
      'A live query drawn as a graph: companies, the people who work at them, and the references between. ' +
      'Hover a node to see its object.',
    plugins:
      'Two plugins split the work. The Explorer plugin renders the graph and, when a node is hovered, asks for a ' +
      'card for that object. The Preview plugin answers with card surfaces for companies and people. The explorer ' +
      'shows any object some plugin has a card for, so a new type gets a card by adding one surface.',
  },
  diagram: {
    title: 'Infinite canvas',
    data:
      'Composer’s architecture as nested drawings, each an ECHO object. Open a box to follow its reference down ' +
      'a level.',
    plugins:
      'The Illustrator plugin owns the drawing type, and the Canvas plugin draws it. Canvas contributes a variant ' +
      'provider capability, which Illustrator looks up when it renders a drawing. Another renderer could ' +
      'contribute its own variant, and the same drawings would open in it with no change to Illustrator. The ' +
      'canvas’s tools are extensible too: other plugins add element kinds and library items through its ' +
      '<code>NodeType</code> and <code>LibraryItem</code> capabilities. ' +
      '<a href="/docs/plex/build-with-a-coding-agent/">Build with a coding agent</a> has prompts for building a ' +
      'plugin like that.',
  },
};
