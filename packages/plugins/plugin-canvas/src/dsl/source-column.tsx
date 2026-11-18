//
// Copyright 2026 DXOS.org
//

//
// The DSL column every story built from text shows beside its drawing: the toolbar is its header, the editor its
// body, the status bar its footer. `Parse` reports without touching the drawing; `Rebuild` is the one action that
// writes, and it clears the canvas first because the text IS the drawing — an object deleted from it has no
// command to remove it, so it would otherwise stay on screen.
//
// A JSON view beside the DSL shows the same drawing as the records it is stored as, which is how a loss is SEEN
// rather than measured: a kind, a marker or a route present in one and absent from the other is the whole class of
// defect this bench exists to catch.
//

import React, { useCallback, useEffect, useState } from 'react';

import { Dsl } from '@dxos/diagram';
import * as Button from '@dxos/react-ui/Button';
import * as Panel from '@dxos/react-ui/Panel';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { type Canvas } from '#types';

import { SourceEditor } from '../components/SourceEditor/index.ts';
import { CanvasLayoutBuilder, readCanvasContent } from '../model/canvas-content.ts';
import { rebuildCanvas } from '../model/canvas-dsl.ts';

/**
 * The canvas the story seeded, for the column beside it. `onInit` runs during client init, before anything renders,
 * and the harness hands the layout to `ModuleContainer` rather than to the story — so the editor reads the canvas
 * from here instead of through props it has no way to receive.
 *
 * `source` is the text a story of intent was written as. The canvas cannot give it back: it holds what the text
 * lowered to, so printing it shows grid boxes where the author wrote groups and nodes.
 */
export const seeded: { canvas?: Canvas.Canvas; source?: string } = {};

/** The drawing as scene DSL: one `object` statement per shape, which is what a drawing serializes to. */
const printCanvas = (canvas: Canvas.Canvas): string => Dsl.print(CanvasLayoutBuilder.read(canvas).scene);

/**
 * The drawing as the records it is actually stored as. The DSL is a second way of saying the same drawing, so
 * showing the two side by side is how a loss is SEEN rather than measured: a kind, a marker or a route present in
 * the records and absent from the text is the whole class of defect this bench exists to catch. It is also what a
 * model would emit if a drawing were authored as JSON instead of as text, which is worth weighing by eye — the
 * records run 3–6x the size of the DSL for the same drawing.
 */
const printRecords = (canvas: Canvas.Canvas): string => JSON.stringify(readCanvasContent(canvas), null, 2);

/** `scene` is what a document of intent lowered to: the boxes the canvas holds, which nobody writes. */
type SourceView = 'dsl' | 'scene' | 'json';
const SOURCE_VIEWS: readonly SourceView[] = ['dsl', 'scene', 'json'];
const isSourceView = (value: string): value is SourceView => SOURCE_VIEWS.some((view) => view === value);

/**
 * The DSL in the diagram language mode, applied to the canvas only when asked. Applying on a timer after each
 * keystroke cannot work: a document mid-edit parses to whatever the parser can still make sense of, so the drawing
 * was rebuilt from half-typed text — and `applyCommands` is a full sync, which deleted every shape the broken parse
 * had dropped. `Parse` reports without touching the drawing, `Rebuild` is the one action that writes.
 */
const ColumnEditor = ({ canvas, intent }: { canvas: Canvas.Canvas; intent?: string }) => {
  const [initialValue] = useState(() => intent ?? printCanvas(canvas));
  const [source, setSource] = useState(initialValue);
  const [view, setView] = useState<SourceView>('dsl');
  // Read again on every switch, so the records show the drawing as it is NOW rather than as it was at mount: a
  // `Rebuild` between the two views is exactly when the difference is worth seeing.
  const [records, setRecords] = useState(() => printRecords(canvas));
  const [scene, setScene] = useState(() => printCanvas(canvas));
  const [problems, setProblems] = useState<readonly { severity: string; message: string }[]>([]);
  const [status, setStatus] = useState<string>();

  // `read` for a printed drawing: its scene statements carry their own coordinates, so there is no layout to
  // solve — and solving one would move the shapes the slide placed. A document of intent has no commands until
  // its diagram is laid out, so it is parsed.
  const parse = useCallback(() => {
    const { commands, problems: found } = intent === undefined ? Dsl.read(source) : Dsl.parse(source);
    const errors = found.filter(({ severity }) => severity === 'error');
    setProblems(errors);
    const objects = commands.filter(({ op }) => op === 'upsert-object').length;
    setStatus(errors.length > 0 ? undefined : `${objects} object${objects === 1 ? '' : 's'}`);
    return { commands, errors };
  }, [source, intent]);

  const rebuild = useCallback(() => {
    const { errors, drawn, cleared } = rebuildCanvas(canvas, source, intent === undefined ? 'boxes' : 'intent');
    setProblems(errors.map((message) => ({ severity: 'error', message })));
    setStatus(errors.length > 0 ? undefined : `${drawn} drawn, ${cleared} cleared`);
  }, [canvas, source, intent]);

  const onChange = useCallback((text: string) => {
    setSource(text);
    setStatus(undefined);
  }, []);

  const onViewChange = useCallback(
    (next: string) => {
      if (!isSourceView(next)) {
        return;
      }
      if (next === 'json') {
        setRecords(printRecords(canvas));
      }
      if (next === 'scene') {
        setScene(printCanvas(canvas));
      }
      setView(next);
    },
    [canvas],
  );

  // A panel, as the article beside it is: the toolbar is its header, the editor its body, and the status bar its
  // footer — so the three bands come from the primitive rather than from a flex column measured by hand.
  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root data-testid='dsl-source.toolbar'>
          <Button.Root
            variant='ghost'
            icon='ph--check-circle--regular'
            label='Parse'
            data-testid='dsl-source.parse'
            onClick={parse}
          />
          <Button.Root
            variant='ghost'
            icon='ph--arrows-clockwise--regular'
            label='Rebuild'
            data-testid='dsl-source.rebuild'
            onClick={rebuild}
            disabled={view !== 'dsl'}
          />
          {/* The records are shown, not edited: writing them back is a different action from rebuilding a drawing
              out of its text, and it would have no undo here. */}
          <Toolbar.ToggleGroup type='single' value={view} onValueChange={onViewChange} aria-label='View'>
            <ToggleGroup.Item
              value='dsl'
              icon='ph--text-align-left--regular'
              label='DSL'
              iconOnly
              data-testid='dsl-source.view-dsl'
            />
            {intent !== undefined && (
              <ToggleGroup.Item
                value='scene'
                icon='ph--grid-four--regular'
                label='Boxes'
                iconOnly
                data-testid='dsl-source.view-scene'
              />
            )}
            <ToggleGroup.Item
              value='json'
              icon='ph--brackets-curly--regular'
              label='JSON'
              iconOnly
              data-testid='dsl-source.view-json'
            />
          </Toolbar.ToggleGroup>
        </Toolbar.Root>
      </Panel.Header>
      {/* `asChild`, so the editor IS the body: `.dx-panel-body` is a grid row, not a positioning context, and an
          absolutely filled child inside it pins to the panel instead and covers the header and footer. */}
      <Panel.Body asChild>
        {view === 'dsl' ? (
          <SourceEditor key='dsl' data-testid='dsl-source.editor' value={source} onTextChange={onChange} />
        ) : view === 'scene' ? (
          <SourceEditor key='scene' data-testid='dsl-source.editor' value={scene} />
        ) : (
          <SourceEditor key='json' data-testid='dsl-source.editor' language='json' value={records} />
        )}
      </Panel.Body>
      <Panel.Footer classNames='p-1'>
        {problems.length > 0 ? (
          <span className='text-xs text-error-text' data-testid='dsl-source.problems'>
            {problems.map(({ message }) => message).join(' · ')}
          </span>
        ) : (
          <span className='text-xs text-fg-muted' data-testid='dsl-source.status'>
            {view === 'json'
              ? `${records.split('\n').length} lines of records`
              : view === 'scene'
                ? `${scene.split('\n').length} lines of boxes from ${source.split('\n').length} of intent`
                : (status ?? ' ')}
          </span>
        )}
      </Panel.Footer>
    </Panel.Root>
  );
};

/** Waits for `onInit` to have seeded, since the canvas is filled during client init rather than on render. */
export const SourceColumn = () => {
  const [canvas, setCanvas] = useState(seeded.canvas);
  useEffect(() => {
    if (canvas) {
      return;
    }
    const timer = setInterval(() => seeded.canvas && setCanvas(seeded.canvas), 100);
    return () => clearInterval(timer);
  }, [canvas]);
  return canvas ? <ColumnEditor canvas={canvas} intent={seeded.source} /> : <div className='dx-base-surface' />;
};
