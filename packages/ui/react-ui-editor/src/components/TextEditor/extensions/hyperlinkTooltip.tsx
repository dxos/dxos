//
// Copyright 2023 DXOS.org
//

import { hoverTooltip } from '@codemirror/view';

import { tooltipContent } from '@dxos/react-ui-theme';

const markdownLinkRegexp = /\[([^\]]+)]\(([^)]+)\)/;

export type OnHyperlinkHover = (el: Element, url: string) => void;

/**
 * https://codemirror.net/examples/tooltip
 * https://codemirror.net/docs/ref/#view.hoverTooltip
 * https://github.com/codemirror/view/blob/main/src/tooltip.ts
 */
// TODO(burdon): Create config object.
export const createHyperlinkTooltip = (onHover: OnHyperlinkHover, regexp = markdownLinkRegexp) =>
  hoverTooltip((view, pos) => {
    const { from, text } = view.state.doc.lineAt(pos);
    const p = pos - from;

    let idx = 0;
    let match;
    do {
      match = text.substring(idx).match(regexp);
      if (!match) {
        match = undefined;
        break;
      }

      idx = text.indexOf(match[0]);
      if (p >= idx && p < idx + match[0].length) {
        break;
      }

      idx += match[0].length;
    } while (true);

    if (!match) {
      return null;
    }

    const [, , url] = match ?? [];

    return {
      pos: idx + from,
      end: idx + from + match[0].length,
      above: true,
      create: () => {
        const el = document.createElement('a');
        el.innerText = '_'; // Required so doesn't collapse.
        el.className = tooltipContent({}, 'mb-2 p-1');
        el.setAttribute('target', '_blank');
        el.setAttribute('href', url);
        onHover(el, url);
        return { dom: el };
      },
    };
  });
