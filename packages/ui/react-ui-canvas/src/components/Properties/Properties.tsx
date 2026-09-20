//
// Copyright 2026 DXOS.org
//

//
// Property panel for the selected element: a schema-driven form over the element's own Effect schema,
// so every field a type has is editable without a per-type form. Edits go through the projection as
// `update` intents; the panel never mutates the scene.
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useCallback } from 'react';

import { Field, type ThemedClassName } from '@dxos/react-ui';
import { Form, type FormFieldMap, type FormFieldRenderer } from '@dxos/react-ui-form';
import { mx } from '@dxos/ui-theme';

import { type SceneViewAtoms } from '../../model/atoms.ts';
import { type Projection } from '../../model/projection.ts';
import {
  ClassNode,
  CurveLink,
  type Element,
  EllipseNode,
  LineLink,
  PortalNode,
  RectNode,
  SplineLink,
  TextNode,
  getElement,
} from '../../model/types.ts';

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

const CLASS_FIELDS: FormFieldMap = { attributes: LinesField, methods: LinesField };

export type PropertiesProps = ThemedClassName<{
  projection: Projection;
  atoms: SceneViewAtoms;
}>;

export const Properties = ({ classNames, projection, atoms }: PropertiesProps) => {
  const scene = useAtomValue(projection.scene);
  const selection = useAtomValue(atoms.selection);
  const ids = [...selection];
  const element = ids.length === 1 ? getElement(scene, ids[0]) : undefined;
  const readonly = !projection.capabilities.update;

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
      ) : (
        <ElementForm key={element.id} element={element} readonly={readonly} onSave={onSave} />
      )}
    </div>
  );
};

type ElementFormProps = { element: Element; readonly: boolean; onSave: (values: Element) => void };

const fields = (
  <Form.Viewport>
    <Form.Content>
      <Form.Fields exclude={HIDDEN} />
    </Form.Content>
  </Form.Viewport>
);

/** One `Form.Root` per type: the schema and the values must agree, which a switch proves per branch. */
const ElementForm = ({ element, readonly, onSave }: ElementFormProps) => {
  const common = { readonly, autoSave: true, onSave };
  switch (element.type) {
    case 'rect':
      return (
        <Form.Root schema={RectNode} values={element} {...common}>
          {fields}
        </Form.Root>
      );
    case 'ellipse':
      return (
        <Form.Root schema={EllipseNode} values={element} {...common}>
          {fields}
        </Form.Root>
      );
    case 'class':
      return (
        <Form.Root schema={ClassNode} values={element} fieldMap={CLASS_FIELDS} {...common}>
          {fields}
        </Form.Root>
      );
    case 'text':
      return (
        <Form.Root schema={TextNode} values={element} {...common}>
          {fields}
        </Form.Root>
      );
    case 'scene':
      return (
        <Form.Root schema={PortalNode} values={element} {...common}>
          {fields}
        </Form.Root>
      );
    case 'line':
      return (
        <Form.Root schema={LineLink} values={element} {...common}>
          {fields}
        </Form.Root>
      );
    case 'curve':
      return (
        <Form.Root schema={CurveLink} values={element} {...common}>
          {fields}
        </Form.Root>
      );
    case 'spline':
      return (
        <Form.Root schema={SplineLink} values={element} {...common}>
          {fields}
        </Form.Root>
      );
  }
};
