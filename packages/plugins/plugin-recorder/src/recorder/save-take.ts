//
// Copyright 2026 DXOS.org
//

import { type Database, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import type * as Presentation from '@dxos/plugin-presenter/Presentation';
import * as Variant from '@dxos/plugin-studio/Variant';
import { type File } from '@dxos/types';

import { type Take } from '#types';

/** Stores bytes as a `File` object (not yet added to the database). */
export type CreateFile = (db: Database.Database, file: globalThis.File) => Promise<File.File>;

export type SaveTakeProps = {
  slide: Presentation.Slide;
  name: string;
  data: Blob;
  log: Take.Log;
  createFile: CreateFile;
};

/** File name extension for a recorded mime type. */
export const extension = (type: string) => (type.includes('mp4') ? 'mp4' : type.includes('ogg') ? 'ogg' : 'webm');

/**
 * Saves a take as a new `Variant` owned by the slide, and makes it the slide's main take: a new read is usually the
 * one meant to replace the last. Never overwrites an earlier take.
 */
export const saveTake = async ({ slide, name, data, log, createFile }: SaveTakeProps): Promise<Variant.Variant> => {
  const db = Obj.getDatabase(slide);
  invariant(db, 'slide is not in a database');

  const type = data.type || (log.source === 'none' ? 'audio/webm' : 'video/webm');
  const file = db.add(await createFile(db, new globalThis.File([data], `${name}.${extension(type)}`, { type })));
  const take = db.add(Variant.make({ name, contentType: type, content: Ref.make(file), config: { ...log } }));
  Obj.setParent(file, take);
  Obj.update(slide, (slide) => {
    slide.takes ??= [];
    slide.takes.push(Ref.make(take));
    slide.mainTake = Ref.make(take);
  });
  return take;
};
