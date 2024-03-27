//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Create theme type and picker.

export const theme = {
  root: 'bg-attention leading-relaxed font-mono',

  padding: 'px-40 py-16 gap-8',

  nodes: {
    h1: 'text-[80px] fg-accent',
    h2: 'text-[60px] fg-accent',
    h3: 'text-[48px] fg-accent',

    p: 'text-[48px]',

    ul: 'my-[16px] ml-12 leading-relaxed list-disc',
    ol: 'my-[16px] ml-24 leading-relaxed list-decimal',
    li: 'pl-6 text-[48px]',

    pre: 'w-full mx-0 my-[32px] p-0 __border-l-[16px] surface-input p-4 __whitespace-pre-line',
    code: 'p-0 text-[40px]',
  },
};
