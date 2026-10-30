//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import {
  type LatticeCell,
  type Point,
  cellBounds,
  occupancy,
  useCanvasGesture,
  useCanvasServices,
} from '@dxos/react-ui-canvas';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Menu from '@dxos/react-ui/Menu';

import { ProjectsNamespace } from '../../namespace.ts';

export type FeatureCanvasCellsProps = {
  /** A new feature in the cell centred on `position`. */
  onCreate?: (position: Point) => void;
  /** An existing feature moved into the cell centred on `position`. */
  onAdd?: (position: Point) => void;
  /**
   * Fixes the cards where they are drawn, by feature id, before a feature is placed: a new card changes the automatic
   * layout's extent, which would move the cards around the cell it was placed in.
   */
  onPin?: (centers: Record<string, Point>) => void;
};

const ADD_TEST_ID = 'feature-canvas.add';

const sameCell = (left?: LatticeCell, right?: LatticeCell) => left?.col === right?.col && left?.row === right?.row;

/**
 * A `+` in the empty cell under the pointer, which adds a feature there: a new one or an existing one. Drawn in scene
 * coordinates as the viewport's overlay; only the button takes the pointer, so empty cells still pan and select.
 */
export const FeatureCanvasCells = ({ onCreate, onAdd, onPin }: FeatureCanvasCellsProps) => {
  const { t } = UiHooks.useTranslation(ProjectsNamespace.key);
  const registry = useContext(RegistryContext);
  const { atoms, projection, readonly } = useCanvasServices(FeatureCanvasCells.displayName);
  const { displayScene } = useCanvasGesture(FeatureCanvasCells.displayName);
  const drag = useAtomValue(atoms.drag);
  const lattice = projection.lattice;
  const occupied = useMemo(
    () => (lattice ? occupancy(Object.values(displayScene.nodes), lattice) : new Map()),
    [displayScene, lattice],
  );

  // The scene's origin on screen, from a mark drawn at it, so a pointer position maps to a cell.
  const origin = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<LatticeCell>();
  // The cell whose menu is open stays drawn after the pointer leaves for the menu, until the menu has closed.
  const [open, setOpen] = useState<LatticeCell>();
  useEffect(() => {
    const view = origin.current?.closest<HTMLElement>('[data-testid="scene-view"]');
    if (!view || !lattice) {
      return;
    }
    const handleMove = (event: PointerEvent) => {
      // Over the button the pointer stays in its cell, whatever coordinates a synthetic event carries.
      if (!origin.current || (event.target as Element | null)?.closest?.(`[data-testid="${ADD_TEST_ID}"]`)) {
        return;
      }
      const { left, top } = origin.current.getBoundingClientRect();
      const { zoom } = registry.get(atoms.camera);
      // Cells are centred on whole pitches.
      const cell = {
        col: Math.round((event.clientX - left) / zoom / (lattice.width + lattice.gutterX)) + 0,
        row: Math.round((event.clientY - top) / zoom / (lattice.height + lattice.gutterY)) + 0,
        spanX: 1,
        spanY: 1,
      };
      setHovered((previous) => (sameCell(previous, cell) ? previous : cell));
    };
    const handleLeave = () => setHovered(undefined);
    view.addEventListener('pointermove', handleMove);
    view.addEventListener('pointerleave', handleLeave);
    return () => {
      view.removeEventListener('pointermove', handleMove);
      view.removeEventListener('pointerleave', handleLeave);
    };
  }, [registry, atoms, lattice]);

  // Run once the menu has closed: Ark's menu returns focus to its trigger on close, which would take it from the
  // companion a new feature opens in, or from the dialog.
  const pending = useRef<(() => void) | undefined>(undefined);
  const handleExitComplete = useCallback(() => {
    const action = pending.current;
    pending.current = undefined;
    setOpen(undefined);
    action?.();
  }, []);

  // Placing fixes the cards where they are drawn first, so the new card's cell stays next to the ones it was beside.
  const place = (add: () => void) => {
    pending.current = () => {
      onPin?.(Object.fromEntries(Object.values(displayScene.nodes).map((node) => [node.id, node.center])));
      add();
    };
  };

  if (!lattice || readonly || (!onCreate && !onAdd)) {
    return null;
  }

  const cell = open ?? (drag ? undefined : hovered);
  const shown = cell && !occupied.has(`${cell.col},${cell.row}`) ? cell : undefined;
  const bounds = shown && cellBounds(shown, lattice);
  const position = bounds && { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };

  return (
    <>
      <div ref={origin} className='absolute left-0 top-0 size-0' />
      {shown && bounds && position && (
        <div
          key={`${shown.col},${shown.row}`}
          className='absolute grid place-items-center pointer-events-none'
          style={{ left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height }}
        >
          <Menu.Root onOpenChange={({ open }) => open && setOpen(shown)} onExitComplete={handleExitComplete}>
            <Menu.Trigger asChild>
              <Button.Root
                variant='ghost'
                icon='ph--plus--regular'
                iconOnly
                label={t('feature-canvas.add-feature.label')}
                classNames='pointer-events-auto size-24 opacity-60 hover:opacity-100'
                iconClassNames='size-12'
                data-testid={ADD_TEST_ID}
              />
            </Menu.Trigger>
            <Menu.Content>
              {onCreate && (
                <Menu.Item
                  item={{ value: 'new', label: t('feature-map.new-feature.label'), icon: 'ph--plus--regular' }}
                  data-testid='feature-map.new-feature'
                  onClick={() => place(() => onCreate(position))}
                />
              )}
              {onAdd && (
                <Menu.Item
                  item={{ value: 'add', label: t('feature-map.add-feature.label'), icon: 'ph--list-plus--regular' }}
                  data-testid='feature-map.add-feature'
                  onClick={() => place(() => onAdd(position))}
                />
              )}
            </Menu.Content>
          </Menu.Root>
        </div>
      )}
    </>
  );
};

FeatureCanvasCells.displayName = 'FeatureCanvasCells';
