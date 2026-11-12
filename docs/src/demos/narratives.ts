//
// Copyright 2026 DXOS.org
//

/**
 * What a reader is looking at in each demo, by id in `DEMOS`, as HTML: `data` for `/echo`, `plugins` for the PLEX
 * Overview. Kept apart from the demos so that pages read it at build time without loading the plugins.
 */
export type Narrative = { readonly title: string; readonly data: string; readonly plugins: string };

export const NARRATIVES: Record<string, Narrative> = {
  editor: {
    title: 'Collaborative editor',
    data:
      'The document is one ECHO object, and its text is a CRDT. Alice and Bob each hold a full replica of the ' +
      'space, so each types into their own copy and sees the other’s edits and cursor as they sync. Switch a ' +
      'peer offline and keep typing on both sides: each replica keeps working, and when the peer comes back the ' +
      'edits merge without a conflict to resolve. The diagram is a <code>mermaid</code> block in the same text, ' +
      'so it merges like any other line.',
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
      'The space holds one set of companies. The table and the board are two views over the same query, not two ' +
      'copies of the data, and the board groups the companies by <code>status</code>. Drag a card to another ' +
      'column on Bob’s board and the company’s status changes, so its row in Alice’s table changes too.',
    plugins:
      'The Table plugin and the Kanban plugin each contribute a surface for their own view type, and both views ' +
      'point at the same companies. Neither plugin imports the other or knows the company type: each reads the ' +
      'fields its view names from the schema. Another plugin that adds a view over the same query shows the same ' +
      'data and the same edits.',
  },
  explorer: {
    title: 'Graph explorer',
    data:
      'The graph is a saved query over the companies and the people who work at them. Each node is an object, and ' +
      'each edge is a reference from a person to their company. Hover a node to see the object behind it. The ' +
      'graph follows the query as objects change, so a company added on either peer appears in it.',
    plugins:
      'Two plugins split the work. The Explorer plugin renders the graph and, when a node is hovered, asks for a ' +
      'card for that object. The Preview plugin answers with card surfaces for companies and people. The explorer ' +
      'shows any object some plugin has a card for, so a new type gets a card by adding one surface.',
  },
  diagram: {
    title: 'Infinite canvas',
    data:
      'The diagram is Composer’s architecture as nested drawings: a box with a level beneath it references ' +
      'another drawing. The drawings are ECHO objects in the same space as the other demos, so they sync, merge ' +
      'and work offline like the document and the table. Open a box to follow the reference down a level.',
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
