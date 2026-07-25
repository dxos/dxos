//
// Copyright 2026 DXOS.org
//

import React, { type FC, type ReactNode, useEffect } from 'react';

import { Capabilities, type Role } from '@dxos/app-framework';
import { Surface, useCapability } from '@dxos/app-framework/ui';
import { AppSpace, NotFound, Paths } from '@dxos/app-toolkit';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { type Obj } from '@dxos/echo';
import { StorybookCapabilities } from '@dxos/plugin-testing';
import { type Space, useSpaces } from '@dxos/react-client/echo';
import { AttendableContainer } from '@dxos/react-ui-attention';
import { Loading } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

/** Props a resolved object cell's override component receives. */
export type ResolvedCellProps = { space: Space; object: Obj.Unknown; attendableId: string };

/** Object-bound cell: renders the real plugin surface for `object` (or `component`, if given). */
export type ObjectCellSpec = {
  object: Obj.Unknown;
  /** Role token to dispatch (defaults to `AppSurface.Article`). */
  token?: Role.Role<any>;
  /** Extra surface data merged with `{ subject, attendableId }` (e.g. `companionTo`, `variant`). */
  data?: Record<string, any>;
  /** Story override: render this instead of dispatching the plugin surface. */
  component?: FC<ResolvedCellProps>;
  /** Attendable id override (defaults to the object's collections path). */
  id?: string;
};

/** A single grid cell. */
export type ModuleSpec =
  | Role.Role<any>
  | { type: Role.Role<any>; data?: Record<string, any>; id?: string }
  | ObjectCellSpec;

/** 2D layout: outer array = columns, inner array = stacked rows within a column. */
export type ModuleLayout = ModuleSpec[][];

/**
 * Props every module surface receives from {@link ModuleContainer}: the active space and the cell's
 * attendable id (registered with the attention system by the container's `AttendableContainer`).
 */
export type ModuleProps = {
  /** Active space. */
  space: Space;
  /** Active component. */
  attendableId?: string;
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

type NormalizedSurfaceCell = { kind: 'surface'; type: Role.Role<any>; data?: Record<string, any>; id: string };
type NormalizedObjectCell = {
  kind: 'object';
  object: Obj.Unknown;
  type: Role.Role<any>;
  data: Record<string, any>;
  component?: FC<ResolvedCellProps>;
  attendableId: string;
  id: string;
};
type NormalizedCell = NormalizedSurfaceCell | NormalizedObjectCell;

// Structural discriminant: an object cell is the only `ModuleSpec` form carrying an `object` key
// (a bare `Role` token or `{ type, data }` surface cell has none).
const isObjectCell = (spec: ModuleSpec): spec is ObjectCellSpec =>
  typeof spec === 'object' && spec !== null && 'object' in spec;

/**
 * Normalizes a `ModuleSpec` cell to a discriminated shape the container renders. Object cells derive
 * their attendable id from the object's space-scoped collections path (the id the app-graph and
 * attention system key object-scoped actions on), unless overridden.
 */
export const normalizeCell = (spec: ModuleSpec, spaceId: string, position = ''): NormalizedCell => {
  if (isObjectCell(spec)) {
    const attendableId = spec.id ?? Paths.getCollectionsPath(spaceId, spec.object.id);
    return {
      kind: 'object',
      object: spec.object,
      type: spec.token ?? AppSurface.Article,
      data: spec.data ?? {},
      component: spec.component,
      attendableId,
      id: attendableId,
    };
  }
  if (typeof spec === 'object' && 'type' in spec) {
    return { kind: 'surface', type: spec.type, data: spec.data, id: spec.id ?? `${spec.type.role}:${position}` };
  }
  return { kind: 'surface', type: spec, id: `${spec.role}:${position}` };
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
  const { graph } = useAppGraph();
  const [space] = useSpaces();

  useEffect(() => {
    if (space && AppSpace.getActiveSpaceId(atomRegistry.get(layoutState).workspace) !== space.id) {
      atomRegistry.set(layoutState, { ...atomRegistry.get(layoutState), workspace: Paths.getSpacePath(space.id) });
    }
  }, [space, layoutState, atomRegistry]);

  // Materialize object-cell app-graph nodes so object-scoped toolbar/graph actions resolve — the
  // work the deck's navtree normally does on navigation.
  const objectPaths = space
    ? layout
        .flat()
        .map((spec) => normalizeCell(spec, space.id))
        .flatMap((cell) => (cell.kind === 'object' ? [cell.attendableId] : []))
    : [];
  useEffect(() => {
    for (const path of objectPaths) {
      NotFound.expandPath(graph, path);
    }
  }, [graph, JSON.stringify(objectPaths)]);

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
            const cell = normalizeCell(spec, space.id, `${columnIndex}:${moduleIndex}`);
            return (
              <AttendableContainer
                key={moduleIndex}
                id={cell.id}
                classNames={mx('border border-separator overflow-hidden', !compact && 'rounded-sm')}
              >
                {cell.kind === 'object' ? (
                  cell.component ? (
                    <cell.component space={space} object={cell.object} attendableId={cell.attendableId} />
                  ) : (
                    <Surface.Surface
                      type={cell.type}
                      data={{ subject: cell.object, attendableId: cell.attendableId, ...cell.data }}
                      limit={1}
                    />
                  )
                ) : (
                  <Surface.Surface type={cell.type} data={{ ...cell.data, space, attendableId: cell.id }} limit={1} />
                )}
              </AttendableContainer>
            );
          })}
        </div>
      ))}
    </div>
  );
};
