//
// Copyright 2023 DXOS.org
// Copyright CodeMirror
//

import { syntaxTree } from '@codemirror/language';
import { hoverTooltip } from '@codemirror/view';
import { type SyntaxNode } from '@lezer/common';

import { mx, surfaceShadow } from '@dxos/ui-theme';

import { type RenderCallback } from '../../types';

const tooltipClassName = mx(
  'inline-flex items-center p-1 max-w-64 text-sm bg-inverse-surface text-inverse-fg rounded-sm',
  surfaceShadow({ elevation: 'positioned' }),
);

export const linkTooltip = (renderTooltip: RenderCallback<{ url: string }>) => {
  return hoverTooltip((view, pos, side) => {
    const syntax = syntaxTree(view.state).resolveInner(pos, side);
    let link = null;
    for (let i = 0, node: SyntaxNode | null = syntax; !link && node && i < 5; node = node.parent, i++) {
      link = node.name === 'Link' ? node : null;
    }

    const url = link && link.getChild('URL');
    if (!url || !link) {
      return null;
    }

    const urlText = view.state.sliceDoc(url.from, url.to);
    if (urlText.startsWith('dxn')) {
      return null;
    }

    return {
      pos: link.from,
      end: link.to,
      above: true,
      create: () => {
        const el = document.createElement('div');
        el.className = tooltipClassName;
        renderTooltip(el, { url: urlText }, view);
        return { dom: el, offset: { x: 0, y: 4 } };
      },
    };
  });
};
