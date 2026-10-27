//
// Copyright 2026 DXOS.org
//

/** Classes for the 2560×1440 slide canvas (`SlideFrame` scales it to fit); colors and fonts come from `--slide-*` variables. */
export const theme = {
  root: 'leading-relaxed',

  padding: 'px-40 py-16',

  nodes: {
    // Headings set tight, so a title that wraps takes two short lines rather than the body's relaxed spacing.
    h1: 'text-[80px] leading-tight text-(color:--slide-accent) font-(family-name:--slide-font-heading)',
    h2: 'text-[60px] leading-tight text-(color:--slide-accent) font-(family-name:--slide-font-heading)',
    h3: 'text-[48px] leading-tight text-(color:--slide-accent) font-(family-name:--slide-font-heading)',
    h4: 'text-[40px] leading-tight uppercase font-(family-name:--slide-font-heading)',

    p: 'text-[48px]',
    a: 'text-(color:--slide-accent) underline',
    blockquote: 'my-[16px] ps-12 border-l-[8px] border-(--slide-accent) text-[56px] italic',
    img: 'max-w-full max-h-full object-contain',

    ul: 'my-[16px] ml-12 leading-relaxed list-disc',
    ol: 'my-[16px] ml-24 leading-relaxed list-decimal',
    li: 'pl-6 text-[48px]',

    table: 'my-[32px] text-[40px] border-collapse',
    th: 'px-6 py-2 border border-(--slide-separator) text-left',
    td: 'px-6 py-2 border border-(--slide-separator)',

    // Important: the highlighter's prism style sets `font-family` and padding inline on the <pre> and its <code>.
    // Clipped: a slide cannot scroll, so a line too long for the box is cut at its padding rather than spilling out.
    pre: 'w-full mx-0 my-[32px] p-12! overflow-hidden! bg-(--slide-code) font-(family-name:--slide-font-mono)! [&_code]:font-(family-name:--slide-font-mono)! [&_.linenumber]:opacity-40',
    code: 'p-0 text-[40px]',
    inlineCode: 'px-2 rounded-sm bg-(--slide-code) text-info-text font-(family-name:--slide-font-mono)',
  },

  /** Static `{2,4-5}` line highlights; other lines are dimmed as in Slidev. */
  line: {
    highlighted: 'block bg-hover-surface',
    dimmed: 'block opacity-40',
  },
};
