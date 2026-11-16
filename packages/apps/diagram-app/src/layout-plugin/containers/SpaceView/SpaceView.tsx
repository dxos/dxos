//
// Copyright 2026 DXOS.org
//

import React, { Fragment, Suspense, useCallback, useEffect, useLayoutEffect } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Hooks from '@dxos/app-framework/Hooks';
import { type Space } from '@dxos/client/echo';
import { EID } from '@dxos/keys';
import { log } from '@dxos/log';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as Containers from '@dxos/plugin-space/Containers';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { useSpaceProperties } from '@dxos/react-client/echo';
import * as Button from '@dxos/react-ui/Button';
import * as Layout from '@dxos/react-ui/Layout';
import * as Popover from '@dxos/react-ui/Popover';
import * as Typography from '@dxos/react-ui/Typography';

import { type NavigateMode, PillFrame, PillToolbar, dismissShell, setBootLook } from '../../../shared/index.ts';
import { DiagramMenu, useDrawingName } from '../../components/DiagramMenu/index.ts';
import { SpaceMenu, type SpaceMenuProps, spaceLook } from '../../components/SpaceMenu/index.ts';
import { useCanvasDrawings, useLayoutAccent } from '../../hooks/index.ts';
import { DiagramAppCapabilities } from '../../types/index.ts';
import { removeDrawing, savePreload } from '../../util/index.ts';
import { DIAGRAM_MENU_ANCHOR, SPACE_MENU_ANCHOR } from '../DiagramLayout/index.ts';
import { DrawingView } from '../DrawingView/index.ts';
import { ShareDialog } from '../ShareDialog/index.ts';

export type SpaceViewProps = Omit<SpaceMenuProps, 'current'> & {
  space: Space;
  /** The diagram the URL names, if any. */
  drawingId?: string;
  onSelectDrawing: (drawingId: string, mode: NavigateMode) => void;
  onCreateDiagram: (space: Space, name?: string) => Promise<Drawing.Drawing>;
  onError: (message: string) => void;
};

/** One space: its open diagram on the canvas, and the pill with the space and diagram menus, viewers and Share. */
export const SpaceView = ({
  space,
  drawingId,
  onSelectDrawing,
  onCreateDiagram,
  onError,
  ...spaceMenu
}: SpaceViewProps) => {
  const { drawings, pending } = useCanvasDrawings(space, drawingId);
  const { invokePromise } = Hooks.useOperationInvoker();
  const [{ popoverAnchor, sharing }, updateLayout] = Hooks.useAtomCapabilityState(DiagramAppCapabilities.LayoutState);
  const setSharing = useCallback(
    (next: boolean) => updateLayout((state) => ({ ...state, sharing: next })),
    [updateLayout],
  );
  const DiagramAnchor = popoverAnchor?.anchorId === DIAGRAM_MENU_ANCHOR ? Popover.Anchor : Fragment;
  const SpaceAnchor = popoverAnchor?.anchorId === SPACE_MENU_ANCHOR ? Popover.Anchor : Fragment;
  const named = drawings.find(({ id }) => id === drawingId);
  // While a named diagram's canvas is still loading, show nothing rather than flash another diagram.
  const drawing = named ?? (pending && drawingId ? undefined : drawings[0]);
  const [properties] = useSpaceProperties(space.id);
  const drawingName = useDrawingName(drawing);
  const accent = useLayoutAccent();

  // What the diagram reached is saved as it is left, for the next load to fetch in one batch.
  useEffect(() => {
    if (!drawing) {
      return;
    }
    const handleVisibilityChange = () => document.visibilityState === 'hidden' && savePreload(drawing);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      savePreload(drawing);
    };
  }, [drawing]);

  // With a diagram, the boot shell waits for its frame (`DrawingView`); without one, it gives way to the empty state.
  useLayoutEffect(() => {
    if (!drawing && !pending) {
      dismissShell();
    }
  }, [drawing, pending]);

  useEffect(() => {
    if (properties && drawing) {
      const { name, hue } = spaceLook(space);
      setBootLook({ spaceId: space.id, spaceName: name, spaceHue: hue, drawingId: drawing.id, drawingName });
    }
  }, [space, properties, drawing, drawingName]);

  // A URL with no diagram, or one that names none here, is rewritten to the diagram shown.
  useEffect(() => {
    if (drawing && drawing.id !== drawingId) {
      onSelectDrawing(drawing.id, 'replace');
    }
  }, [drawing, drawingId, onSelectDrawing]);

  // Each navigation writes a new route: a create or delete that finishes after the user has moved on, even back to
  // the same diagram, leaves the view where they went. Read from the registry, not render, so it is current at once.
  const registry = Hooks.useCapability(Capabilities.AtomRegistry);
  const layoutState = Hooks.useCapability(DiagramAppCapabilities.LayoutState);
  const currentRoute = useCallback(() => registry.get(layoutState).route, [registry, layoutState]);

  const create = useCallback(
    (name?: string) => {
      const from = currentRoute();
      onCreateDiagram(space, name).then(
        (created) => currentRoute() === from && onSelectDrawing(created.id, 'push'),
        (err) => {
          log.error('diagram not created', { err });
          onError('The diagram could not be created.');
        },
      );
    },
    [space, currentRoute, onCreateDiagram, onSelectDrawing, onError],
  );

  // Option-N types a character on macOS, so the physical key is matched, not the character.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.code === 'KeyN') {
        event.preventDefault();
        create();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [create]);

  const handleDelete = useCallback(
    (target: Drawing.Drawing) => {
      // Deleting the open diagram moves to another; deleting any other leaves the view where it is.
      const next = target.id === drawing?.id ? drawings.find(({ id }) => id !== target.id) : undefined;
      const from = currentRoute();
      void removeDrawing(space, target).then(() => next && currentRoute() === from && onSelectDrawing(next.id, 'replace'));
    },
    [space, currentRoute, drawing, drawings, onSelectDrawing],
  );

  return (
    <div className='fixed inset-0 flex flex-col bg-base-surface text-base-fg' data-testid='diagram-app'>
      {drawing ? (
        <DrawingView key={drawing.id} drawing={drawing} />
      ) : (
        !pending && (
          <Layout.Flex center column gap='md' classNames='grow' data-testid='diagram-app.empty'>
            <Typography.Text classNames='text-fg-muted'>No diagrams in this space yet.</Typography.Text>
            <Button.Root variant='primary' icon='ph--plus--regular' onClick={() => create()}>
              New diagram
            </Button.Root>
          </Layout.Flex>
        )
      )}

      <PillFrame testId='diagram-app.pill' accent={accent}>
        {/* A rename popover from a row menu sits under its menu's button, as Composer's under the row. */}
        <PillToolbar
          space={
            <SpaceAnchor>
              <SpaceMenu current={space} {...spaceMenu} />
            </SpaceAnchor>
          }
          diagram={
            <DiagramAnchor>
              <DiagramMenu
                drawings={drawings}
                current={drawing}
                onSelect={(next) => onSelectDrawing(next.id, 'push')}
                onCreate={create}
                onRename={(target) =>
                  void invokePromise(SpaceOperation.RenameObject, { object: target, caller: DIAGRAM_MENU_ANCHOR })
                }
                onDelete={handleDelete}
              />
            </DiagramAnchor>
          }
          presence={
            <Suspense>
              <Containers.SpacePresence
                spaceId={space.id}
                presenceKey={drawing && EID.make({ spaceId: space.id, entityId: drawing.id })}
                everyone
                size='sm'
              />
            </Suspense>
          }
          onShare={() => setSharing(true)}
        />
      </PillFrame>

      {sharing && <ShareDialog space={space} onClose={() => setSharing(false)} />}
    </div>
  );
};
