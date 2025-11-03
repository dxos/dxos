//
// Copyright 2023 DXOS.org
// Copyright CodeMirror
//

import { syntaxTree } from '@codemirror/language';
import { hoverTooltip } from '@codemirror/view';
import { type SyntaxNode } from '@lezer/common';

import { tooltipContent } from '@dxos/react-ui-theme';

import { type RenderCallback } from '../../types';

export const linkTooltip = (renderTooltip: RenderCallback<{ url: string }>) =>
  hoverTooltip(
    (view, pos, side) => {
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
        // NOTE: Forcing above causes the tooltip to flicker.
        // above: true,
        create: () => {
          const el = document.createElement('div');
          el.className = tooltipContent({});
          renderTooltip(el, { url: urlText }, view);
          return { dom: el, offset: { x: 0, y: 4 } };
        },
      };
    },
    {
      // NOTE: 0 = default of 300ms.
      hoverTime: 1,
    },
  );
