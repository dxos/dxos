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

import { json as jsonLanguage } from '@codemirror/lang-json';
import React, { useCallback, useEffect, useState } from 'react';

import { Dsl, applyCommands } from '@dxos/diagram';
import { diagram as diagramLanguage } from '@dxos/diagram/extension';
import { SceneHandler } from '@dxos/react-ui-canvas';
import { useTextEditor } from '@dxos/react-ui-editor';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { composable } from '@dxos/react-ui/Util';
import { createBasicExtensions, createThemeExtensions, listener } from '@dxos/ui-editor';

import { type Canvas } from '#types';

import { CanvasLayoutBuilder, editCanvasContent, readCanvasContent } from '../../model/canvas-content.ts';

/**
 * The canvas the story seeded, for the column beside it. `onInit` runs during client init, before anything renders,
 * and the harness hands the layout to `ModuleContainer` rather than to the story — so the editor reads the canvas
 * from here instead of through props it has no way to receive.
 */
export const seeded: { canvas?: Canvas.Canvas } = {};

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

type SourceView = 'dsl' | 'json';

/**
 * One editor per view, re-created when the view changes: CodeMirror takes its language at construction, so this
 * remounts rather than reconfiguring a live editor. The DSL text lives in the parent, so a remount keeps an edit.
 */
type TextPaneProps = {
  value: string;
  view: SourceView;
  onTextChange?: (text: string) => void;
};

/**
 * `composable()`, not a bare `forwardRef`: `Panel.Body asChild` hands its child the body's class, `data-part` and
 * ref, and only a component built this way is marked as able to take them. A plain one is warned about and
 * outlined in dev, which is the right diagnostic — dropping them leaves the body unstyled.
 */
const TextPane = composable<HTMLDivElement, TextPaneProps>(
  ({ value, view, onTextChange, className, ...props }, forwardedRef) => {
    const themeMode = Hooks.useThemeMode();
    const { parentRef, focusAttributes } = useTextEditor(
      () => ({
        initialValue: value,
        extensions: [
          createBasicExtensions({ lineNumbers: true, readOnly: onTextChange === undefined }),
          createThemeExtensions({ themeMode, syntaxHighlighting: true }),
          ...(view === 'dsl' ? [diagramLanguage({ layout: false })] : [jsonLanguage()]),
          ...(onTextChange ? [listener({ onChange: ({ text }) => onTextChange(text) })] : []),
        ],
      }),
      [themeMode, view],
    );
    // `Panel.Body asChild` hands this component the body's own class, `data-part` and ref, so it has to be a real
    // slot: dropping them leaves the body unstyled, and ark-ui outlines the child in red to say so.
    const setRef = useCallback(
      (node: HTMLDivElement | null) => {
        parentRef.current = node;
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [forwardedRef, parentRef],
    );
    return (
      <div
        {...props}
        {...focusAttributes}
        ref={setRef}
        className={['overflow-hidden', className].filter(Boolean).join(' ')}
        data-testid='studio-source.editor'
      />
    );
  },
);

/**
 * The DSL in the diagram language mode, applied to the canvas only when asked. Applying on a timer after each
 * keystroke cannot work: a document mid-edit parses to whatever the parser can still make sense of, so the drawing
 * was rebuilt from half-typed text — and `applyCommands` is a full sync, which deleted every shape the broken parse
 * had dropped. `Parse` reports without touching the drawing, `Rebuild` is the one action that writes.
 */
const SourceEditor = ({ canvas }: { canvas: Canvas.Canvas }) => {
  const [initialValue] = useState(() => printCanvas(canvas));
  const [source, setSource] = useState(initialValue);
  const [view, setView] = useState<SourceView>('dsl');
  // Read again on every switch, so the records show the drawing as it is NOW rather than as it was at mount: a
  // `Rebuild` between the two views is exactly when the difference is worth seeing.
  const [records, setRecords] = useState(() => printRecords(canvas));
  const [problems, setProblems] = useState<readonly { severity: string; message: string }[]>([]);
  const [status, setStatus] = useState<string>();

  // `read` rather than `compile`: these are scene statements, which carry their own coordinates, so there is no
  // layout to solve — and solving one would move the shapes the slide placed.
  const parse = useCallback(() => {
    const { commands, problems: found } = Dsl.read(source);
    const errors = found.filter(({ severity }) => severity === 'error');
    setProblems(errors);
    const objects = commands.filter(({ op }) => op === 'upsert-object').length;
    setStatus(errors.length > 0 ? undefined : `${objects} object${objects === 1 ? '' : 's'}`);
    return { commands, errors };
  }, [source]);

  const rebuild = useCallback(() => {
    const { commands, errors } = parse();
    if (errors.length > 0) {
      return;
    }
    // `Rebuild` means the text IS the drawing, so the canvas is cleared first. `applyCommands` only touches the
    // objects its commands name — it re-renders each one and removes nothing else — so an object deleted from the
    // text had no command to remove it and simply stayed on the canvas.
    //
    // Only DSL-managed records go: a shape drawn by hand is in no text and clearing it would lose work that the
    // text cannot bring back. Both halves are one edit, so the canvas is never written empty.
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
    setStatus(`${drawn} drawn, ${cleared} cleared`);
  }, [parse, canvas]);

  const onChange = useCallback((text: string) => {
    setSource(text);
    setStatus(undefined);
  }, []);

  const onViewChange = useCallback(
    (next: string) => {
      if (next !== 'dsl' && next !== 'json') {
        return;
      }
      if (next === 'json') {
        setRecords(printRecords(canvas));
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
        <Toolbar.Root data-testid='studio-source.toolbar'>
          <Button.Root
            variant='ghost'
            icon='ph--check-circle--regular'
            label='Parse'
            data-testid='studio-source.parse'
            onClick={parse}
          />
          <Button.Root
            variant='ghost'
            icon='ph--arrows-clockwise--regular'
            label='Rebuild'
            data-testid='studio-source.rebuild'
            onClick={rebuild}
            disabled={view === 'json'}
          />
          {/* The records are shown, not edited: writing them back is a different action from rebuilding a drawing
              out of its text, and it would have no undo here. */}
          <Toolbar.ToggleGroup type='single' value={view} onValueChange={onViewChange} aria-label='View'>
            <ToggleGroup.Item
              value='dsl'
              icon='ph--text-align-left--regular'
              label='DSL'
              iconOnly
              data-testid='studio-source.view-dsl'
            />
            <ToggleGroup.Item
              value='json'
              icon='ph--brackets-curly--regular'
              label='JSON'
              iconOnly
              data-testid='studio-source.view-json'
            />
          </Toolbar.ToggleGroup>
        </Toolbar.Root>
      </Panel.Header>
      {/* `asChild`, so the editor IS the body: `.dx-panel-body` is a grid row, not a positioning context, and an
          absolutely filled child inside it pins to the panel instead and covers the header and footer. */}
      <Panel.Body asChild>
        {view === 'dsl' ? (
          <TextPane key='dsl' view='dsl' value={source} onTextChange={onChange} />
        ) : (
          <TextPane key='json' view='json' value={records} />
        )}
      </Panel.Body>
      <Panel.Footer classNames='p-1'>
        {problems.length > 0 ? (
          <span className='text-xs text-error-text' data-testid='studio-source.problems'>
            {problems.map(({ message }) => message).join(' · ')}
          </span>
        ) : (
          <span className='text-xs text-fg-muted' data-testid='studio-source.status'>
            {view === 'json' ? `${records.split('\n').length} lines of records` : (status ?? ' ')}
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
  return canvas ? <SourceEditor canvas={canvas} /> : <div className='dx-base-surface' />;
};
