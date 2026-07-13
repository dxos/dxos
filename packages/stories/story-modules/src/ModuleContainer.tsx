//
// Copyright 2026 DXOS.org
//

import React, { type FC, type ReactNode, useEffect } from 'react';

import { Capabilities, type Role } from '@dxos/app-framework';
import { Surface, useCapability } from '@dxos/app-framework/ui';
import { AppSpace, Paths } from '@dxos/app-toolkit';
import { StorybookCapabilities } from '@dxos/plugin-testing';
import { type Space, useSpaces } from '@dxos/react-client/echo';
import { AttendableContainer } from '@dxos/react-ui-attention';
import { Loading } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

/**
 * A single grid cell: either a bare role token (role-only dispatch, no data) or a
 * `{ type, data }` spec for surfaces that require a subject (e.g. `AppSurface.Section`).
 */
export type ModuleSpec = Role.Role<any> | { type: Role.Role<any>; data?: Record<string, any>; id?: string };

/** 2D layout: outer array = columns, inner array = stacked rows within a column. */
export type ModuleLayout = ModuleSpec[][];

/**
 * Props every module surface receives from {@link ModuleContainer}: the active space and the cell's
 * attendable id (registered with the attention system by the container's `AttendableContainer`).
 */
export type ModuleProps = {
  space: Space;
  attendableId: string;
};

/**
 * Adapts a module component to a surface: reads the {@link ModuleProps} the container injects via the
 * surface `data`, gating on the space so module bodies never call hooks conditionally. Replaces the
 * per-storybook `withActiveSpace` wrapper — space + attendable id are now owned by the container.
 */
export const withModuleProps =
  (Component: FC<ModuleProps>) =>
  ({ data }: { data?: Partial<ModuleProps> }): ReactNode =>
    data?.space ? <Component space={data.space} attendableId={data.attendableId ?? ''} /> : null;

export type ModuleContainerProps = {
  layout: ModuleLayout;
  compact?: boolean;
};

const toCell = (spec: ModuleSpec): { type: Role.Role<any>; data?: Record<string, any>; id?: string } =>
  'type' in spec ? spec : { type: spec };

/** A stable, unique attendable id for a cell: its explicit `id`, else the role NSID + grid position
 * (two cells sharing a role would otherwise collapse into one attention target). */
const cellAttendableId = (spec: ModuleSpec, columnIndex: number, moduleIndex: number): string => {
  const cell = toCell(spec);
  return cell.id ?? `${cell.type.role}:${columnIndex}:${moduleIndex}`;
};

/**
 * Renders a columns×rows grid of app-framework surfaces from a {@link ModuleLayout}.
 *
 * Each cell resolves via `<Surface.Surface type={token} limit={1} />` and is wrapped in an
 * `AttendableContainer` so its attendable id participates in the attention system (focus makes it the
 * current attention — surfaces provide it via `withModuleProps`). The active workspace is set to the
 * first space so surfaces resolve — done from the React tree because the plugin-module activation
 * context resolves a different AtomRegistry than the UI reads. The active space and each cell's
 * attendable id are injected into every surface via `data` ({@link ModuleProps}).
 *
 * Storybook-agnostic: any storybook that contributes `Capabilities.ReactSurface` module surfaces can
 * drive its layout with this container. Provide `withAttention()` (from `@dxos/react-ui-attention/testing`)
 * in the story decorators to make attention actually track focus.
 */
export const ModuleContainer = ({ layout, compact = false }: ModuleContainerProps) => {
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
      className={mx('dx-container absolute inset-0 grid', !compact && 'gap-2 p-2')}
      style={{ gridTemplateColumns: `repeat(${layout.length}, minmax(0, 1fr))` }}
    >
      {layout.map((column, columnIndex) => (
        <div
          key={columnIndex}
          className={mx('dx-container grid', !compact && 'gap-2')}
          style={{ gridTemplateRows: `repeat(${column.length}, minmax(0, 1fr))` }}
        >
          {column.map((spec, moduleIndex) => {
            const { type, data } = toCell(spec);
            const attendableId = cellAttendableId(spec, columnIndex, moduleIndex);
            return (
              <AttendableContainer
                key={moduleIndex}
                id={attendableId}
                classNames={mx('border border-separator overflow-hidden', !compact && 'rounded-sm')}
              >
                <Surface.Surface type={type} data={{ ...data, space, attendableId }} limit={1} />
              </AttendableContainer>
            );
          })}
        </div>
      ))}
    </div>
  );
};
