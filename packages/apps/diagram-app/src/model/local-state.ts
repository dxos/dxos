//
// Copyright 2026 DXOS.org
//

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
