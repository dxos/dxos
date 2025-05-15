//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
import { isTypeLiteral, TypeLiteral } from 'effect/SchemaAST';
import React, { useMemo } from 'react';

import { parseCellIndex, useGridContext } from '@dxos/react-ui-grid';
import { getSchemaProperties, type FieldProjection } from '@dxos/schema';

import { type TableModel } from '../../model';
import { Form } from '@dxos/react-ui-form';
import { invariant } from '@dxos/invariant';
import { getSnapshot } from '@dxos/echo-schema';

type FormCellEditorProps = {
  fieldProjection: FieldProjection;
  model?: TableModel;
  schema?: Schema.Schema.AnyNoContext;
  __gridScope: any;
};

export const FormCellEditor = ({ fieldProjection, model, schema, __gridScope }: FormCellEditorProps) => {
  const { editing, editBox } = useGridContext('ArrayEditor', __gridScope);

  const narrowSchema = useMemo(() => {
    const ast = (schema as any)?.ast;
    if (isTypeLiteral(ast)) {
      const propertySignature = ast.propertySignatures.find(
        (signature) => signature.name === fieldProjection.field.path,
      );
      if (propertySignature) {
        const narrowType = new TypeLiteral([propertySignature], []);
        return Schema.make(narrowType);
      }
    }
  }, [JSON.stringify(schema), fieldProjection.field.path]);

  const rowValue = useMemo(() => {
    if (model && editing) {
      const cell = parseCellIndex(editing.index);
      const row = model.getRowAt(cell.row);
      invariant(row);
      return getSnapshot(row);
    }

    return {};
  }, [model, editing]);

  return (
    <div
      className='absolute z-[1] '
      style={{
        ...editBox,
        ...{ '--dx-gridCellWidth': `${editBox?.inlineSize ?? 200}px` },
      }}
    >
      <div
        ref={(el) => editing && el?.focus()}
        tabIndex={-1}
        className='dx-focus-ring bg-baseSurface rounded-sm border border-separator'
      >
        <Form values={rowValue} schema={narrowSchema as any} />
      </div>
    </div>
  );
};
