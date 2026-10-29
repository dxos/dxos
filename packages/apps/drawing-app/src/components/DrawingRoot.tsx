//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import React, { type ChangeEvent, type DragEvent, useCallback, useEffect, useRef, useState } from 'react';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Hooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { type Space } from '@dxos/client/echo';
import { Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as DrawingOperation from '@dxos/plugin-illustrator/DrawingOperation';
import * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import * as IllustratorEvents from '@dxos/plugin-illustrator/IllustratorEvents';
import { AttendableContainer } from '@dxos/react-ui-attention';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Theme from '@dxos/react-ui/Theme';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { mx } from '@dxos/ui-theme';

import { fileName, importDrawing, openDrawing, openSpace, toDxSvg } from '../model/index.ts';

type Opened = { space: Space; drawing: Drawing.Drawing };

/**
 * Reads `?src=<url>` and `?d=<share id>` once, so a reload after editing reopens the edited copy rather than
 * importing again.
 */
const takeSourceParams = (): { src?: string; share?: string } => {
  const url = new URL(window.location.href);
  const src = url.searchParams.get('src') ?? undefined;
  const share = url.searchParams.get('d') ?? undefined;
  if (src || share) {
    url.searchParams.delete('src');
    url.searchParams.delete('d');
    window.history.replaceState(null, '', url);
  }
  return { src, share };
};

const isDxSvg = (file: File) => file.name.endsWith('.svg') || file.type === 'image/svg+xml';

/**
 * The "Edit in ..." actions Composer offers on a drawing's plank: each converts it to another variant's editor.
 * Re-reads the drawing's canvas, so the choices follow a conversion.
 */
const EditActions = ({ space, drawing, onError }: Opened & { onError: (message: string) => void }) => {
  const { t } = UiHooks.useTranslation();
  const { invokePromise } = Hooks.useOperationInvoker();
  const variants = Hooks.useCapabilities(IllustratorCapabilities.VariantProvider);
  // Only the schema is read: an editor writes its canvas while it renders, which must not re-render this.
  const [canvasRef] = useObject(drawing, 'canvas');
  const [schema] = useObject(canvasRef, 'schema');
  if (!schema) {
    return null;
  }
  return IllustratorCapabilities.editTargets(variants, schema).map((variant) => (
    <Button.Root
      key={variant.id}
      variant='ghost'
      icon={variant.icon ?? DrawingOperation.Convert.meta.icon}
      label={Theme.toLocalizedString(IllustratorCapabilities.editLabel(variant), t)}
      data-testid={`drawing-app.edit.${IllustratorCapabilities.variantSlug(variant)}`}
      onClick={() =>
        void invokePromise(
          DrawingOperation.Convert,
          // In place: the app shows this one drawing, so it must become editable itself rather than gain a copy.
          { drawing: Ref.make(drawing), variant: variant.id, replace: true },
          { spaceId: space.id },
        ).then(({ error }) => error && onError(error.message))
      }
    />
  ));
};

/**
 * The whole app: one drawing in the view Composer opens it in (a laid-out drawing reads as its SVG; an edited one
 * opens in its editor), filling the viewport, with open, edit and download controls over it.
 * Dropping a `.dx.svg` anywhere replaces the open drawing with an imported copy.
 */
export const DrawingRoot = () => {
  const manager = Hooks.useCapability(Capabilities.PluginManager);
  const client = Hooks.useCapability(ClientCapabilities.Client);
  const variants = Hooks.useCapabilities(IllustratorCapabilities.VariantProvider);
  const [opened, setOpened] = useState<Opened>();
  const [error, setError] = useState<string>();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const startedRef = useRef(false);

  const run = useCallback(
    (effect: Effect.Effect<Opened, Error>) =>
      EffectEx.runDetached(
        effect.pipe(
          Effect.tap((result) =>
            Effect.sync(() => {
              setError(undefined);
              setOpened(result);
            }),
          ),
          // A rejected `Effect.promise` is a defect, not a failure, so only the full cause keeps the loading text from sticking.
          Effect.catchCause((cause) =>
            Effect.sync(() => {
              if (Cause.hasInterruptsOnly(cause)) {
                return;
              }
              const error = Cause.squash(cause);
              log.error('drawing did not open', { error });
              setError(error instanceof Error ? error.message : String(error));
            }),
          ),
        ),
      ),
    [],
  );

  useEffect(() => {
    // A capability identity change reruns this effect; a second startup would race the first to create the starter.
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;
    const { src, share } = takeSourceParams();
    run(
      Effect.gen(function* () {
        // The edit actions need the operation handlers (Idle) and every variant (the illustrator's start) before any surface asks.
        yield* manager.activate(ActivationEvents.Idle);
        yield* manager.activate(IllustratorEvents.Start);
        const space = yield* openSpace(client);
        const drawing = yield* openDrawing({ space, src, share });
        return { space, drawing };
      }),
    );
  }, [manager, client, run]);

  const handleFile = useCallback(
    (file: File) => {
      if (!opened) {
        return;
      }
      const { space } = opened;
      run(
        Effect.gen(function* () {
          const svg = yield* Effect.promise(() => file.text());
          const drawing = yield* importDrawing(space, svg);
          return { space, drawing };
        }),
      );
    },
    [opened, run],
  );

  const handleDownload = useCallback(() => {
    const drawing = opened?.drawing;
    const canvas = drawing?.canvas.target;
    const variant = canvas && variants.find(({ id }) => id === canvas.schema);
    if (!drawing || !canvas || !variant) {
      return;
    }
    const blob = new Blob([toDxSvg({ drawing, canvas, builder: variant.builder })], { type: 'image/svg+xml' });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = fileName(drawing);
    anchor.click();
    URL.revokeObjectURL(href);
  }, [opened, variants]);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      const file = [...event.dataTransfer.files].find(isDxSvg);
      setDragging(false);
      if (file) {
        // Only a file drop is ours; a drag inside the canvas must reach the scene engine.
        event.preventDefault();
        handleFile(file);
      }
    },
    [handleFile],
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (event.dataTransfer.types.includes('Files')) {
      event.preventDefault();
      setDragging(true);
    }
  }, []);

  const handleInput = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (file) {
        handleFile(file);
      }
    },
    [handleFile],
  );

  const attendableId = opened?.drawing.id;
  return (
    <div
      className='fixed inset-0 flex flex-col bg-base-surface text-base-fg'
      data-testid='drawing-app'
      onDragOver={handleDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      {opened && attendableId ? (
        <AttendableContainer id={attendableId} classNames='dx-grow grid'>
          <Surface.Surface
            key={opened.drawing.id}
            type={AppSurface.Article}
            data={{ subject: opened.drawing, attendableId }}
            limit={1}
          />
        </AttendableContainer>
      ) : (
        <div className='flex-1 grid place-items-center text-description' data-testid='drawing-app.loading'>
          {error ?? 'Opening drawing...'}
        </div>
      )}

      {/* Positioned by a wrapper because the toolbar's own component styles override placement utilities. */}
      <div className='absolute top-2 left-1/2 -translate-x-1/2 z-30'>
        <Toolbar.Root
          classNames='w-auto rounded-sm bg-modal-surface border border-separator'
          data-testid='drawing-app.toolbar'
        >
          <Button.Root
            variant='ghost'
            iconOnly
            icon='ph--folder-open--regular'
            label='Open .dx.svg'
            data-testid='drawing-app.open'
            disabled={!opened}
            onClick={() => inputRef.current?.click()}
          />
          <Button.Root
            variant='ghost'
            iconOnly
            icon='ph--download-simple--regular'
            label='Download .dx.svg'
            data-testid='drawing-app.download'
            disabled={!opened}
            onClick={handleDownload}
          />
          {opened && <EditActions key={opened.drawing.id} {...opened} onError={setError} />}
        </Toolbar.Root>
      </div>
      <input
        ref={inputRef}
        type='file'
        accept='.svg,image/svg+xml'
        className='hidden'
        data-testid='drawing-app.file'
        onChange={handleInput}
      />

      {opened && error && (
        <div
          role='alert'
          className='absolute bottom-2 left-1/2 -translate-x-1/2 z-10 rounded-sm px-3 py-2 bg-modal-surface border border-separator text-sm'
        >
          {error}
        </div>
      )}
      <div
        className={mx(
          'pointer-events-none absolute inset-2 z-20 rounded-md border-2 border-dashed border-accent-surface transition-opacity',
          dragging ? 'opacity-100' : 'opacity-0',
        )}
      />
    </div>
  );
};
