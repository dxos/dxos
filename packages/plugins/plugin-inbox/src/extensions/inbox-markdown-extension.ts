//
// Copyright 2026 DXOS.org
//

import { EditorView, type Extension, decorateMarkdown } from '@dxos/ui-editor';
import { isTruthy } from '@dxos/util';

import { hideRemoteImages } from './hide-images-extension';
import { type Pattern, replacePatterns } from './replace-patterns-extension';

// Permissive PSTN dial-in: `+` then digits/separators, `,,` pause, conference digits, `#`.
const DIAL_IN = String.raw`\+[\d][\d\s\-()]*,,[\d]+#`;

/** Visible dial string immediately followed by a `<tel:…>` link (Teams / Outlook invites). */
const DIAL_IN_WITH_TEL_LINK = new RegExp(`(${DIAL_IN})<tel:[^>]+>`);

/** Bare conference dial-in (e.g. Zoom "One tap mobile" lines). */
const DIAL_IN_BARE = new RegExp(`(${DIAL_IN})(?!<tel:)`);

/** Gmail-style angle-bracket tel markdown. */
const DIAL_IN_ANGLED_TEL = new RegExp(String.raw`<\[(${DIAL_IN})\]\(tel:[^)]+\)\\>`);

const INBOX_REPLACE_PATTERNS: Pattern[] = [
  // Gmail-style angle-bracket mailto: `<[alice@example.com](mailto:alice@example.com)\>`.
  {
    pattern: /<\[([^\]]+)\]\(mailto:\1\)\\>/,
    classNames: 'text-accent-text',
  },
  // Teams / Outlook dial-in: `+1 323-849-4874,,766918553#<tel:+13238494874,,766918553#>`.
  {
    pattern: DIAL_IN_WITH_TEL_LINK,
    classNames: 'tabular-nums text-accent-text',
  },
  // Gmail-style angle-bracket tel: `<[+16469313860,,91535833310#](tel:+16469313860,,91535833310#)\>`.
  {
    pattern: DIAL_IN_ANGLED_TEL,
    classNames: 'tabular-nums text-accent-text',
  },
  // Zoom / Teams bare dial-in: `+16469313860,,91535833310# US`.
  {
    pattern: DIAL_IN_BARE,
    classNames: 'tabular-nums text-accent-text',
  },
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
    decorateInboxMarkdown(loadRemoteImages),
    !loadRemoteImages && hideRemoteImages(),
    replacePatterns(INBOX_REPLACE_PATTERNS),
    openLinksInNewTab,
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
