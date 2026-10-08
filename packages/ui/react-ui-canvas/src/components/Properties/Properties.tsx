//
// Copyright 2026 DXOS.org
//

//
// Property panel for the selection: a schema-driven form over the properties every selected element
// declares alike (one element: its whole schema; a node's from its registry definition), so every field
// a type has is editable without a per-type form. Values the elements disagree on show as mixed; an edit
// writes only the changed fields, to every element, as one batch of `update` intents.
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import type * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import { type Database } from '@dxos/echo';
import {
  Form,
  type FormFieldMap,
  type FormFieldOverride,
  type FormFieldRenderer,
  type FormUpdateMeta,
  type RefFieldDataProps,
} from '@dxos/react-ui-form';
import * as Button from '@dxos/react-ui/Button';
import * as Input from '@dxos/react-ui/Input';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import { useRegistry } from '../../hooks/index.ts';
import { SCENE_OVERLAY_ATTRIBUTE } from '../../hooks/useWheel.ts';
import { type SceneViewAtoms } from '../../model/atoms.ts';
import { nodeDef } from '../../model/node-def.ts';
import { type Projection } from '../../model/projection.ts';
import { type NodeRegistry, defaultNodeRegistry } from '../../model/registry.ts';
import {
  BaseNode,
  CurveLink,
  type Element,
  LineLink,
  type LinkType,
  SmartLink,
  SplineLink,
  getElement,
  isLink,
  isPortalNode,
  showsContents,
} from '../../model/types.ts';
import { MAX_PORTS_PER_SIDE, portsPerSideOf } from '../../utils/ports.ts';
import { commonSchema, mergeValues, patchValues } from '../../utils/properties.ts';
import { flipLink } from '../../utils/shapes.ts';
import { resolveStyle } from '../../utils/style.ts';
import { LineHueField, StyleGridField } from './StyleGrid.tsx';

/** Identity, ordering, geometry lists and a scene shape's child-scene id are the surface's, not the user's. */
const HIDDEN = ['id', 'type', 'z', 'ports', 'points', 'source', 'target', 'scene'];

/**
 * A string list as one entry per line: a UML compartment reads as a block of text, so a textarea
 * beats the generic array field's row of inputs. Blank lines survive while typing (they round-trip
 * through split/join) and are dropped on blur, when the form saves.
 */
export const LinesField: FormFieldRenderer = ({ type, label, jsonPath, readonly, getValue, onValueChange, onBlur }) => {
  const lines: string[] = getValue() ?? [];
  return (
    <Form.Field path={jsonPath} label={label} readonly={readonly}>
      <Input.Textarea
        rows={4}
        classNames='font-mono'
        disabled={!!readonly}
        value={lines.join('\n')}
        onChange={(event) => onValueChange(type, event.target.value.split('\n'))}
        onBlur={(event) => {
          onValueChange(
            type,
            lines.map((line) => line.trim()).filter((line) => line.length > 0),
          );
          onBlur(event);
        }}
      />
    </Form.Field>
  );
};

/** Renderers by field path the panel always uses (the style grid); node types add their own (`NodeDef.fields`). */
export const DEFAULT_FIELDS: FormFieldMap = {
  'style.hue': StyleGridField,
  'line.hue': LineHueField,
};

const LINK_SCHEMAS: Record<LinkType, Schema.Codec<any, any>> = {
  line: LineLink,
  curve: CurveLink,
  spline: SplineLink,
  smart: SmartLink,
};

/** An element's own schema; a type the registry does not know gets the core base's (`BaseNode`, or a line). */
const schemaOf = (nodes: NodeRegistry, element: Element): Schema.Codec<any, any> =>
  isLink(element) ? (LINK_SCHEMAS[element.type] ?? LineLink) : (nodeDef(nodes, element)?.schema ?? BaseNode);

/**
 * What the form shows for an element: what the view draws, so an unset fill, border or Show contents reads as it
 * looks and an unset port count as the type's.
 */
const formValues = (nodes: NodeRegistry, element: Element): Record<string, unknown> =>
  isLink(element)
    ? element
    : {
        ...element,
        style: resolveStyle(element.style),
        portsPerSide: portsPerSideOf(nodes, element),
        ...(isPortalNode(element) ? { contents: showsContents(element) } : {}),
      };

/**
 * How the panel presents fields. Ranges are the editor's, not the model's: a check on the stored schema would
 * make a record outside them (an older or imported scene) fail validation and drop out of the scene. The style
 * grid at `style.hue` also sets `style.tone`, which has no field of its own.
 */
const FIELD_OVERRIDES: Record<string, FormFieldOverride> = {
  'style.hue': { label: 'Style' },
  'style.tone': { hidden: true },
  'style.fontSize': { min: 8, max: 80, step: 1 },
  'portsPerSide': { min: 1, max: MAX_PORTS_PER_SIDE, step: 1 },
};

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

/** The selection by kind, e.g. "3 nodes, 2 links". */
const describeSelection = (elements: readonly Element[]) => {
  const links = elements.filter(isLink).length;
  const nodes = elements.length - links;
  return [nodes > 0 && plural(nodes, 'node'), links > 0 && plural(links, 'link')].filter(Boolean).join(', ');
};

export type PropertiesProps = Util.ThemedClassName<{
  projection: Projection;
  atoms: SceneViewAtoms;
  nodes?: NodeRegistry;
  fields?: FormFieldMap;
  /** Show the fields without letting them change; also implied by a projection that cannot `update`. */
  readonly?: boolean;
  /** The database a reference field picks from; without it reference fields are read-only. */
  db?: Database.Database;
  /** Narrows a reference field's candidates (e.g. to objects of one kind). */
  getOptions?: RefFieldDataProps['getOptions'];
  /** A host's per-selection field overrides (e.g. a field it allows only in some states), over the panel's own. */
  overrides?: (elements: readonly Element[]) => Record<string, FormFieldOverride>;
}>;

export const Properties = ({
  classNames,
  projection,
  atoms,
  nodes = defaultNodeRegistry,
  fields,
  readonly: readonlyProp = false,
  db,
  getOptions,
  overrides,
}: PropertiesProps) => {
  const registry = useRegistry();
  const scene = useAtomValue(projection.scene);
  const selection = useAtomValue(atoms.selection);
  const elements = useMemo(() => [...selection].flatMap((id) => getElement(scene, id) ?? []), [scene, selection]);
  const readonly = readonlyProp || !projection.capabilities.update;

  // Keyed by the selected types, so the schema (and the form built on it) holds while values change under it.
  const typesKey = [...new Set(elements.map((element) => element.type))].sort().join();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const schema = useMemo(() => commonSchema(elements.map((element) => schemaOf(nodes, element))), [typesKey, nodes]);
  const { values, fieldOverrides } = useMemo(() => {
    const shown = elements.map((element) => formValues(nodes, element));
    const { values, mixed } = mergeValues(shown, Object.keys(shown[0] ?? {}));
    // A value the elements disagree on shows as indeterminate until it is edited, then applies to all of them.
    const fieldOverrides: Record<string, FormFieldOverride> = { ...FIELD_OVERRIDES, ...overrides?.(elements) };
    for (const path of mixed) {
      fieldOverrides[path] = { ...fieldOverrides[path], indeterminate: true };
    }
    return { values, fieldOverrides };
  }, [elements, nodes, overrides]);

  const onSave = useCallback(
    (values: Record<string, unknown>, { changed }: FormUpdateMeta<Record<string, unknown>>) => {
      const paths = Object.keys(changed).filter((path) => changed[path as keyof typeof changed]);
      projection.apply({
        kind: 'batch',
        intents: elements.map((element) => ({
          kind: 'update' as const,
          id: element.id,
          values: patchValues(formValues(nodes, element), values, paths),
        })),
      });
    },
    [projection, elements, nodes],
  );

  // Reverses every selected link (source and target swap; an arrow comes to point the other way), as one batch.
  const links = useMemo(() => elements.filter(isLink), [elements]);
  const onFlip = useCallback(() => {
    projection.apply({
      kind: 'batch',
      intents: links.map((link) => ({ kind: 'update' as const, id: link.id, values: flipLink(link) })),
    });
    // A spline's control points run the other way after a flip, so a selected point's index names another one.
    registry.set(atoms.point, undefined);
  }, [projection, links, registry, atoms.point]);

  // The selected node types' own renderers over the panel's; a host's `fields` win over both.
  const fieldMap = useMemo(
    () => ({
      ...DEFAULT_FIELDS,
      ...Object.assign(
        {},
        ...elements.map((element) => (isLink(element) ? {} : (nodeDef(nodes, element)?.fields ?? {}))),
      ),
      ...fields,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [typesKey, nodes, fields],
  );

  if (elements.length === 0) {
    return (
      <div
        className={mx('flex flex-col overflow-hidden', classNames)}
        data-testid='properties'
        {...{ [SCENE_OVERLAY_ATTRIBUTE]: true }}
      >
        <div className='p-2 text-sm text-fg-muted'>Select a node or link to edit its properties.</div>
      </div>
    );
  }

  const summary = elements.length > 1 && `${describeSelection(elements)}${schema ? '' : ' — no shared properties'}`;
  return (
    <div
      className={mx('flex flex-col overflow-hidden', classNames)}
      data-testid='properties'
      {...{ [SCENE_OVERLAY_ATTRIBUTE]: true }}
    >
      <Toolbar.Root data-testid='properties-toolbar'>
        {links.length > 0 && links.length === elements.length && (
          <Button.Root
            variant='ghost'
            iconOnly
            icon='ph--arrows-left-right--regular'
            label='Flip direction'
            disabled={readonly}
            data-testid='properties-flip'
            onClick={onFlip}
          />
        )}
      </Toolbar.Root>
      {schema ? (
        <Form.Root
          key={[...selection].join()}
          schema={schema}
          values={values}
          fieldOverrides={fieldOverrides}
          fieldMap={fieldMap}
          db={db}
          getOptions={getOptions}
          readonly={readonly}
          autoSave
          onSave={onSave}
        >
          {/* Scrolling: the panel is as tall as its host, and a long form (a class with many members) scrolls inside it. */}
          <Form.Viewport scroll>
            <Form.Content>
              <Form.Fields exclude={HIDDEN} />
              {summary && (
                <p className='text-sm text-fg-muted' data-testid='properties-summary'>
                  {summary}
                </p>
              )}
            </Form.Content>
          </Form.Viewport>
        </Form.Root>
      ) : (
        <p className='p-2 text-sm text-fg-muted' data-testid='properties-summary'>
          {summary}
        </p>
      )}
    </div>
  );
};
