//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import * as Project from '@dxos/compute/Project';
import { Obj, Ref, Type } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as ProjectOperation from '@dxos/plugin-projects/ProjectOperation';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { Panel } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import {
  Board,
  type BoardController,
  type BoardRootProps,
  type CellLayout,
  type Layout,
  resizeToFit,
} from '@dxos/react-ui-board';
import { type ActionGraphProps, ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { MediaArtifactCard } from '#components';
import { meta } from '#meta';
import { Lightbox, MediaArtifact } from '#types';

const isArtifact = Obj.instanceOf(MediaArtifact.MediaArtifact);

/** A new card's footprint on the board. */
const CELL_SIZE = 2;

/**
 * The first cell inside the board's bounds not covered by an existing cell, scanning rows from the
 * top-left origin. Falls back to the origin on a full board, where the float resolver pushes the
 * overlap aside.
 */
const nextFreeCell = (
  cells: Record<string, CellLayout>,
  bounds: { columns: number; rows: number },
): Pick<CellLayout, 'x' | 'y'> => {
  const occupied = (x: number, y: number) =>
    Object.values(cells).some(
      (cell) =>
        x < cell.x + (cell.width ?? 1) &&
        x + CELL_SIZE > cell.x &&
        y < cell.y + (cell.height ?? 1) &&
        y + CELL_SIZE > cell.y,
    );
  for (let y = 0; y + CELL_SIZE <= bounds.rows; y += 1) {
    for (let x = 0; x + CELL_SIZE <= bounds.columns; x += 1) {
      if (!occupied(x, y)) {
        return { x, y };
      }
    }
  }
  return { x: 0, y: 0 };
};

export type LightboxArticleProps = AppSurface.ObjectArticleProps<Lightbox.Lightbox>;

/**
 * A spatial "lightbox" of {@link MediaArtifact}s laid out on a `Board` (react-ui-board). Each artifact
 * renders as its cover-variant card (the `CardContent` surface); dragging persists cell positions.
 * The same artifacts can also be viewed as a `Collection` masonry — layout is a view, not a schema.
 */
export const LightboxArticle = ({ role, subject: lightbox, attendableId }: LightboxArticleProps) => {
  const { hasAttention } = useAttention(attendableId);
  const { invokePromise } = useOperationInvoker();

  const [items] = useObject(lightbox, 'items');
  const itemsAtom = useMemo(
    () =>
      Atom.make((get) => {
        const result: MediaArtifact.MediaArtifact[] = [];
        for (const ref of items ?? []) {
          const obj = get(Obj.atomReactive(ref));
          if (obj && isArtifact(obj)) {
            result.push(obj);
          }
        }
        return result;
      }),
    [items],
  );
  const artifacts = useAtomValue(itemsAtom);

  const controller = useRef<BoardController>(null);
  const [zoom, setZoom] = useState(1);

  // A snapshot, so a cell added or moved is a new value; reading `lightbox.layout` directly would
  // hand the memo the same proxy every render and the new cell never appears.
  const [boardLayout] = useObject(lightbox, 'layout');
  const layout = useMemo<Layout>(() => ({ items: boardLayout.cells }), [boardLayout]);
  const bounds = useMemo(
    () => ({ columns: boardLayout.size.width, rows: boardLayout.size.height }),
    [boardLayout.size.width, boardLayout.size.height],
  );

  const handleChange = useCallback<NonNullable<BoardRootProps['onChange']>>(
    (next) => {
      Obj.update(lightbox, (lightbox) => {
        lightbox.layout.cells = next.items;
      });
    },
    [lightbox],
  );

  // The create dialog places the artifact in the space; the lightbox item and the owning project's
  // artifacts array are what make it this lightbox's, so both links are written here. A cell's own
  // `+` names the cell; the toolbar's takes the next free one.
  const handleAddArtifact = useCallback(
    async (position?: Pick<CellLayout, 'x' | 'y'>) => {
      const db = Obj.getDatabase(lightbox);
      if (!db) {
        return;
      }
      const { data: ref } = await invokePromise(SpaceOperation.OpenObjectForm, {
        target: db,
        typename: Type.getTypename(MediaArtifact.MediaArtifact),
        navigable: false,
      });
      // The dialog was opened on the artifact typename, and the object it made is already in memory.
      const artifact = ref?.target;
      if (!artifact || !isArtifact(artifact)) {
        return;
      }
      Obj.update(lightbox, (lightbox) => {
        lightbox.items.push(Ref.make(artifact));
        lightbox.layout.cells[artifact.id] = {
          ...(position ?? nextFreeCell(lightbox.layout.cells, bounds)),
          width: CELL_SIZE,
          height: CELL_SIZE,
        };
      });
      const project = Obj.getParent(lightbox);
      if (project && Obj.instanceOf(Project.Project, project)) {
        await invokePromise(
          ProjectOperation.ArtifactAdd,
          { project: Ref.make(project), object: Ref.make(artifact) },
          { spaceId: db.spaceId },
        );
      }
    },
    [lightbox, bounds, invokePromise],
  );

  const menuActions = useMenuBuilder(
    (): ActionGraphProps =>
      MenuBuilder.make()
        .action(
          'add-artifact',
          {
            label: ['add-artifact.label', { ns: meta.profile.key }],
            icon: 'ph--plus--regular',
            disposition: 'toolbar',
          },
          () => void handleAddArtifact(),
        )
        .separator()
        .action(
          'center',
          {
            label: ['center.label', { ns: meta.profile.key }],
            icon: 'ph--crosshair--regular',
            disposition: 'toolbar',
            disabled: !hasAttention,
          },
          () => controller.current?.center(),
        )
        .action(
          'zoom',
          {
            label: ['zoom.label', { ns: meta.profile.key }],
            icon: zoom < 1 ? 'ph--arrows-in--regular' : 'ph--arrows-out--regular',
            disposition: 'toolbar',
            disabled: !hasAttention,
          },
          () => setZoom((value) => (value < 1 ? 1 : 0.5)),
        )
        .build(),
    [handleAddArtifact, hasAttention, zoom],
  );

  return (
    <Board.Root
      ref={controller}
      layout={layout}
      bounds={bounds}
      mode='float'
      resolver={resizeToFit}
      zoom={zoom}
      onChange={handleChange}
      onAdd={({ x, y }) => void handleAddArtifact({ x, y })}
    >
      <Panel.Root role={role}>
        <Panel.Toolbar asChild>
          <ActionToolbar {...menuActions} attendableId={attendableId} />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <Board.Container classNames='dx-fullscreen'>
            <Board.Viewport>
              <Board.Backdrop />
              <Board.Content>
                {artifacts.map((artifact) => {
                  const itemLayout = layout.items[artifact.id];
                  return itemLayout ? (
                    <Board.Cell item={artifact} key={artifact.id} layout={itemLayout}>
                      <MediaArtifactCard subject={artifact} />
                    </Board.Cell>
                  ) : null;
                })}
              </Board.Content>
            </Board.Viewport>
          </Board.Container>
        </Panel.Content>
      </Panel.Root>
    </Board.Root>
  );
};

LightboxArticle.displayName = 'LightboxArticle';
