//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, waitFor } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { trim } from '@dxos/util';

import { Html, type HtmlSrcResolver } from './Html';
import { Compare, SampleFrame, SANDBOX_SAMPLES, findShadowHost } from './testing';

//
// The sandbox on its own — no dialect. Everything here is behaviour `Html` guarantees to any caller:
// style isolation, sanitization, remote-image blocking, `src` resolution, and honouring the document's
// own color-scheme declaration. Email-specific policy is exercised in `transform-email.stories.tsx`.
//

type SampleId = keyof typeof SANDBOX_SAMPLES;

type StoryProps = {
  sample: SampleId;
  loadRemoteImages?: boolean;
  /** Renders light and dark side by side — the only way to see a body that reads in one and not the other. */
  compare?: boolean;
};

const DefaultStory = ({ sample, loadRemoteImages, compare }: StoryProps) => {
  const { html, note } = SANDBOX_SAMPLES[sample];
  const body = () => <Html html={html} loadRemoteImages={loadRemoteImages} />;
  return <SampleFrame note={note}>{compare ? <Compare render={body} /> : body()}</SampleFrame>;
};

const meta = {
  title: 'ui/react-ui-components/Html',
  component: DefaultStory,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    sample: { control: 'select', options: Object.keys(SANDBOX_SAMPLES) },
  },
  args: { sample: 'hostile' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The content's `* { … !important }` rules must not escape the shadow root and restyle this page. */
export const Isolation: Story = { args: { sample: 'hostile' } };

/** Not markup, so it renders verbatim in a `<pre>` rather than being parsed. */
export const Plaintext: Story = { args: { sample: 'plaintext' } };

export const RemoteImagesBlocked: Story = { args: { sample: 'remoteImage', loadRemoteImages: false } };

export const RemoteImagesLoaded: Story = { args: { sample: 'remoteImage', loadRemoteImages: true } };

/**
 * Nothing here can be shown, so nothing is drawn — no broken-image placeholder, and no stray alt text
 * left underlined inside its link. The protocol-relative image counts as a remote fetch, so it is
 * blocked like any other.
 */
export const UnloadableImages: Story = {
  args: { sample: 'unloadableImages' },
  play: async ({ canvasElement }) => {
    await waitFor(async () => {
      const host = findShadowHost(canvasElement);
      const images = Array.from(host?.shadowRoot?.querySelectorAll('img') ?? []);
      await expect(images).toHaveLength(3);
      for (const image of images) {
        await expect(image.hasAttribute('data-dx-hidden')).toBe(true);
        await expect(image.getBoundingClientRect().height).toBe(0);
      }
    });
  },
};

/**
 * The document ships its own dark rules. `prefers-color-scheme` resolves against the OS and cannot be
 * overridden from the page, so the base rewrites those rules — the two panes must differ, and must
 * follow the app mode rather than whatever the OS is set to.
 */
export const AuthoredDarkRules: Story = { args: { sample: 'authoredDark', compare: true } };

//
// Unresolved src
//

// The sandbox does not know what `cid:` means: it hands any non-http src to the dialect's resolver and
// swaps the result in once it settles. Async on purpose — a real resolver is a database read.
const INLINE_CONTENT_ID = 'inline-signature-1';

const INLINE_IMAGE = trim`
  <div style="font-family:Arial">
    <p>See the attached signature below.</p>
    <img id="inline-cid-image" src="cid:${INLINE_CONTENT_ID}" alt="signature" />
  </div>
`;

// A minimal 1x1 transparent PNG — content doesn't matter, only that `src` resolves off of `cid:`.
const INLINE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

const resolveInlineImage: HtmlSrcResolver = async (src) =>
  src === `cid:${INLINE_CONTENT_ID}` ? `data:image/png;base64,${INLINE_PNG_BASE64}` : undefined;

/** The one story not driven by the sample args: it supplies a resolver rather than a different body. */
export const UnresolvedSrc: Story = {
  render: () => <Html html={INLINE_IMAGE} dialect={{ resolveSrc: resolveInlineImage }} />,
  play: async ({ canvasElement }) => {
    await waitFor(async () => {
      const host = findShadowHost(canvasElement);
      const image = host?.shadowRoot?.querySelector<HTMLImageElement>('#inline-cid-image');
      await expect(image?.getAttribute('src')).toMatch(/^data:/);
    });
  },
};
