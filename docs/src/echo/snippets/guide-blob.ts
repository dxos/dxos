//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Blob, type Database, DXN, Obj, Ref, Type } from '@dxos/echo';

declare const db: Database.Database;
declare const bytes: Uint8Array;

// #region declare
class Photo extends Type.makeObject<Photo>(
  DXN.make('com.example.type.photo', '0.1.0'),
)({
  caption: Schema.String,
  image: Ref.Ref(Blob.Blob),
}) {}
// #endregion declare

// #region store
// Hashes the bytes and uploads them; the blob is not in the space yet.
const blob = await db.createBlob(bytes, { type: 'image/png' });
db.add(blob);
const photo = db.add(
  Obj.make(Photo, { caption: 'Launch day', image: Ref.make(blob) }),
);
// #endregion store

// #region read
const image = await photo.image.load();
const data = await db.readBlob(image); // Uint8Array
const url = await db.getBlobUrl(image); // for an <img>, if one can be made
const available = await db.blobExists(image);
// #endregion read

export { available, data, url };
