//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode } from 'react';

import { ThemeProvider, useThemeContext } from '@dxos/react-ui';
import { trim } from '@dxos/util';

import m1 from './fixtures/m1.html?raw';
import m2 from './fixtures/m2.html?raw';
import m3 from './fixtures/m3.html?raw';
import { type ColorScheme } from './Html';

//
// Sandbox samples — exercise `Html` itself, with no dialect.
//

/** Aggressive selectors that would restyle the app if the content were not in a shadow root. */
export const HOSTILE_CSS = trim`
  <style>
    * { color: #b91c1c !important; }
    body, div, p { background: #fde68a !important; font-family: "Comic Sans MS", cursive !important; }
  </style>
  <p>This body tries to restyle everything around it.</p>
`;

/**
 * Declares its own dark rendering. NOTE: DOMPurify strips `<style>`, so the authored rules never reach
 * the shadow root and this currently renders unstyled in both panes — the story exists to make that
 * visible (see DESIGN.md §2, Gap A), not to demonstrate a working rewrite.
 */
export const AUTHORED_DARK = trim`
  <meta name="color-scheme" content="light dark" />
  <style>
    .card { background: #ffffff; color: #111111; padding: 12px; border: 1px solid #e5e5e5; }
    @media (prefers-color-scheme: dark) {
      .card { background: #111111; color: #f5f5f5; border-color: #333333; }
    }
  </style>
  <div class="card"><p>The sender authored both renderings.</p></div>
`;

export const REMOTE_IMAGE = trim`
  <div style="font-family:Arial;color:#202124">
    <p>Here is this week's banner:</p>
    <img src="https://picsum.photos/seed/dxos-mail/480/160" alt="banner" />
    <p>Cheers.</p>
  </div>
`;

/**
 * The shapes that used to render as a broken-image placeholder: a *linked* image (whose alt text is
 * left underlined beside the placeholder), a protocol-relative target (a remote fetch that a
 * `^https?:` test misses entirely), and a `cid:` attachment with nobody to resolve it.
 */
export const UNLOADABLE_IMAGES = trim`
  <div style="font-family:Arial">
    <p><a href="https://example.com"><img src="https://example.com/logo.png" alt="Kit logo" /></a></p>
    <p><img src="//cdn.example.com/tracker.gif" alt="protocol-relative" /></p>
    <p><img src="cid:missing-attachment" alt="inline attachment" /></p>
  </div>
`;

export const PLAINTEXT = trim`
Hello,

This is not markup, so it is shown verbatim.
  - indented line one
  - indented line two

Regards,
Sam
`;

//
// Email samples — exercise the email dialect.
//

/** A simple/personal email (no layout tables) — recolored to the app theme so it reads in light/dark. */
export const PERSONAL_EMAIL = trim`
  <div style="color:#202124;font-family:Georgia,serif">
    <p>Hi team,</p>
    <p>Following up on the
      <a href="https://example.com" style="color:#1a73e8">proposal</a>
      from last week — a couple of notes inline below.</p>
    <blockquote style="color:#5f6368;border-left:3px solid #dadce0;padding-left:12px">
      Can we ship the first cut by Friday?
    </blockquote>
    <p style="color:#5f6368">Thanks,<br/>Alex</p>
  </div>
`;

/**
 * A marketing email built from layout tables with intentional brand colors — left as authored so its
 * design (colored header, button) is preserved rather than recolored.
 */
export const MARKETING_EMAIL = trim`
  <table width="100%" style="background:#ffffff"><tr><td align="center">
    <table width="600" style="background:#f4f4f4;border-radius:8px;overflow:hidden">
      <tr><td style="background:#1a73e8;color:#ffffff;padding:24px;font-size:24px;font-family:Arial">
        Big Summer Sale
      </td></tr>
      <tr><td style="padding:24px;color:#202124;font-family:Arial">
        <p>Save 30% on everything this weekend only.</p>
        <a href="https://example.com"
           style="background:#e8710a;color:#ffffff;padding:12px 20px;border-radius:4px;text-decoration:none;display:inline-block">
          Shop now
        </a>
      </td></tr>
    </table>
  </td></tr></table>
`;

/** A reply whose quoted history (Gmail's `.gmail_quote`) is collapsed behind the "•••" toggle. */
export const REPLY_EMAIL = trim`
  <div style="color:#202124;font-family:Arial">
    <p>Sounds good — I'll have the draft ready by Thursday.</p>
    <div class="gmail_quote">
      <div class="gmail_attr">On Mon, Jul 6, 2026 at 9:14 AM Alex &lt;alex@example.com&gt; wrote:</div>
      <blockquote class="gmail_quote" style="margin:0 0 0 .8ex;border-left:1px solid #ccc;padding-left:1ex">
        <p>Hi — can we get the first cut of the proposal by end of week?</p>
        <p>Thanks,<br/>Alex</p>
      </blockquote>
    </div>
  </div>
`;

export type Sample = { html: string; note: string };

/**
 * Real captured mail (saved from the MailboxSync story's Archive panel). Unlike the hand-written bodies
 * these carry what actually breaks rendering: sender stylesheets, nested layout tables, and explicit
 * `color-scheme` declarations.
 */
export const EMAIL_SAMPLES: Record<string, Sample> = {
  personal: {
    html: PERSONAL_EMAIL,
    note: 'Simple body, no tables — recolored to the app theme.',
  },
  reply: {
    html: REPLY_EMAIL,
    note: 'Quoted history collapsed behind the "•••" toggle.',
  },
  marketing: {
    html: MARKETING_EMAIL,
    note: 'Layout tables — left as authored unless flagged personal.',
  },
  m1: {
    html: m1,
    note: 'Captured: table layout, one sender stylesheet, no color-scheme declaration.',
  },
  m2: {
    html: m2,
    note: 'Captured: declares color-scheme light — the sender has no dark rendering.',
  },
  m3: {
    html: m3,
    note: 'Captured: declares light dark and ships its own dark rules — which sanitization strips.',
  },
};

export const SANDBOX_SAMPLES: Record<string, Sample> = {
  hostile: {
    html: HOSTILE_CSS,
    note: 'Sender CSS targeting `*` — contained by the shadow root.',
  },
  authoredDark: {
    html: AUTHORED_DARK,
    note: 'Ships its own dark rules — currently dropped by sanitization; see DESIGN.md Gap A.',
  },
  remoteImage: {
    html: REMOTE_IMAGE,
    note: 'Remote image, blocked unless images are loaded.',
  },
  unloadableImages: {
    html: UNLOADABLE_IMAGES,
    note: 'Linked, protocol-relative and unresolvable cid: images — hidden, never drawn broken.',
  },
  plaintext: {
    html: PLAINTEXT,
    note: 'Not markup; shown verbatim in a <pre>.',
  },
};

//
// Theme comparison
//

/**
 * One body rendered in a pinned theme, regardless of the storybook theme global. Both the DOM class
 * (which resolves the `--color-*` custom properties the transforms probe) and the React `ThemeProvider`
 * are set, since `Html` reads the mode from context while the color probe reads computed values off the
 * DOM — they have to agree.
 */
export const ThemePane = ({ mode, children }: { mode: ColorScheme; children: ReactNode }) => {
  const { tx } = useThemeContext();
  return (
    // `colorScheme` is what actually switches the palette: the theme's tokens are `light-dark(…)`, which
    // resolves against the computed `color-scheme`, and only `.dark` sets it (there is no `.light` rule)
    // — so a `light` pane inside a dark storybook would otherwise inherit dark and both panes would match.
    // The class stays for rules scoped to `.dark`.
    <div className={mode} style={{ colorScheme: mode }}>
      <ThemeProvider tx={tx} themeMode={mode}>
        <div className='bg-base-surface text-base-fg p-2 overflow-auto border border-separator rounded'>
          <div className='pb-1 text-xs uppercase tracking-wide text-description'>{mode}</div>
          {children}
        </div>
      </ThemeProvider>
    </div>
  );
};

/**
 * Light and dark side by side. The failure mode worth catching is a body that reads fine in one mode and
 * is illegible in the other, which is only obvious with both on screen at once.
 */
export const Compare = ({ render }: { render: () => ReactNode }) => (
  <div className='grid grid-cols-2 gap-2 overflow-hidden'>
    <ThemePane mode='light'>{render()}</ThemePane>
    <ThemePane mode='dark'>{render()}</ThemePane>
  </div>
);

/** Frame shared by both story suites: the sample's note above the rendered body (or comparison). */
export const SampleFrame = ({ note, children }: { note: string; children: ReactNode }) => (
  <div className='w-full flex flex-col gap-1 p-2'>
    <div className='text-xs text-description'>{note}</div>
    {children}
  </div>
);

/** Finds the element hosting the shadow root the content is attached to. */
export const findShadowHost = (root: Element): Element | undefined => {
  if (root.shadowRoot) {
    return root;
  }

  for (const child of Array.from(root.children)) {
    const found = findShadowHost(child);
    if (found) {
      return found;
    }
  }

  return undefined;
};
