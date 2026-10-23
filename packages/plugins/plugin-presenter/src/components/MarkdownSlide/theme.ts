//
// Copyright 2026 DXOS.org
//

/** Classes for the 2560×1440 slide canvas (`SlideFrame` scales it to fit). */
export const theme = {
  root: 'dx-attention-surface leading-relaxed font-mono',

  padding: 'px-40 py-16',

  nodes: {
    h1: 'text-[80px] text-accent-text',
    h2: 'text-[60px] text-accent-text',
    h3: 'text-[48px] text-accent-text',
    h4: 'text-[40px] uppercase',

    p: 'text-[48px]',
    a: 'text-accent-text underline',
    blockquote: 'my-[16px] ps-12 border-l-[8px] border-accent-text text-[56px] italic',
    img: 'max-w-full max-h-full object-contain',

    ul: 'my-[16px] ml-12 leading-relaxed list-disc',
    ol: 'my-[16px] ml-24 leading-relaxed list-decimal',
    li: 'pl-6 text-[48px]',

    table: 'my-[32px] text-[40px] border-collapse',
    th: 'px-6 py-2 border border-separator text-left',
    td: 'px-6 py-2 border border-separator',

    pre: 'w-full mx-0 my-[32px] p-4 bg-input-surface',
    code: 'p-0 text-[40px]',
    inlineCode: 'px-2 rounded-sm bg-input-surface text-info-text',
  },

  /** Static `{2,4-5}` line highlights; other lines are dimmed as in Slidev. */
  line: {
    highlighted: 'block bg-hover-surface',
    dimmed: 'block opacity-40',
  },
};
