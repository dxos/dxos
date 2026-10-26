//
// Copyright 2026 DXOS.org
//

import { type Database, Filter, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import type * as Presentation from '@dxos/plugin-presenter/Presentation';
import * as MediaArtifact from '@dxos/plugin-studio/MediaArtifact';
import * as Variant from '@dxos/plugin-studio/Variant';
import { type File } from '@dxos/types';

import { Recording, type Take } from '#types';

/** Stores bytes as a `File` object (not yet added to the database). */
export type CreateFile = (db: Database.Database, file: globalThis.File) => Promise<File.File>;

export type SaveTakeProps = {
  presentation: Presentation.Presentation;
  name: string;
  data: Blob;
  log: Take.Log;
  createFile: CreateFile;
};

/** File name extension for a recorded mime type. */
const extension = (type: string) => (type.includes('mp4') ? 'mp4' : type.includes('ogg') ? 'ogg' : 'webm');

/**
 * Saves a take as a new `Variant` of the presentation's most recent Recording (created on the first take), in the
 * audio or video artifact by what it recorded, and makes it that artifact's cover. Never overwrites an earlier take.
 */
export const saveTake = async ({
  presentation,
  name,
  data,
  log,
  createFile,
}: SaveTakeProps): Promise<Variant.Variant> => {
  const db = Obj.getDatabase(presentation);
  invariant(db, 'presentation is not in a database');

  const recordings = await db.query(Filter.type(Recording.Recording, { presentation: Ref.make(presentation) })).run();
  const recording = recordings.at(-1) ?? db.add(Recording.make(presentation, presentation.name));

  const kind = log.source === 'none' ? 'audio' : 'video';
  let artifact = await recording[kind]?.load();
  if (!artifact) {
    const created = db.add(
      MediaArtifact.make({ name: `${recording.name ?? presentation.name ?? 'Recording'} (${kind})`, kind }),
    );
    Obj.update(recording, (recording) => {
      recording[kind] = Ref.make(created);
    });
    artifact = created;
  }

  const type = data.type || (kind === 'audio' ? 'audio/webm' : 'video/webm');
  const file = db.add(await createFile(db, new globalThis.File([data], `${name}.${extension(type)}`, { type })));
  const variant = db.add(Variant.make({ name, contentType: type, content: Ref.make(file), config: { ...log } }));
  Obj.setParent(file, variant);
  const target = artifact;
  Obj.update(target, (target) => {
    target.variants ??= [];
    target.variants.push(Ref.make(variant));
    target.cover = Ref.make(variant);
  });
  return variant;
};
