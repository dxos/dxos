//
// Copyright 2023 DXOS.org
// Copyright CodeMirror
//

import { syntaxTree } from '@codemirror/language';
import { type ChangeSpec } from '@codemirror/state';
import { type EditorView, hoverTooltip } from '@codemirror/view';
import { type SyntaxNode } from '@lezer/common';

import { mx, surfaceShadow } from '@dxos/ui-theme';

import { type RenderCallback } from '../../../types/index.ts';

export type LinkTooltipProps = {
  render: RenderCallback<{ url: string }>;
};

// Internal object links render their own inline/block preview, so a raw-URI hover tooltip is noise.
const INTERNAL_SCHEMES = ['dxn:', 'echo:'];

/**
 * Hover tooltip showing a rendered preview for markdown links (skips internal object URIs).
 */
export const linkTooltip = ({ render }: LinkTooltipProps) => {
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
    if (INTERNAL_SCHEMES.some((scheme) => urlText.startsWith(scheme))) {
      return null;
    }

    return {
      pos: link.from,
      end: link.to,
      above: true,
      create: () => {
        const el = document.createElement('div');
        el.className = tooltipClassName;
        render(el, { url: urlText }, view);
        return { dom: el, offset: { x: 0, y: 4 } };
      },
    };
  });
};

/** Brackets and newlines would terminate the inline link, so they are folded into the label text. */
export const escapeLinkLabel = (label: string): string => label.replace(/[[\]]/g, '').replace(/\s+/g, ' ').trim();

/**
 * Rewrites link labels that have drifted from their target's current label.
 * The document holds the label so that it stays searchable and readable as plain markdown; this
 * reconciles it whenever the caller can resolve a newer one.
 *
 * @param resolve Returns the target's label, or `undefined` when it is unknown (left untouched).
 * @returns true if the document was changed.
 */
export const syncLinkLabels = (view: EditorView, resolve: (url: string) => string | undefined): boolean => {
  const { state } = view;
  const changes: ChangeSpec[] = [];
  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name !== 'Link') {
        return;
      }

      const marks = node.node.getChildren('LinkMark');
      const urlNode = node.node.getChild('URL');
      if (!urlNode || marks.length < 2) {
        return;
      }

      const label = resolve(state.sliceDoc(urlNode.from, urlNode.to));
      if (label === undefined) {
        return;
      }

      const [from, to] = [marks[0].to, marks[1].from];
      const escaped = escapeLinkLabel(label);
      // An empty label leaves `[](url)`, which no longer parses as a Link — the node would then be
      // invisible to this pass, so a later rename could never repair it.
      if (escaped.length > 0 && state.sliceDoc(from, to) !== escaped) {
        changes.push({ from, to, insert: escaped });
      }
    },
  });

  if (changes.length === 0) {
    return false;
  }

  view.dispatch({ changes, userEvent: 'sync.link' });
  return true;
};

const tooltipClassName = mx(
  'inline-flex items-center p-1 max-w-64 text-sm bg-inverse-surface text-inverse-fg rounded-sm',
  surfaceShadow({ elevation: 'positioned' }),
);
