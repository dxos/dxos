//
// Copyright 2026 DXOS.org
//

import React, { Suspense, useCallback, useEffect, useState } from 'react';

import { type Space } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as Containers from '@dxos/plugin-space/Containers';
import * as Button from '@dxos/react-ui/Button';
import * as Layout from '@dxos/react-ui/Layout';
import * as Typography from '@dxos/react-ui/Typography';

import { useCanvasDrawings, useViewers } from '../hooks/index.ts';
import { removeDrawing } from '../model/index.ts';
import { DiagramMenu } from './DiagramMenu.tsx';
import { DrawingView } from './DrawingView.tsx';
import { NameDialog } from './NameDialog.tsx';
import { ShareDialog } from './ShareDialog.tsx';
import { SpaceMenu, type SpaceMenuProps } from './SpaceMenu.tsx';

export type NavigateMode = 'push' | 'replace';

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
  const { drawings, pending } = useCanvasDrawings(space);
  const [dialog, setDialog] = useState<{ kind: 'share' } | { kind: 'rename'; drawing: Drawing.Drawing }>();
  const named = drawings.find(({ id }) => id === drawingId);
  // While a named diagram's canvas is still loading, show nothing rather than flash another diagram.
  const drawing = named ?? (pending && drawingId ? undefined : drawings[0]);
  const viewers = useViewers(space, drawing?.id);

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

      {/* The canvas article's toolbars hold the corners and the bottom edge; the top center is free. */}
      <Layout.Flex
        gap='xs'
        align='center'
        classNames='absolute top-2 inset-x-0 mx-auto w-fit z-30 rounded-sm bg-modal-surface border border-separator p-0.5'
        data-testid='diagram-app.pill'
      >
        <SpaceMenu current={space} {...spaceMenu} />
        <Typography.Text classNames='text-fg-subtle'>/</Typography.Text>
        <DiagramMenu
          drawings={drawings}
          current={drawing}
          onSelect={(next) => onSelectDrawing(next.id, 'push')}
          onCreate={create}
          onRename={(target) => setDialog({ kind: 'rename', drawing: target })}
          onDelete={handleDelete}
        />
        <Suspense>
          <Containers.FullPresence members={viewers} size='sm' />
        </Suspense>
        <Button.Root
          variant='primary'
          icon='ph--user-plus--regular'
          data-testid='diagram-app.share'
          onClick={() => setDialog({ kind: 'share' })}
        >
          Share
        </Button.Root>
      </Layout.Flex>

      {dialog?.kind === 'share' && <ShareDialog space={space} onClose={() => setDialog(undefined)} />}
      {dialog?.kind === 'rename' && (
        <NameDialog
          title='Rename diagram'
          label='Name'
          submitLabel='Rename'
          initialValue={dialog.drawing.name ?? ''}
          onClose={() => setDialog(undefined)}
          onSubmit={(name) => {
            Obj.update(dialog.drawing, (drawing) => {
              drawing.name = name;
            });
            setDialog(undefined);
          }}
        />
      )}
    </div>
  );
};
