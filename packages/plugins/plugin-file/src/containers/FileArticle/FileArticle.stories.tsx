//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { Blob, Database, Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { EffectEx } from '@dxos/effect';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { File } from '@dxos/types';

import { translations } from '#translations';

import landscapePdf from '../../../fixtures/landscape.pdf?inline';
import testPdf from '../../../fixtures/test.pdf?inline';
import { FileArticle } from './FileArticle.tsx';

/** A 4×3 PNG of three coloured rows. Generated and verified to decode — see the Image story. */
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAIAAAA7ljmRAAAAGUlEQVR4nGN47mMDRwx6ZwrhiMFkxm04AgBTKBIF1eRh+AAAAABJRU5ErkJggg==';

const decode = (base64: string) => Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));

/**
 * Bytes of a fixture imported with `?inline`, which yields a data URL.
 *
 * Imported rather than fetched at story time: the bytes are then part of the module graph, so the
 * story cannot race the request or fail on a dev-server path that resolves differently under the
 * test runner than in the browser.
 */
const bytesOf = (dataUrl: string) => decode(dataUrl.slice(dataUrl.indexOf(',') + 1));

const DefaultStory = () => {
  const { space } = useClientStory();
  const [file] = useQuery(space?.db, Filter.type(File.File));
  if (!file) {
    return <Loading />;
  }

  return <FileArticle role='article' subject={file} attendableId={file.id} />;
};

/**
 * Seeds the space with one file.
 *
 * Bytes land in `inline` storage: no backend is registered in a story, and inline is the blob
 * registry's own default, so the article resolves a `data:` URL without any of the plugin wiring.
 * `Blob.Blob` must be in `types` alongside `File.File` — the file holds a `Ref` to a blob, and an
 * unregistered schema fails at resolution rather than at insert.
 */
const withFile = (load: () => Uint8Array, name: string, type: string) =>
  withClientProvider({
    createIdentity: true,
    createSpace: true,
    types: [File.File, Blob.Blob],
    onCreateSpace: async ({ space }) => {
      const bytes = load();
      await EffectEx.runPromise(
        File.fromBytes(bytes, { name, type }).pipe(
          Effect.flatMap((file) => Database.add(file)),
          Effect.provide(Database.layer(space.db)),
        ),
      );
    },
  });

const meta = {
  title: 'plugins/plugin-file/containers/FileArticle',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    translations,
  },
} satisfies Meta<typeof FileArticle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [withFile(() => bytesOf(testPdf), 'test.pdf', 'application/pdf')],
};

export const Image: Story = {
  decorators: [withFile(() => decode(PNG_BASE64), 'pixel.png', 'image/png')],
  play: async ({ canvasElement }) => {
    // `naturalWidth`, not just the `src` attribute — see the note in Preview.stories.tsx.
    await waitFor(async () => {
      const image = canvasElement.querySelector('img');
      await expect(image).not.toBeNull();
      await expect(image!.getAttribute('src')).toMatch(/^data:image\/png/);
      await expect(image!.naturalWidth).toBe(4);
    });
  },
};

export const PdfPortrait: Story = {
  decorators: [withFile(() => bytesOf(testPdf), 'test.pdf', 'application/pdf')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Rendered by pdf.js, not handed to an `<iframe>` — the article must not regress to the
    // browser's own viewer, which lives in another origin and cannot be themed.
    await waitFor(
      async () => {
        await expect(canvasElement.querySelectorAll('[data-page] canvas').length).toBeGreaterThan(0);
      },
      { timeout: 20_000 },
    );
    await expect(canvasElement.querySelector('iframe')).toBeNull();
    await expect(canvas.getByText(/^1 \/ \d+$/)).toBeInTheDocument();
  },
};

export const PdfLandscape: Story = {
  decorators: [withFile(() => bytesOf(landscapePdf), 'landscape.pdf', 'application/pdf')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Rendered by pdf.js, not handed to an `<iframe>` — the article must not regress to the
    // browser's own viewer, which lives in another origin and cannot be themed.
    await waitFor(
      async () => {
        await expect(canvasElement.querySelectorAll('[data-page] canvas').length).toBeGreaterThan(0);
      },
      { timeout: 20_000 },
    );
    await expect(canvasElement.querySelector('iframe')).toBeNull();
    await expect(canvas.getByText(/^1 \/ \d+$/)).toBeInTheDocument();
  },
};

/** A type with no preview branch: the article describes it, and the toolbar still offers download. */
export const Unsupported: Story = {
  decorators: [withFile(() => new Uint8Array([1, 2, 3]), 'notes.bin', 'application/octet-stream')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(async () => {
      await expect(canvas.getByText('No preview available for this file type.')).toBeInTheDocument();
    });
    await expect(canvas.getByText('notes.bin')).toBeInTheDocument();
    await expect(canvas.getByTitle('Download')).toBeInTheDocument();
  },
};
