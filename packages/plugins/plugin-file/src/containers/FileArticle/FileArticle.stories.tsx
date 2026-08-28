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

import pdfUrl from '../../../fixtures/test.pdf?url';
import { FileArticle } from './FileArticle';

/** A 3×2 PNG, small enough to inline and large enough to have measurable dimensions. */
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAIAAADZm76WAAAAF0lEQVQI12P8z8DAwMDAxMDAwMDAwAAADgEBAaMHRJcAAAAASUVORK5CYII=';

const decode = (base64: string) => Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));

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
const withFile = (load: () => Promise<Uint8Array>, name: string, type: string) =>
  withClientProvider({
    createIdentity: true,
    createSpace: true,
    types: [File.File, Blob.Blob],
    onCreateSpace: async ({ space }) => {
      const bytes = await load();
      await EffectEx.runPromise(
        File.fromBytes(bytes, { name, type }).pipe(
          Effect.flatMap((file) => Database.add(file)),
          Effect.provide(Database.layer(space.db)),
        ),
      );
    },
  });

const fetchFixture = async () => new Uint8Array(await (await fetch(pdfUrl)).arrayBuffer());

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
  decorators: [withFile(fetchFixture, 'test.pdf', 'application/pdf')],
};

export const Image: Story = {
  decorators: [withFile(async () => decode(PNG_BASE64), 'pixel.png', 'image/png')],
  play: async ({ canvasElement }) => {
    await waitFor(async () => {
      const image = canvasElement.querySelector('img');
      await expect(image).not.toBeNull();
      await expect(image!.getAttribute('src')).toMatch(/^data:image\/png/);
    });
  },
};

export const Pdf: Story = {
  decorators: [withFile(fetchFixture, 'test.pdf', 'application/pdf')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Rendered by pdf.js, not handed to an `<iframe>` — the article must not regress to the
    // browser's own viewer, which lives in another origin and cannot be themed.
    await waitFor(
      async () => {
        await expect(canvasElement.querySelectorAll('canvas')).toHaveLength(1);
      },
      { timeout: 20_000 },
    );
    await expect(canvasElement.querySelector('iframe')).toBeNull();
    await expect(canvas.getByText('1 page')).toBeInTheDocument();
  },
};

/** A type with no preview branch: the article offers the bytes as a download instead. */
export const Unsupported: Story = {
  decorators: [withFile(async () => new Uint8Array([1, 2, 3]), 'notes.bin', 'application/octet-stream')],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(async () => {
      await expect(canvas.getByText('Download file')).toBeInTheDocument();
    });
  },
};
