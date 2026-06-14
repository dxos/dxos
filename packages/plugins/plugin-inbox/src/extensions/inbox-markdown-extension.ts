//
// Copyright 2026 DXOS.org
//

import { EditorView, type Extension, decorateMarkdown } from '@dxos/ui-editor';
import { isTruthy } from '@dxos/util';

import { hideRemoteImages } from './hide-images-extension';
import { replacePatterns } from './replace-patterns-extension';

const INBOX_REPLACE_PATTERNS = [
  // Gmail-style angle-bracket mailto: `<[rich@example.com](mailto:rich@example.com)\>`.
  /<\[([^\]]+)\]\(mailto:\1\)\\>/,
];

export type InboxMarkdownOptions = {
  loadRemoteImages?: boolean;
};

/**
 * Inbox message markdown decorations: styled markdown, dxn-aware skip rules, pattern cleanup,
 * and read-only link handling.
 */
export const inboxMarkdown = ({ loadRemoteImages = false }: InboxMarkdownOptions = {}): Extension[] =>
  [
    openLinksInNewTab,
    !loadRemoteImages && hideRemoteImages(),
    decorateInboxMarkdown(loadRemoteImages),
    replacePatterns(INBOX_REPLACE_PATTERNS),
  ].filter(isTruthy);

const decorateInboxMarkdown = (loadRemoteImages: boolean): Extension =>
  decorateMarkdown({
    skip: (node) => {
      // Skip dxn: links and images entirely (handled by preview()).
      if ((node.name === 'Link' || node.name === 'Image') && node.url.startsWith('dxn:')) {
        return true;
      }

      // When remote-image loading is disabled, suppress http(s) image rendering;
      // `hideRemoteImages` also omits the raw markdown source entirely.
      if (node.name === 'Image' && /^https?:\/\//.test(node.url) && !loadRemoteImages) {
        return true;
      }

      return false;
    },
  });

const openLinksInNewTab = EditorView.domEventHandlers({
  click: (event) => {
    const anchor = (event.target as Element | null)?.closest('a.cm-link') as HTMLAnchorElement | null;
    if (anchor?.href) {
      event.preventDefault();
      window.open(anchor.href, '_blank', 'noopener,noreferrer');
      return true;
    }
    return false;
  },
});
