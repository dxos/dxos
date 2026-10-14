//
// Copyright 2022 DXOS.org
//

declare module 'rehype-add-classes' {
  export default function Module();
}

declare module 'reveal.js/plugin/markdown/plugin.js' {
  import type Reveal from 'reveal.js';

  export type MarkdownPlugin = Reveal.Plugin & {
    /** Splits each unparsed `section[data-markdown]` under `scope` into one section per slide. */
    processSlides(scope: HTMLElement): Promise<void>;
    /** Renders every unparsed markdown section in the deck to HTML. */
    convertSlides(): Promise<void>;
  };

  export default function Plugin(): MarkdownPlugin;
}

declare module 'reveal.js/plugin/notes/notes.js' {
  export default function Plugin();
}
