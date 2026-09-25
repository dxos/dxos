//
// Copyright 2026 DXOS.org
//

import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { type Extension } from '@codemirror/state';
import { flowchartTags, mermaid as mermaidLanguage, mermaidTags } from 'codemirror-lang-mermaid';

export type MermaidHighlightOptions = {};

/**
 * `codemirror-lang-mermaid` emits its own tags rather than the standard `@lezer/highlight` ones, so
 * no default highlight style matches them and the source renders unstyled without this.
 *
 * Only the distinctions worth drawing are styled — header, connectors, labels, comments — and the
 * rest inherits, as in `markdownHighlightStyle`. Classes are semantic theme tokens so the palette
 * follows light/dark rather than pinning syntax hues.
 */
export const mermaidHighlightStyle = (_options: MermaidHighlightOptions = {}) =>
  HighlightStyle.define([
    // `flowchart`/`graph` and its direction, plus the `subgraph`/`end` keywords.
    {
      tag: [mermaidTags.diagramName, flowchartTags.diagramName, flowchartTags.keyword, flowchartTags.orientation],
      class: 'text-primary-500',
    },
    // Connectors recede; the nodes they join are the content. `link` is the arrow itself (`-->`),
    // so it must not be underlined — that reads as a hyperlink.
    { tag: [flowchartTags.link, flowchartTags.nodeEdge], class: 'text-subdued' },
    // Labels, on nodes and on edges. Node ids are left inheriting, as the backbone of the source.
    {
      tag: [flowchartTags.nodeText, flowchartTags.nodeEdgeText, flowchartTags.string, flowchartTags.number],
      class: 'text-accent',
    },
    { tag: [flowchartTags.lineComment], class: 'text-description' },
  ]);

/**
 * Mermaid language support for a document that is entirely mermaid. For a fenced block inside
 * markdown use `createMarkdownExtensions`, which registers mermaid as a fenced-code language.
 */
export const createMermaidExtensions = (options: MermaidHighlightOptions = {}): Extension[] => [
  mermaidLanguage(),
  syntaxHighlighting(mermaidHighlightStyle(options)),
];
