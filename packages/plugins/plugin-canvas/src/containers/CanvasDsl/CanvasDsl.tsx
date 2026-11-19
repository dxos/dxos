//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import { useObject } from '@dxos/echo-react';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';

import { type DslForm, canvasDsl, openScene, rebuildCanvas } from '#model';
import { Canvas } from '#types';

import { SourceEditor } from '../../components/SourceEditor/index.ts';
import { CanvasNamespace } from '../../namespace.ts';
import { useCanvasLoaded, useSceneDocument } from '../CanvasStage/index.ts';

export type CanvasDslProps = {
  role?: string;
  /** The drawing whose article this sits beside. */
  drawing: Drawing.Drawing;
  attendableId?: string;
};

/**
 * The drawing beside it, as text. A drawing a grid diagram can say opens on that text (`diagram kind=grid`), which
 * is what an author writes; any other opens on its boxes. Either can be edited, and `Rebuild` makes the drawing
 * what the text says.
 */
export const CanvasDsl = ({ role, drawing, attendableId }: CanvasDslProps) => {
  const { t } = Hooks.useTranslation(CanvasNamespace.key);
  const [snapshot] = useObject(drawing.canvas);
  const canvas = snapshot ? drawing.canvas.target : undefined;
  if (!Canvas.isCanvas(canvas)) {
    return (
      <Panel.Root role={role}>
        <Panel.Body>
          <p className='p-trim-md text-fg-muted' data-testid='canvas-dsl.empty'>
            {t('dsl.empty.message')}
          </p>
        </Panel.Body>
      </Panel.Root>
    );
  }
  return <CanvasDslEditor role={role} canvas={canvas} attendableId={attendableId} />;
};

CanvasDsl.displayName = 'CanvasDsl';

/** What the author has typed, and the printed text it was typed over. */
type Edit = { text: string; base: string; applied: boolean };

type CanvasDslEditorProps = Pick<CanvasDslProps, 'role' | 'attendableId'> & { canvas: Canvas.Canvas };

const CanvasDslEditor = ({ role, canvas, attendableId }: CanvasDslEditorProps) => {
  // The print reads the canvas's stored objects, which change in place: the compiler keys it on `canvas` alone.
  'use no memo';
  const { t } = Hooks.useTranslation(CanvasNamespace.key);
  // A host that locks every canvas locks its text too: Rebuild is an edit of the drawing.
  const readOnly = ToolkitHooks.useReadOnly();

  // The text is printed again whenever the scene it is printed from changes, wherever the change came from.
  const loaded = useCanvasLoaded(canvas);
  const document = useSceneDocument(openScene(canvas));
  const printed = useMemo(() => canvasDsl(canvas), [canvas, loaded, document]);

  // Intent is shown where there is one; the boxes are the other reading of the same drawing.
  const [boxes, setBoxes] = useState(false);
  const form: DslForm = printed.intent !== undefined && !boxes ? 'intent' : 'boxes';
  const text = form === 'intent' ? (printed.intent ?? printed.boxes) : printed.boxes;

  // An edit holds while the drawing is still the one it was typed over. When the drawing changes underneath it (an
  // agent redraws, someone moves a box), the text shown is the drawing's again: the text IS the drawing.
  const [edit, setEdit] = useState<Edit>();
  const current = edit?.base === text ? edit : undefined;
  const shown = current?.text ?? text;
  const dirty = current !== undefined && !current.applied;
  const [errors, setErrors] = useState<readonly string[]>([]);
  const [result, setResult] = useState<string>();

  const handleChange = useCallback(
    (next: string) => {
      setEdit({ text: next, base: text, applied: false });
      setErrors([]);
      setResult(undefined);
    },
    [text],
  );

  const handleRebuild = useCallback(() => {
    const { errors, drawn, cleared } = rebuildCanvas(canvas, shown, form);
    setErrors(errors);
    if (errors.length > 0) {
      return;
    }
    // The author's text stays as typed, comments included; it now stands over the drawing it has just made.
    const next = canvasDsl(canvas);
    const base = form === 'intent' ? (next.intent ?? next.boxes) : next.boxes;
    setEdit({ text: shown, base, applied: true });
    setResult(t('dsl.rebuilt.message', { drawn, cleared }));
  }, [canvas, shown, form, t]);

  const handleRevert = useCallback(() => {
    setEdit(undefined);
    setErrors([]);
    setResult(undefined);
  }, []);

  const handleToggleForm = useCallback(() => {
    setBoxes((boxes) => !boxes);
    setEdit(undefined);
    setErrors([]);
    setResult(undefined);
  }, []);

  const hasIntent = printed.intent !== undefined;
  const menuActions = useMenuBuilder(() => {
    const editing = readOnly
      ? MenuBuilder.make()
      : MenuBuilder.make()
          .action(
            'rebuild',
            {
              label: ['dsl.rebuild.label', { ns: CanvasNamespace.key }],
              icon: 'ph--arrows-clockwise--regular',
              disabled: !dirty,
              disposition: 'toolbar',
              testId: 'canvas-dsl.rebuild',
            },
            () => handleRebuild(),
          )
          .action(
            'revert',
            {
              label: ['dsl.revert.label', { ns: CanvasNamespace.key }],
              icon: 'ph--arrow-counter-clockwise--regular',
              disabled: !dirty,
              disposition: 'toolbar',
              testId: 'canvas-dsl.revert',
            },
            () => handleRevert(),
          );
    // Only a drawing with both readings has a choice between them; the item names the one it switches to.
    return (
      hasIntent
        ? editing.action(
            'form',
            {
              label: [
                form === 'intent' ? 'dsl.show-boxes.label' : 'dsl.show-intent.label',
                { ns: CanvasNamespace.key },
              ],
              icon: form === 'intent' ? 'ph--grid-four--regular' : 'ph--text-align-left--regular',
              disposition: 'toolbar',
              testId: 'canvas-dsl.form',
            },
            () => handleToggleForm(),
          )
        : editing
    ).build();
  }, [readOnly, dirty, hasIntent, form, handleRebuild, handleRevert, handleToggleForm]);

  const status =
    result ??
    (dirty
      ? t('dsl.edited.message')
      : form === 'intent'
        ? t('dsl.intent.message')
        : (printed.reasons[0] ?? t('dsl.boxes.message')));

  return (
    <Panel.Root role={role}>
      <Panel.Header>
        <ActionToolbar {...menuActions} attendableId={attendableId} />
      </Panel.Header>
      {/* `asChild`, so the editor IS the body: the body is a grid row, and a child filling it absolutely would pin to
          the panel and cover the header and footer. The key re-creates the editor when the text is the drawing's
          again, since an editor reads its text once. */}
      <Panel.Body asChild>
        <SourceEditor
          key={`${form}:${readOnly}:${current ? 'edit' : text}`}
          data-testid='canvas-dsl.editor'
          value={shown}
          onTextChange={readOnly ? undefined : handleChange}
        />
      </Panel.Body>
      <Panel.Footer classNames='p-1'>
        {errors.length > 0 ? (
          <span className='text-xs text-error-text' data-testid='canvas-dsl.errors'>
            {errors.join(' · ')}
          </span>
        ) : (
          <span className='text-xs text-fg-muted' data-testid='canvas-dsl.status'>
            {status}
          </span>
        )}
      </Panel.Footer>
    </Panel.Root>
  );
};
