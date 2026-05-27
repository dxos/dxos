//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Obj, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';

/**
 * Discriminated `data` field on {@link File}: either the bytes live on the
 * object itself (`inline`) or they live somewhere else and we hold a URL
 * (`external`, optionally with a content hash for IPFS/WNFS-style backends).
 */
export const FileDataSchema = Schema.Union(
  Schema.TaggedStruct('inline', {
    bytes: Schema.Uint8ArrayFromSelf,
  }),
  Schema.TaggedStruct('external', {
    url: Schema.String,
    cid: Schema.optional(Schema.String),
  }),
);

export type FileData = Schema.Schema.Type<typeof FileDataSchema>;

/**
 * Creates an inline {@link FileData} variant that embeds raw bytes on the ECHO object.
 * @param bytes - The file contents as a `Uint8Array`.
 * @returns A `FileData` tagged with `'inline'`.
 */
export const inlineData = (bytes: Uint8Array): FileData => ({ _tag: 'inline', bytes });

/**
 * Creates an external {@link FileData} variant that references a remote URL.
 * @param url - The URL to the file (e.g. `https://`, `wnfs://`).
 * @param cid - Optional content identifier for IPFS/WNFS-style backends.
 * @returns A `FileData` tagged with `'external'`.
 */
export const externalData = (url: string, cid?: string): FileData => ({
  _tag: 'external',
  url,
  ...(cid ? { cid } : {}),
});

/**
 * Canonical file type. Storage is backend-agnostic — the `data` field
 * discriminates between inline bytes and an external URL reference.
 */
export const File = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  type: Schema.String.pipe(FormInputAnnotation.set(false)),
  size: Schema.Number.pipe(FormInputAnnotation.set(false)),
  data: FileDataSchema.pipe(FormInputAnnotation.set(false)),
  timestamp: Schema.String.pipe(FormInputAnnotation.set(false), Schema.optional),
}).pipe(
  Type.object(DXN.make('org.dxos.type.file', '0.1.0')),
  Annotation.IconAnnotation.set({
    icon: 'ph--file--regular',
    hue: 'teal',
  }),
);

export interface File extends Schema.Schema.Type<typeof File> {}

/**
 * Constructs a `File.File` ECHO object from the given props.
 * @param props - The initial field values for the file object.
 * @returns A new `File.File` instance.
 */
export const make = (props: Obj.MakeProps<typeof File>): File => Obj.make(File, props);
