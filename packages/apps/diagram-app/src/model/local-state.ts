//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

// The last space and diagram are a per-browser convenience (spec F-2.2, F-3.2): blocked or cleared storage just
// opens the newest ones.

const LAST_SPACE_KEY = 'org.dxos.diagram-app.last-space';
const lastDrawingKey = (spaceId: string) => `org.dxos.diagram-app.last-drawing.${spaceId}`;

const read = (key: string): string | undefined => {
  try {
    return localStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
};

const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {}
};

export const getLastSpace = (): string | undefined => read(LAST_SPACE_KEY);

export const setLastSpace = (spaceId: string) => write(LAST_SPACE_KEY, spaceId);

export const getLastDrawing = (spaceId: string): string | undefined => read(lastDrawingKey(spaceId));

export const setLastDrawing = (spaceId: string, drawingId: string) => write(lastDrawingKey(spaceId), drawingId);

/** What the pill last showed, so the next load can draw it before the client is up. */
export const BootLook = Schema.Struct({
  spaceId: Schema.String,
  spaceName: Schema.String,
  spaceHue: Schema.optional(Schema.String),
  drawingId: Schema.optional(Schema.String),
  drawingName: Schema.optional(Schema.String),
});

export type BootLook = typeof BootLook.Type;

const BOOT_LOOK_KEY = 'org.dxos.diagram-app.boot-look';

const decodeBootLook = Schema.decodeUnknownOption(Schema.fromJsonString(BootLook));

export const getBootLook = (): BootLook | undefined => Option.getOrUndefined(decodeBootLook(read(BOOT_LOOK_KEY)));

export const setBootLook = (look: BootLook) => write(BOOT_LOOK_KEY, JSON.stringify(look));
