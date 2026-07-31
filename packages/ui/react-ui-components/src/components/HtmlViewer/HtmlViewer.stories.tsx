//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, waitFor } from 'storybook/test';

import { ThemeProvider, useThemeContext } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { trim } from '@dxos/util';

import m1 from './fixtures/m1.html?raw';
import m2 from './fixtures/m2.html?raw';
import { Html, type HtmlSrcResolver } from './Html';
import { emailDialect } from './transform-email';

//
// Samples
//

// A simple/personal email (no layout tables) — recolored to the app theme so it reads in light/dark.
const PERSONAL_EMAIL = trim`
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

// A marketing email built from layout tables with intentional brand colors — left as authored so its
// design (colored header, button) is preserved rather than recolored.
const MARKETING_EMAIL = trim`
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

const REMOTE_IMAGE_EMAIL = trim`
  <div style="font-family:Arial;color:#202124">
    <p>Here is this week's banner:</p>
    <img src="https://picsum.photos/seed/dxos-mail/480/160" alt="banner" />
    <p>Cheers.</p>
  </div>
`;

// A reply whose quoted history (Gmail's `.gmail_quote`) is collapsed behind the "•••" toggle.
const REPLY_EMAIL = trim`
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

const PLAINTEXT_EMAIL = trim`
Hello,

This is a plain-text email, shown verbatim.
  - indented line one
  - indented line two

Regards,
Kai
`;

/**
 * Named bodies the story renders. The hand-written ones isolate a single behaviour; `m1`/`m2` are real
 * captured mail (saved from the MailboxSync story's Archive panel) carrying what actually breaks
 * rendering — sender stylesheets, nested layout tables, explicit `color-scheme` declarations.
 */
const SAMPLES = {
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
  plaintext: {
    html: PLAINTEXT_EMAIL,
    note: 'Not markup; shown verbatim in a <pre>.',
  },
  remoteImage: {
    html: REMOTE_IMAGE_EMAIL,
    note: 'Remote image, blocked unless images are loaded.',
  },
  m1: {
    html: m1,
    note: 'Captured: table layout, one sender stylesheet, no color-scheme declaration.',
  },
  m2: {
    html: m2,
    note: 'Captured: declares color-scheme light — the sender has no dark rendering.',
  },
};

type SampleId = keyof typeof SAMPLES;

type EmailBodyProps = {
  html: string;
  isPersonal?: boolean;
  loadRemoteImages?: boolean;
  resolveSrc?: HtmlSrcResolver;
};

/** What a caller writes: the sandbox plus the email dialect (see `emailDialect`). */
const EmailBody = ({ html, isPersonal, loadRemoteImages, resolveSrc }: EmailBodyProps) => (
  <Html html={html} loadRemoteImages={loadRemoteImages} dialect={emailDialect({ isPersonal, resolveSrc })} />
);

//
// Story
//

/**
 * One body rendered in a pinned theme, regardless of the storybook theme global. Both the DOM class
 * (which resolves the `--color-*` custom properties the recolor transform probes) and the React
 * `ThemeProvider` are set, since `HtmlViewer` reads the mode from context while `readThemeParams` reads
 * the computed values off the DOM.
 */
const ThemePane = ({
  mode,
  html,
  isPersonal,
  loadRemoteImages,
}: {
  mode: 'light' | 'dark';
  html: string;
  isPersonal?: boolean;
  loadRemoteImages?: boolean;
}) => {
  const { tx } = useThemeContext();
  return (
    <div className={mode}>
      <ThemeProvider tx={tx} themeMode={mode}>
        <div className='bg-baseSurface text-baseText p-2 overflow-auto'>
          <div className='pb-1 text-xs uppercase tracking-wide text-description'>{mode}</div>
          <EmailBody html={html} isPersonal={isPersonal} loadRemoteImages={loadRemoteImages} />
        </div>
      </ThemeProvider>
    </div>
  );
};

type StoryProps = {
  sample: SampleId;
  isPersonal?: boolean;
  loadRemoteImages?: boolean;
  /**
   * Renders light and dark side by side. The failure mode this component has is a body that reads fine
   * in one mode and is illegible in the other, which is only obvious with both on screen at once.
   */
  compare?: boolean;
};

const DefaultStory = ({ sample, isPersonal, loadRemoteImages, compare }: StoryProps) => {
  const { html, note } = SAMPLES[sample];
  return (
    <div className='flex flex-col gap-1 p-2'>
      <div className='text-xs text-description'>{note}</div>
      {compare ? (
        <div className='grid grid-cols-2 gap-2 border border-separator rounded overflow-hidden'>
          <ThemePane mode='light' html={html} isPersonal={isPersonal} loadRemoteImages={loadRemoteImages} />
          <ThemePane mode='dark' html={html} isPersonal={isPersonal} loadRemoteImages={loadRemoteImages} />
        </div>
      ) : (
        <EmailBody html={html} isPersonal={isPersonal} loadRemoteImages={loadRemoteImages} />
      )}
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-components/HtmlViewer',
  component: DefaultStory,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    sample: { control: 'select', options: Object.keys(SAMPLES) },
  },
  args: { sample: 'personal' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Personal: Story = {
  args: {
    sample: 'personal',
    isPersonal: true,
  },
};

export const Reply: Story = {
  args: {
    sample: 'reply',
    isPersonal: true,
  },
};

export const Marketing: Story = {
  args: {
    sample: 'marketing',
  },
};

/** A table-based body flagged personal — themed anyway, unlike `Marketing`. */
export const PersonalTable: Story = {
  args: {
    sample: 'marketing',
    isPersonal: true,
  },
};

export const Plaintext: Story = {
  args: {
    sample: 'plaintext',
  },
};

export const RemoteImagesBlocked: Story = {
  args: {
    sample: 'remoteImage',
    loadRemoteImages: false,
  },
};

export const RemoteImagesLoaded: Story = {
  args: {
    sample: 'remoteImage',
    loadRemoteImages: true,
  },
};

/** Real mail, light vs dark. As delivered: a table layout is left as authored, so the app surface bleeds through. */
export const Captured: Story = {
  args: {
    sample: 'm1',
    compare: true,
  },
};

/** The same bodies with the recolor transform forced on, to judge it against real sender markup. */
export const CapturedThemed: Story = {
  args: {
    sample: 'm1',
    isPersonal: true,
    compare: true,
  },
};

//
// Unresolved src
//

// A signature image referenced inline via `cid:` (RFC 2392), as Gmail/JMAP attach it. The sandbox does
// not know what `cid:` means — it hands any non-http src to the dialect's resolver and swaps the result
// in once it settles. The ECHO-backed resolver that maps a cid onto a message attachment lives with the
// data layer (`plugin-inbox`'s `useCidResolver`) and is tested there.
const INLINE_IMAGE_CONTENT_ID = 'inline-signature-1';

const INLINE_IMAGE_EMAIL = trim`
  <div style="font-family:Arial;color:#202124">
    <p>See the attached signature below.</p>
    <img id="inline-cid-image" src="cid:${INLINE_IMAGE_CONTENT_ID}" alt="signature" />
  </div>
`;

// A minimal 1x1 transparent PNG — content doesn't matter, only that `src` resolves off of `cid:`.
const INLINE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

// Async on purpose: a real resolver is a database read, so the story exercises the swap-in-place path
// rather than a synchronous substitution.
const resolveInlineImage: HtmlSrcResolver = async (src) =>
  src === `cid:${INLINE_IMAGE_CONTENT_ID}` ? `data:image/png;base64,${INLINE_PNG_BASE64}` : undefined;

/** Finds the element hosting the shadow root the content is attached to. */
const findShadowHost = (root: Element): Element | undefined => {
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

/** The one story not driven by the sample args: it supplies a resolver rather than a different body. */
export const UnresolvedSrc: Story = {
  render: () => <EmailBody html={INLINE_IMAGE_EMAIL} isPersonal resolveSrc={resolveInlineImage} />,
  play: async ({ canvasElement }) => {
    await waitFor(async () => {
      const host = findShadowHost(canvasElement);
      const image = host?.shadowRoot?.querySelector<HTMLImageElement>('#inline-cid-image');
      await expect(image?.getAttribute('src')).toMatch(/^data:/);
    });
  },
};
