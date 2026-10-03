//
// Copyright 2026 DXOS.org
//

//
// Property panel for the selected element: a schema-driven form over the element's own Effect schema
// (a node's from its registry definition), so every field a type has is editable without a per-type
// form. Edits go through the projection as `update` intents; the panel never mutates the scene.
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useCallback, useMemo } from 'react';

import { Field, type ThemedClassName } from '@dxos/react-ui';
import { Form, type FormFieldMap, type FormFieldRenderer } from '@dxos/react-ui-form';
import { mx } from '@dxos/ui-theme';

import { type SceneViewAtoms } from '../../model/atoms.ts';
import { type Projection } from '../../model/projection.ts';
import { type NodeRegistry, defaultNodeRegistry, nodeDef } from '../../model/registry.ts';
import {
  CurveLink,
  DEFAULT_GRID,
  type Element,
  LineLink,
  type Link,
  type Node,
  NodeBase,
  SplineLink,
  getElement,
  isLink,
} from '../../model/types.ts';
import { createGeometryField } from './GeometryField.tsx';

/** Identity, ordering and geometry lists are the surface's, not the user's. */
const HIDDEN = ['id', 'type', 'z', 'ports', 'points', 'source', 'target'];

/**
 * A string list as one entry per line: a UML compartment reads as a block of text, so a textarea
 * beats the generic array field's row of inputs. Blank lines survive while typing (they round-trip
 * through split/join) and are dropped on blur, when the form saves.
 */
const LinesField: FormFieldRenderer = ({ type, label, jsonPath, readonly, getValue, onValueChange, onBlur }) => {
  const lines: string[] = getValue() ?? [];
  return (
    <Form.Field path={jsonPath} label={label} readonly={readonly}>
      <Field.Textarea
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

/** Renderers by field name for the built-in types' list fields; a host may pass its own. */
export const DEFAULT_FIELDS: FormFieldMap = { attributes: LinesField, methods: LinesField };

export type PropertiesProps = ThemedClassName<{
  projection: Projection;
  atoms: SceneViewAtoms;
  nodes?: NodeRegistry;
  fields?: FormFieldMap;
  /** Minor grid spacing the geometry cells step and snap by; the view's own. */
  grid?: number;
  /** Show the fields without letting them change; also implied by a projection that cannot `update`. */
  readonly?: boolean;
}>;

export const Properties = ({
  classNames,
  projection,
  atoms,
  nodes = defaultNodeRegistry,
  fields = DEFAULT_FIELDS,
  grid = DEFAULT_GRID,
  readonly: readonlyProp = false,
}: PropertiesProps) => {
  const scene = useAtomValue(projection.scene);
  const selection = useAtomValue(atoms.selection);
  const snap = useAtomValue(atoms.snap);
  const ids = [...selection];
  const element = ids.length === 1 ? getElement(scene, ids[0]) : undefined;
  const readonly = readonlyProp || !projection.capabilities.update;

  // The geometry cells answer to the view's own grid and snap toggle, so typing a number leaves the
  // node exactly as snapped as dragging it would.
  const fieldMap = useMemo<FormFieldMap>(() => {
    const geometry = createGeometryField({ grid, snap });
    return { center: geometry, size: geometry, ...fields };
  }, [grid, snap, fields]);

  const onSave = useCallback(
    (values: Element) => {
      if (element) {
        projection.apply({ kind: 'update', id: element.id, values });
      }
    },
    [projection, element],
  );

  return (
    <div className={mx('flex flex-col overflow-hidden', classNames)} data-testid='properties'>
      {!element ? (
        <div className='p-2 text-sm text-description'>
          {ids.length === 0 ? 'Select a node or link to edit its properties.' : `${ids.length} elements selected.`}
        </div>
      ) : isLink(element) ? (
        <LinkForm key={element.id} link={element} readonly={readonly} onSave={onSave} />
      ) : (
        <NodeForm key={element.id} node={element} nodes={nodes} fields={fieldMap} readonly={readonly} onSave={onSave} />
      )}
    </div>
  );
};

type FormProps = { readonly: boolean; onSave: (values: Element) => void };

// Scrolling: the panel is as tall as its host, and a long form (a class with many members) scrolls inside it.
const formFields = (
  <Form.Viewport scroll>
    <Form.Content>
      <Form.Fields exclude={HIDDEN} />
    </Form.Content>
  </Form.Viewport>
);

/** A node's form over its type's schema; a type the registry does not know gets the shared fields. */
const NodeForm = ({
  node,
  nodes,
  fields,
  readonly,
  onSave,
}: FormProps & { node: Node; nodes: NodeRegistry; fields: FormFieldMap }) => (
  <Form.Root
    schema={nodeDef(nodes, node)?.schema ?? NodeBase}
    values={node}
    fieldMap={fields}
    readonly={readonly}
    autoSave
    onSave={onSave}
  >
    {formFields}
  </Form.Root>
);

/** One `Form.Root` per link type: the schema and the values must agree, which a switch proves per branch. */
const LinkForm = ({ link, readonly, onSave }: FormProps & { link: Link }) => {
  const common = { readonly, autoSave: true, onSave };
  switch (link.type) {
    case 'line':
      return (
        <Form.Root schema={LineLink} values={link} {...common}>
          {formFields}
        </Form.Root>
      );
    case 'curve':
      return (
        <Form.Root schema={CurveLink} values={link} {...common}>
          {formFields}
        </Form.Root>
      );
    case 'spline':
      return (
        <Form.Root schema={SplineLink} values={link} {...common}>
          {formFields}
        </Form.Root>
      );
  }
};
