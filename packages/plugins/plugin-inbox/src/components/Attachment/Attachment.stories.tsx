//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { AttachmentViewer } from './Attachment.tsx';

// Data urls rather than fixtures: the viewer only needs *a* url, and inlining them keeps the story
// runnable with no space, no client and no network.
const PDF_URL =
  'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL01lZGlhQm94WzAgMCA2MTIgNzkyXT4+CmVuZG9iagp0cmFpbGVyCjw8L1Jvb3QgMSAwIFI+Pg==';

const IMAGE_URL =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNDAiIGhlaWdodD0iMTIwIj48cmVjdCB3aWR0aD0iMjQwIiBoZWlnaHQ9IjEyMCIgZmlsbD0iIzRhOTBkOSIvPjwvc3ZnPg==';

const TEXT_URL = 'data:text/plain;base64,VGhlIHF1aWNrIGJyb3duIGZveC4=';

const meta = {
  title: 'plugins/plugin-inbox/components/AttachmentViewer',
  component: AttachmentViewer,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AttachmentViewer>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A PDF in the browser's own viewer, sandboxed. */
export const Pdf: Story = {
  args: { url: PDF_URL, kind: 'pdf', type: 'application/pdf', name: 'invoice.pdf' },
};

export const Image: Story = {
  args: { url: IMAGE_URL, kind: 'image', type: 'image/png', name: 'photo.png' },
};

export const Text: Story = {
  args: { url: TEXT_URL, kind: 'text', type: 'text/plain', name: 'notes.txt' },
};

/**
 * The refusal path: unknown bytes get a download link, never a render. Also what SVG and HTML fall
 * back to — both are active content, so neither earns an inline view.
 */
export const Unsupported: Story = {
  args: { url: TEXT_URL, kind: 'unsupported', type: 'application/zip', name: 'archive.zip' },
};

export const Pending: Story = {
  args: { kind: 'pdf', pending: true },
};

/** Resolution failed — distinct from pending, and the user should be told rather than shown a blank. */
export const Unavailable: Story = {
  args: { kind: 'pdf', pending: false },
};
