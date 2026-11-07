//
// Copyright 2026 DXOS.org
//

import { type Editor, InstancePresenceRecordType, type TLEventInfo, useValue } from '@tldraw/editor';
import { useEffect } from 'react';

import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';

export type CanvasCursorsProps = {
  canvas: Drawing.Canvas;
  editor: Editor;
};

/**
 * Shares the local pointer on the canvas's awareness channel and writes remote ones back as tldraw presence
 * records (session scope, never saved), which tldraw draws and ages itself.
 */
export const CanvasCursors = ({ canvas, editor }: CanvasCursorsProps) => {
  const { cursors, update } = ToolkitHooks.usePointerCursors(canvas);
  const pageId = useValue('currentPageId', () => editor.getCurrentPageId(), [editor]);

  useCanvasPointer(editor, update);

  useEffect(() => {
    const now = Date.now();
    const records = cursors
      .filter((cursor) => cursor.view === undefined || cursor.view === pageId)
      .map((cursor) =>
        InstancePresenceRecordType.create({
          id: InstancePresenceRecordType.createId(cursor.id),
          userId: cursor.id,
          userName: cursor.name,
          color: cursor.hue,
          currentPageId: pageId,
          cursor: { x: cursor.x, y: cursor.y, type: 'default', rotation: 0 },
          lastActivityTimestamp: now,
        }),
      );
    const ids = new Set(records.map((record) => record.id));
    editor.store.mergeRemoteChanges(() => {
      const stale = editor.store.query
        .records('instance_presence')
        .get()
        .filter((record) => record.userId !== editor.user.getId() && !ids.has(record.id));
      editor.store.remove(stale.map((record) => record.id));
      editor.store.put(records);
    });
  }, [editor, pageId, cursors]);

  return null;
};

/**
 * Reports the local pointer in page coordinates while it is over the canvas, and `undefined` once it leaves.
 * `update` must be stable: a new one withdraws the pointer and shares it afresh.
 */
export const useCanvasPointer = (editor: Editor, update: (point: ToolkitHooks.Point | undefined) => void) => {
  // tldraw also emits `pointer_move` for camera moves wherever the real pointer is, and its toolbar sits inside the
  // container, so the canvas hover state is the only sign the pointer is on the drawing.
  const hovering = useValue('isHoveringCanvas', () => editor.getInstanceState().isHoveringCanvas === true, [editor]);
  const pageId = useValue('currentPageId', () => editor.getCurrentPageId(), [editor]);

  useEffect(() => {
    if (!hovering) {
      return;
    }

    const handlePointer = ({ type, name }: TLEventInfo) => {
      if (type === 'pointer' && name === 'pointer_move') {
        const { x, y } = editor.inputs.currentPagePoint;
        update({ x, y, view: editor.getCurrentPageId() });
      }
    };
    editor.on('event', handlePointer);
    return () => {
      editor.off('event', handlePointer);
      update(undefined);
    };
  }, [editor, hovering, update]);

  // A page switch under a still pointer sends no move, but peers filter cursors by page.
  useEffect(() => {
    if (hovering) {
      const { x, y } = editor.inputs.currentPagePoint;
      update({ x, y, view: pageId });
    }
  }, [editor, hovering, pageId, update]);
};
