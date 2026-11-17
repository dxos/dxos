//
// Copyright 2026 DXOS.org
//

import React, { createContext, useContext } from 'react';

import { Form, type FormFieldRenderer, useFormFieldState } from '@dxos/react-ui-form';
import * as Input from '@dxos/react-ui/Input';
import { InstanceNode, type Node } from '@dxos/scene';

/**
 * The parts of a composite Object a tool declares optional: a card's glyph, body and footer. A switch each, turning
 * that part off for the selected Instance alone — its sibling Instances keep theirs, which is what makes a card with
 * no footer the same Object rather than a second definition. The part that names a hidden one in `grow` takes its
 * room, so turning the footer off grows the body rather than leaving a gap.
 */
export const OptionalPartsContext = createContext<readonly Node[]>([]);

/**
 * A part reads by its id: the template author names the parts (`icon`, `body`, `footer`) and that name is what the
 * switch is for. Its text is the card's own and changes under the user, so it would make the switch move about.
 */
const partName = (part: Node): string => part.id.charAt(0).toUpperCase() + part.id.slice(1);

/** The Instance's overrides as a record of part id to the fields it overrides. */
const overridesOf = (value: unknown): Record<string, Record<string, unknown>> => {
  if (typeof value !== 'object' || value === null) {
    return {};
  }
  const result: Record<string, Record<string, unknown>> = {};
  for (const [id, entry] of Object.entries(value)) {
    if (typeof entry === 'object' && entry !== null) {
      result[id] = { ...entry };
    }
  }
  return result;
};

export const PartsField: FormFieldRenderer = ({ jsonPath, readonly }) => {
  const parts = useContext(OptionalPartsContext);
  const field = useFormFieldState('PartsField', (jsonPath ?? 'overrides').split('.'));
  if (parts.length === 0) {
    return null;
  }
  const overrides = overridesOf(field.getValue());
  const toggle = (part: Node, shown: boolean) => {
    const { [part.id]: current = {}, ...rest } = overrides;
    const { hidden: _, ...kept } = current;
    // An override of nothing is dropped, so an Instance that hides no part carries no record of one.
    const next = shown ? kept : { ...kept, hidden: true };
    const merged = { ...rest, ...(Object.keys(next).length > 0 ? { [part.id]: next } : {}) };
    field.onValueChange(InstanceNode.fields.overrides.ast, merged);
    field.onBlur();
  };
  return (
    <>
      {parts.map((part) => (
        <Form.Field key={part.id} path={`${jsonPath}.${part.id}`} label={partName(part)} readonly={readonly}>
          <Input.Switch
            checked={overrides[part.id]?.hidden !== true}
            disabled={!!readonly}
            onCheckedChange={({ checked }) => toggle(part, checked === true)}
          />
        </Form.Field>
      ))}
    </>
  );
};
