//
// Copyright 2026 DXOS.org
//

import React, { type FC, useEffect, useState } from 'react';

import { Capabilities, type Role } from '@dxos/app-framework';
import { Surface, useCapability } from '@dxos/app-framework/ui';
import { AppSpace, NotFound, Paths } from '@dxos/app-toolkit';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { StorybookCapabilities } from '@dxos/plugin-testing';
import { type Space, useSpaces } from '@dxos/react-client/echo';
import { AttendableContainer } from '@dxos/react-ui-attention';
import { Loading } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

/** Props a resolved object cell's override component receives. */
export type ResolvedCellProps = {
  space: Space;
  object: Obj.Unknown;
  attendableId: string;
};

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

export type ModuleContainerProps = {
  layout: ModuleLayout;
  compact?: boolean;
};

type NormalizedSurfaceCell = {
  kind: 'surface';
  type: Role.Role<any>;
  id: string;
  data?: Record<string, any>;
};

type NormalizedObjectCell = {
  kind: 'object';
  object: Obj.Unknown;
  type: Role.Role<any>;
  id: string;
  data: Record<string, any>;
  component?: FC<ResolvedCellProps>;
  attendableId: string;
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
      id: attendableId,
      data: spec.data ?? {},
      component: spec.component,
      attendableId,
    };
  }

  if (typeof spec === 'object' && 'type' in spec) {
    return {
      kind: 'surface',
      type: spec.type,
      id: spec.id ?? `${spec.type.role}:${position}`,
      data: spec.data,
    };
  }

  return {
    kind: 'surface',
    type: spec,
    id: `${spec.role}:${position}`,
  };
};

/** Grace period before a still-unmatched binding is reported as a mistake, so surfaces registered
 * during plugin activation after first paint are not misreported. */
const BINDING_SETTLE_DELAY = 500;

/** Describes a value compactly without stringifying large/circular objects (e.g. a `Space`). */
const describeBinding = (value: unknown): string => {
  if (Obj.isObject(value)) {
    return `${Obj.getTypename(value) ?? 'Object'}(${value.id})`;
  }
  if (value === null || value === undefined || typeof value === 'string' || typeof value === 'number') {
    return JSON.stringify(value) ?? String(value);
  }
  if (typeof value === 'object') {
    return `[${value.constructor?.name ?? 'object'}]`;
  }
  return String(value);
};

/**
 * Rendered in place of a surface cell whose binding matched no registered surface — surfaces the
 * dispatch role and data so a story author can spot a wrong companion variant, an unloaded plugin,
 * or an unregistered subject type instead of staring at a blank cell.
 */
const BindingDebug = ({ role, data }: { role: string; data: Record<string, any> }) => (
  <div className='grid place-items-center p-2 text-xs text-warning'>
    <div className='grid gap-1 rounded-sm border border-dashed border-separator p-2 font-mono'>
      <div className='font-medium'>⚠ No surface matched this binding</div>
      <div>role: {role}</div>
      {Object.entries(data).map(([key, value]) => (
        <div key={key}>
          {key}: {describeBinding(value)}
        </div>
      ))}
    </div>
  </div>
);

/**
 * Dispatches a surface for a cell, falling back to {@link BindingDebug} once no registered surface
 * matches the binding (after {@link BINDING_SETTLE_DELAY} to tolerate late surface registration).
 */
const SurfaceCell = ({ type, data }: { type: Role.Role<any>; data: Record<string, any> }) => {
  const isAvailable = Surface.useIsAvailable();
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(true), BINDING_SETTLE_DELAY);
    return () => clearTimeout(timer);
  }, []);

  if (settled && !isAvailable({ type, data })) {
    return <BindingDebug role={type.role} data={data} />;
  }

  return <Surface.Surface type={type} data={data} limit={1} />;
};

/**
 * Renders a columns×rows grid of app-framework surfaces from a {@link ModuleLayout}.
 *
 * Each cell resolves via `<Surface.Surface type={token} limit={1} />` and is wrapped in an
 * `AttendableContainer` so its attendable id participates in the attention system. The active
 * workspace is set to the first space so module surfaces resolve it via `useActiveSpace()` — done
 * from the React tree because the plugin-module activation context resolves a different AtomRegistry
 * than the UI reads. Each cell's attendable id is injected into its surface `data`.
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

  // Materialize object-cell app-graph nodes so object-scoped toolbar/graph actions resolve —
  // the work the deck's navtree normally does on navigation.
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
                {cell.kind === 'object' && cell.component ? (
                  <cell.component space={space} object={cell.object} attendableId={cell.attendableId} />
                ) : (
                  <SurfaceCell
                    type={cell.type}
                    data={
                      cell.kind === 'object'
                        ? { subject: cell.object, attendableId: cell.attendableId, ...cell.data }
                        : { ...cell.data, attendableId: cell.id }
                    }
                  />
                )}
              </AttendableContainer>
            );
          })}
        </div>
      ))}
    </div>
  );
};
