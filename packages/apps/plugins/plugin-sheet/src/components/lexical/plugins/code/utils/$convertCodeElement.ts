//
// Copyright 2024 DXOS.org
//

import { type DOMConversionOutput } from 'lexical';

import $createCodeNode from './$createCodeNode';

export default (domNode: HTMLElement): DOMConversionOutput | null => {
  const textContent = domNode.textContent;
  if (textContent !== null) {
    const node = $createCodeNode();
    return {
      node,
    };
  }

  return null;
};
