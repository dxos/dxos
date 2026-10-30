//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useCallback, useMemo, useRef } from 'react';

import {
  type LatticeCell,
  type LatticeSpec,
  type Point,
  type View,
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

/** The empty cells around the map's cards, or the centre cell of an empty map. */
const emptyCells = (scene: View, spec: LatticeSpec): LatticeCell[] => {
  const occupied = occupancy(Object.values(scene.nodes), spec);
  const taken = [...occupied.keys()].map((key) => key.split(',').map(Number));
  if (taken.length === 0) {
    return [{ col: 0, row: 0, spanX: 1, spanY: 1 }];
  }
  const cols = taken.map(([col]) => col);
  const rows = taken.map(([, row]) => row);
  const cells: LatticeCell[] = [];
  for (let row = Math.min(...rows) - 1; row <= Math.max(...rows) + 1; row++) {
    for (let col = Math.min(...cols) - 1; col <= Math.max(...cols) + 1; col++) {
      if (!occupied.has(`${col},${row}`)) {
        cells.push({ col, row, spanX: 1, spanY: 1 });
      }
    }
  }
  return cells;
};

/**
 * A `+` in each empty cell next to the map's cards, which adds a feature there: a new one or an existing one. Drawn in
 * scene coordinates as the viewport's overlay; only the buttons take the pointer, so the cells still pan and select.
 */
export const FeatureCanvasCells = ({ onCreate, onAdd, onPin }: FeatureCanvasCellsProps) => {
  const { t } = UiHooks.useTranslation(ProjectsNamespace.key);
  const { atoms, projection, readonly } = useCanvasServices(FeatureCanvasCells.displayName);
  const { displayScene } = useCanvasGesture(FeatureCanvasCells.displayName);
  const drag = useAtomValue(atoms.drag);
  const lattice = projection.lattice;
  const cells = useMemo(() => (lattice ? emptyCells(displayScene, lattice) : []), [displayScene, lattice]);

  // Run once the menu has closed: Ark's menu returns focus to its trigger on close, which would take it from the
  // companion a new feature opens in, or from the dialog.
  const pending = useRef<(() => void) | undefined>(undefined);
  const handleExitComplete = useCallback(() => {
    const action = pending.current;
    pending.current = undefined;
    action?.();
  }, []);

  // Placing fixes the cards where they are drawn first, so the new card's cell stays next to the ones it was beside.
  const place = (add: () => void) => {
    pending.current = () => {
      onPin?.(Object.fromEntries(Object.values(displayScene.nodes).map((node) => [node.id, node.center])));
      add();
    };
  };

  if (!lattice || readonly || drag || (!onCreate && !onAdd)) {
    return null;
  }

  return (
    <>
      {cells.map((cell) => {
        const bounds = cellBounds(cell, lattice);
        const position = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
        return (
          <div
            key={`${cell.col},${cell.row}`}
            className='absolute grid place-items-center pointer-events-none'
            style={{ left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height }}
          >
            <Menu.Root onExitComplete={handleExitComplete}>
              <Menu.Trigger asChild>
                <Button.Root
                  variant='ghost'
                  icon='ph--plus--regular'
                  iconOnly
                  label={t('feature-canvas.add-feature.label')}
                  classNames='pointer-events-auto size-24 opacity-40 hover:opacity-100 focus-visible:opacity-100'
                  iconClassNames='size-12'
                  data-testid='feature-canvas.add'
                />
              </Menu.Trigger>
              <Menu.Content>
                {onCreate && (
                  <Menu.Item
                    item={{ value: 'new', label: t('feature-map.new-feature.label'), icon: 'ph--plus--regular' }}
                    data-testid='feature-map.new-feature'
                    onClick={() => place(() => onCreate?.(position))}
                  />
                )}
                {onAdd && (
                  <Menu.Item
                    item={{ value: 'add', label: t('feature-map.add-feature.label'), icon: 'ph--list-plus--regular' }}
                    data-testid='feature-map.add-feature'
                    onClick={() => place(() => onAdd?.(position))}
                  />
                )}
              </Menu.Content>
            </Menu.Root>
          </div>
        );
      })}
    </>
  );
};

FeatureCanvasCells.displayName = 'FeatureCanvasCells';
