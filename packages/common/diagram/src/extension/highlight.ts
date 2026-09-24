//
// Copyright 2026 DXOS.org
//

import { HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';

/**
 * Fills the gaps the editor's own highlight style leaves. The grammar emits standard
 * `@lezer/highlight` tags, so most of a document is coloured by whatever style the theme installs
 * and inherits its palette — but `vscodeLightStyle`/`vscodeDarkStyle` define neither
 * `attributeValue` nor `null`, which in this language are the enum values (`grey`, `dashed`,
 * `triangle`) and the unbound arrow end. Those are the most scannable part of a diagram, so
 * leaving them uncoloured is the one thing worth overriding.
 *
 * Classes are semantic theme tokens rather than hues, as in `mermaidHighlightStyle`, so light and
 * dark follow the palette.
 */
export const diagramHighlightStyle = () =>
  HighlightStyle.define([
    { tag: tags.attributeValue, class: 'text-accent' },
    { tag: tags.null, class: 'text-subdued' },
  ]);
