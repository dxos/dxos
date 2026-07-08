//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { HtmlViewer } from './HtmlViewer';

// A simple/personal email (no layout tables) — recolored to the app theme so it reads in light/dark.
const PERSONAL_EMAIL = `
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
const MARKETING_EMAIL = `
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

const REMOTE_IMAGE_EMAIL = `
  <div style="font-family:Arial;color:#202124">
    <p>Here is this week's banner:</p>
    <img src="https://picsum.photos/seed/dxos-mail/480/160" alt="banner" />
    <p>Cheers.</p>
  </div>
`;

// A reply whose quoted history (Gmail's `.gmail_quote`) is collapsed behind the "•••" toggle.
const REPLY_EMAIL = `
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

const PLAINTEXT_EMAIL = `Hello,

This is a plain-text email, shown verbatim.
  - indented line one
  - indented line two

Regards,
Sam`;

const meta = {
  title: 'plugins/plugin-inbox/components/HtmlViewer',
  component: HtmlViewer,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof HtmlViewer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Personal: Story = { args: { html: PERSONAL_EMAIL, isPersonal: true } };

export const Reply: Story = { args: { html: REPLY_EMAIL, isPersonal: true } };

export const Marketing: Story = { args: { html: MARKETING_EMAIL } };

// A table-based email flagged personal — themed anyway (vs `Marketing`, which is left as authored).
export const PersonalTable: Story = { args: { html: MARKETING_EMAIL, isPersonal: true } };

export const Plaintext: Story = { args: { html: PLAINTEXT_EMAIL } };

export const RemoteImagesBlocked: Story = { args: { html: REMOTE_IMAGE_EMAIL, loadRemoteImages: false } };

export const RemoteImagesLoaded: Story = { args: { html: REMOTE_IMAGE_EMAIL, loadRemoteImages: true } };
