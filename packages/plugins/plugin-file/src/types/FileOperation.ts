//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Ref, Type } from '@dxos/echo';
import { ContentBlock, File } from '@dxos/types';

import * as FileCapabilities from './FileCapabilities.ts';

export const Create = Operation.make({
  meta: { key: DXN.make('org.dxos.operation.file.create'), name: 'Create File', icon: 'ph--file--regular' },
  services: [Capability.Service],
  input: FileCapabilities.FileAction.CreateFileSchema.mapFields(Struct.assign({ db: Database.Database })),
  output: Schema.Struct({
    object: Type.getSchema(File.File),
  }),
});

/**
 * Where the bytes come from. Mirrors `ContentBlock.ImageSource` rather than inventing a shape — it
 * is how this repo already models "bytes, or a pointer to bytes".
 *
 * Two arms because their costs differ sharply: `base64` rides in the tool-call arguments and so
 * occupies the caller's context, while `http` is fetched by the host and never crosses it.
 */
export const FileSource = Schema.Union([
  Schema.Struct({
    type: Schema.tag('base64'),
    mediaType: Schema.String.annotate({ description: 'MIME type of the encoded bytes, e.g. image/png.' }),
    data: Schema.String.annotate({ description: 'Base64-encoded file contents.' }),
  }),
  Schema.Struct({
    type: Schema.tag('http'),
    url: Schema.String.annotate({ description: 'HTTPS URL the host downloads. Must not be a private address.' }),
  }),
]);

/**
 * Creates a file from serializable input, so an agent can reach it.
 *
 * Separate from {@link Create} rather than replacing it: `Create` takes a live browser `File`, which
 * is right for the upload UI and cannot render as JSON Schema — an operation whose input cannot is
 * dropped from the registry silently, and so is invisible to any tool caller.
 *
 * Takes the database as a service rather than an input field, which is both what makes the input
 * serializable and what forces the caller to name a space.
 */
export const CreateFromSource = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.file.createFromSource'),
    name: 'Create File From Source',
    description:
      'Creates a file in the space from base64 content or an HTTPS URL, storing it via the configured backend.',
    icon: 'ph--file-plus--regular',
  },
  input: Schema.Struct({
    source: FileSource,
    name: Schema.optional(Schema.String.annotate({ description: 'Filename to record on the file object.' })),
  }),
  output: Schema.Struct({
    object: Type.getSchema(File.File),
  }),
  services: [Database.Service, Capability.Service],
});

export const Read = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.file.read'),
    name: 'Read File',
    description:
      'Reads the contents of a file and returns them as a File content block (data URL for inline files, original URL for external files).',
    icon: 'ph--file-arrow-down--regular',
  },
  input: Schema.Struct({
    file: Ref.Ref(File.File).annotate({
      description: 'The file to read.',
    }),
  }),
  output: ContentBlock.ContentBlockResult,
  services: [Database.Service],
});
