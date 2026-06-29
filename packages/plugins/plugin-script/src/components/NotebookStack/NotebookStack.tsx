//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { Obj } from '@dxos/echo';
import { type ThemedClassName, DropdownMenu, IconButton, ScrollArea, useTranslation } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { type MosaicEventHandler, type MosaicTileProps, Mosaic } from '@dxos/react-ui-mosaic';
import { mx } from '@dxos/ui-theme';
import { arrayMove } from '@dxos/util';

import { meta } from '#meta';
import { type Notebook } from '#types';

import { type TypescriptEditorProps } from '../TypescriptEditor';
import { type NotebookCellProps, NotebookCell } from './NotebookCell';
import { NotebookMenu } from './NotebookMenu';

const minSectionHeight = 'min-h-[16rem]';

const getCellId = (cell: Notebook.Cell) => cell.id;

export type NotebookStackProps = ThemedClassName<
  {
    notebook?: Notebook.Notebook;
  } & (Pick<NotebookSectionProps, 'db' | 'graph' | 'promptResults' | 'onCellInsert' | 'onCellDelete'> &
    Pick<TypescriptEditorProps, 'env'>)
>;

export const NotebookStack = composable<HTMLDivElement, NotebookStackProps>(
  ({ notebook, db, graph, promptResults, onCellInsert, onCellDelete, env, ...props }, forwardedRef) => {
    const [viewport, setViewport] = useState<HTMLElement | null>(null);

    // Stable Tile identity: an inline component is a new type each render, so Mosaic would unmount and
    // remount every cell (losing editor state) whenever this component re-renders.
    const Tile = useCallback(
      (tileProps: MosaicTileProps<Notebook.Cell>) => (
        <NotebookSection
          {...tileProps}
          db={db}
          graph={graph}
          promptResults={promptResults}
          onCellInsert={onCellInsert}
          onCellDelete={onCellDelete}
          env={env}
        />
      ),
      [db, graph, promptResults, onCellInsert, onCellDelete, env],
    );

    // Reorder cells in place; placeholder/tile locations are 1-based with half-step placeholders between
    // tiles, so the floor of the drop location is the destination array index (see Mosaic.Stack).
    const eventHandler = useMemo<MosaicEventHandler<Notebook.Cell>>(
      () => ({
        id: notebook?.id ?? 'notebook',
        // Only the notebook's own cells are droppable; onDrop only reorders within this notebook.
        canDrop: ({ source }) => !!notebook && notebook.cells.some((cell) => cell.id === source.id),
        onDrop: ({ source, target }) => {
          if (!notebook || !target) {
            return;
          }

          const to =
            target.type === 'tile' || target.type === 'placeholder'
              ? target.location
              : target.type === 'container'
                ? notebook.cells.length
                : -1;
          const insertIndex = typeof to === 'number' && to >= 0 ? Math.floor(to) : -1;
          if (insertIndex < 0) {
            return;
          }

          Obj.update(notebook, (notebook) => {
            const from = notebook.cells.findIndex((cell) => cell.id === source.id);
            if (from !== -1) {
              arrayMove(notebook.cells, from, insertIndex);
            }
          });
        },
      }),
      [notebook],
    );

    return (
      <Mosaic.Root ref={forwardedRef}>
        <Mosaic.Container asChild orientation='vertical' autoScroll={viewport} eventHandler={eventHandler}>
          <ScrollArea.Root orientation='vertical' padding {...composableProps(props)}>
            <ScrollArea.Viewport ref={setViewport}>
              <Mosaic.Stack orientation='vertical' items={notebook?.cells ?? []} getId={getCellId} Tile={Tile} />
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Mosaic.Container>
      </Mosaic.Root>
    );
  },
);

type NotebookSectionProps = MosaicTileProps<Notebook.Cell> &
  Pick<NotebookCellProps, 'db' | 'graph' | 'promptResults' | 'onCellInsert' | 'onCellDelete' | 'env'>;

// TODO(burdon): Option for narrow rail (with compact buttons that align with first button in toolbar).
// TODO(burdon): Reinstate a Mosaic-native resize affordance for query cells (currently a fixed min-height).
const NotebookSection = ({
  data: cell,
  db,
  env,
  graph,
  promptResults,
  onCellInsert,
  onCellDelete,
  ...tileProps
}: NotebookSectionProps) => {
  const { t } = useTranslation(meta.profile.key);
  const resizable = cell.type === 'query';
  const [dragHandle, setDragHandle] = useState<HTMLButtonElement | null>(null);

  return (
    <Mosaic.Tile
      {...tileProps}
      data={cell}
      dragHandle={dragHandle}
      classNames={mx(
        'grid grid-cols-[min-content_1fr] overflow-visible border border-subdued-separator',
        resizable && minSectionHeight,
      )}
    >
      {/* Side rail */}
      <div className='flex flex-col p-1 border-e border-subdued-separator dx-attention-surface'>
        <IconButton
          ref={setDragHandle}
          variant='ghost'
          icon='ph--dots-six-vertical--regular'
          iconOnly
          label='Drag handle'
        />
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <IconButton
              variant='ghost'
              icon='ph--dots-three--regular'
              iconOnly
              label={t('notebook-cell-insert.label')}
            />
          </DropdownMenu.Trigger>
          <NotebookMenu cell={cell} onCellInsert={onCellInsert} onCellDelete={onCellDelete} />
        </DropdownMenu.Root>
      </div>

      <NotebookCell db={db} cell={cell} env={env} graph={graph} promptResults={promptResults} />
    </Mosaic.Tile>
  );
};
