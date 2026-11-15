//
// Copyright 2026 DXOS.org
//

import React, { Fragment, Suspense, useCallback, useEffect, useLayoutEffect, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { type Space } from '@dxos/client/echo';
import { log } from '@dxos/log';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as Containers from '@dxos/plugin-space/Containers';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { useSpaceProperties } from '@dxos/react-client/echo';
import * as Button from '@dxos/react-ui/Button';
import * as Layout from '@dxos/react-ui/Layout';
import * as Popover from '@dxos/react-ui/Popover';
import * as Typography from '@dxos/react-ui/Typography';

import { LayoutState } from '../DiagramAppCapabilities.ts';
import { useCanvasDrawings, useViewers } from '../hooks/index.ts';
import { type NavigateMode, removeDrawing, savePreload, setBootLook } from '../model/index.ts';
import { dismissBootShell } from './BootShell.tsx';
import { DIAGRAM_MENU_ANCHOR } from './DiagramLayout.tsx';
import { DiagramMenu, useDrawingName } from './DiagramMenu.tsx';
import { DrawingView } from './DrawingView.tsx';
import { PillFrame, PillSeparator, ShareButton } from './Pill.tsx';
import { ShareDialog } from './ShareDialog.tsx';
import { SpaceMenu, type SpaceMenuProps, spaceLook } from './SpaceMenu.tsx';

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
  const [sharing, setSharing] = useState(false);
  const { invokePromise } = Hooks.useOperationInvoker();
  const { popoverAnchor } = Hooks.useAtomCapability(LayoutState);
  const MenuAnchor = popoverAnchor?.anchorId === DIAGRAM_MENU_ANCHOR ? Popover.Anchor : Fragment;
  const named = drawings.find(({ id }) => id === drawingId);
  // While a named diagram's canvas is still loading, show nothing rather than flash another diagram.
  const drawing = named ?? (pending && drawingId ? undefined : drawings[0]);
  const viewers = useViewers(space, drawing?.id);
  const [properties] = useSpaceProperties(space.id);
  const drawingName = useDrawingName(drawing);

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
      dismissBootShell();
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

  const create = useCallback(
    (name?: string) => {
      onCreateDiagram(space, name).then(
        (created) => onSelectDrawing(created.id, 'push'),
        (err) => {
          log.error('diagram not created', { err });
          onError('The diagram could not be created.');
        },
      );
    },
    [space, onCreateDiagram, onSelectDrawing, onError],
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
      void removeDrawing(space, target).then(() => next && onSelectDrawing(next.id, 'replace'));
    },
    [space, drawing, drawings, onSelectDrawing],
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

      <PillFrame testId='diagram-app.pill'>
        <SpaceMenu current={space} {...spaceMenu} />
        <PillSeparator />
        {/* A rename popover from the diagram's row menu sits under the menu's button, as Composer's under the row. */}
        <MenuAnchor>
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
        </MenuAnchor>
        <ShareButton data-testid='diagram-app.share' onClick={() => setSharing(true)} />
        <Suspense>
          <Containers.FullPresence members={viewers} size='sm' />
        </Suspense>
      </PillFrame>

      {sharing && <ShareDialog space={space} onClose={() => setSharing(false)} />}
    </div>
  );
};
