//
// Copyright 2026 DXOS.org
//

import React, { useEffect } from 'react';

import { Capabilities, type Role } from '@dxos/app-framework';
import { Surface, useCapability } from '@dxos/app-framework/ui';
import { AppSpace, Paths } from '@dxos/app-toolkit';
import { StorybookCapabilities } from '@dxos/plugin-testing';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading } from '@dxos/react-ui/testing';

/**
 * A single grid cell: either a bare role token (role-only dispatch, no data) or a
 * `{ type, data }` spec for surfaces that require a subject (e.g. `AppSurface.Section`).
 */
export type ModuleSpec = Role.Role<any> | { type: Role.Role<any>; data?: Record<string, any>; id?: string };

/** 2D layout: outer array = columns, inner array = stacked rows within a column. */
export type ModuleLayout = ModuleSpec[][];

export type ModuleContainerProps = {
  layout: ModuleLayout;
};

const toCell = (spec: ModuleSpec): { type: Role.Role<any>; data?: Record<string, any> } =>
  'type' in spec ? spec : { type: spec };

/**
 * Renders a columns×rows grid of app-framework surfaces from a {@link ModuleLayout}.
 *
 * Each cell resolves via `<Surface.Surface type={token} limit={1} />`, so contributed surfaces
 * source their own data (e.g. via `useActiveSpace()`). The active workspace is set to the first
 * space so those surfaces resolve — done from the React tree because the plugin-module activation
 * context resolves a different AtomRegistry than the UI reads.
 *
 * Storybook-agnostic: any storybook that contributes `Capabilities.ReactSurface` module surfaces
 * can drive its layout with this container.
 */
export const ModuleContainer = ({ layout }: ModuleContainerProps) => {
  const atomRegistry = useCapability(Capabilities.AtomRegistry);
  const layoutState = useCapability(StorybookCapabilities.LayoutState);
  const [space] = useSpaces();

  useEffect(() => {
    if (space && AppSpace.getActiveSpaceId(atomRegistry.get(layoutState).workspace) !== space.id) {
      atomRegistry.set(layoutState, { ...atomRegistry.get(layoutState), workspace: Paths.getSpacePath(space.id) });
    }
  }, [space, layoutState, atomRegistry]);

  if (!space) {
    return <Loading data={{ space: !!space }} />;
  }

  return (
    <div
      className='dx-container absolute inset-0 grid gap-2 p-2'
      style={{ gridTemplateColumns: `repeat(${layout.length}, minmax(0, 1fr))` }}
    >
      {layout.map((column, columnIndex) => (
        <div
          key={columnIndex}
          className='dx-container grid gap-2'
          style={{ gridTemplateRows: `repeat(${column.length}, minmax(0, 1fr))` }}
        >
          {column.map((spec, moduleIndex) => {
            const { type, data } = toCell(spec);
            return (
              <div key={moduleIndex} className='border border-separator rounded-md overflow-hidden'>
                <Surface.Surface type={type} data={data} limit={1} />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
