//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Annotation, Blob, Database, DXN, type Err, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/Annotation';
import { CollectionItemAnnotation } from '@dxos/schema';

/**
 * Canonical file type. Storage is backend-agnostic — `data` references a {@link Blob.Blob} object
 * that holds the bytes and their addressing.
 */
export class File extends Type.makeObject<File>(DXN.make('org.dxos.type.file', '0.2.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.optional),
    data: Ref.Ref(Blob.Blob).pipe(FormInputAnnotation.set(false)),
    timestamp: Schema.String.pipe(FormInputAnnotation.set(false), Schema.optional),
  }).pipe(
    Annotation.IconAnnotation.set({ icon: 'ph--file--regular', hue: 'indigo' }),
    CollectionItemAnnotation.set(true),
  ),
) {}

/**
 * Constructs a `File.File` ECHO object from the given props.
 * @param props - The initial field values for the file object.
 * @returns A new `File.File` instance.
 */
export const make = (props: Obj.MakeProps<typeof File>): File => Obj.make(File, props);

/**
 * Hashes and uploads `bytes` via the chosen storage backend (composing {@link Blob.fromBytes}),
 * adds the resulting Blob to the database as a child of the File (deleting the File deletes its
 * Blob), and returns an un-added `File.File` object referencing it. The caller is responsible for
 * adding the file itself (e.g. via `Database.add`).
 *
 * @example
 * ```ts
 * const file = yield* File.fromBytes(bytes, { name: 'photo.png', type: 'image/png' });
 * yield* Database.add(file);
 * ```
 */
export const fromBytes = (
  bytes: Uint8Array,
  options: { name?: string; type: string; storage?: Blob.Storage | (string & {}) },
): Effect.Effect<File, Err.BlobTooLargeError | Err.BlobWriteError, Database.Service> =>
  Effect.gen(function* () {
    const blob = yield* Blob.fromBytes(bytes, { type: options.type, storage: options.storage });
    const file = make({ name: options.name, data: Ref.make(blob) });
    Obj.setParent(blob, file);
    yield* Database.add(blob);
    return file;
  });
