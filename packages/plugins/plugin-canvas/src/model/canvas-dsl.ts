//
// Copyright 2026 DXOS.org
//

import { DSL, applyCommands } from '@dxos/diagram';
import { SceneHandler } from '@dxos/react-ui-canvas';

import { type Canvas } from '#types';

import { CanvasLayoutBuilder, editCanvasContent } from './canvas-content.ts';

/**
 * The two texts a drawing has. `intent` is what an author writes (`diagram kind=grid`), and a drawing has one only
 * when a grid diagram can say it; `boxes` is what any drawing prints as, every coordinate and grid included.
 */
export type DslForm = 'intent' | 'boxes';

export type CanvasDsl = {
  /** The drawing as an author would write it, where it can be written that way. */
  intent?: string;
  /** Why it cannot, when it cannot. */
  reasons: readonly string[];
  boxes: string;
};

/** The canvas's open scene as text, in both forms. */
export const canvasDsl = (canvas: Canvas.Canvas): CanvasDsl => {
  const { scene } = CanvasLayoutBuilder.read(canvas);
  const { text, reasons } = DSL.printIntent(scene);
  return { boxes: DSL.print(scene), reasons: reasons ?? [], ...(text === undefined ? {} : { intent: text }) };
};

export type RebuildResult = {
  /** What stopped the text being read; nothing is written while there is one. */
  errors: readonly string[];
  drawn: number;
  cleared: number;
};

/**
 * Makes the drawing what `text` says. The canvas is cleared first, because the text IS the drawing: `applyCommands`
 * touches only the objects its commands name, so an object deleted from the text would otherwise stay on screen.
 * Only records the DSL manages go, since a shape drawn by hand is in no text and clearing it could not be undone
 * from here; both halves are one edit, so the canvas is never written empty.
 */
export const rebuildCanvas = (canvas: Canvas.Canvas, text: string, form: DslForm): RebuildResult => {
  // Intent has no commands until its diagram is laid out. Box text carries its own coordinates, and solving a
  // layout over it would move the shapes it placed.
  const { commands, problems } = form === 'intent' ? DSL.parse(text) : DSL.read(text);
  const errors = problems.filter(({ severity }) => severity === 'error').map(({ message }) => message);
  if (errors.length > 0) {
    return { errors, drawn: 0, cleared: 0 };
  }
  let cleared = 0;
  let drawn = 0;
  editCanvasContent(canvas, (content) => {
    for (const [key, record] of Object.entries(content)) {
      const identity = SceneHandler.identify(record);
      if (identity) {
        delete content[key];
        if (identity.part === undefined) {
          cleared++;
        }
      }
    }
    drawn = applyCommands(content, commands, SceneHandler).upserted.length;
  });
  return { errors, drawn, cleared };
};
