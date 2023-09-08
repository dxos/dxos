//
// Copyright 2023 DXOS.org
//

import React, { FC, useMemo, useState } from 'react';

import { SpacePluginProvides } from '@braneframe/plugin-space';
import { Schema as SchemaType, Table as TableType } from '@braneframe/types';
import { DensityProvider, Main } from '@dxos/aurora';
import { Grid, createColumns, GridSchemaProp, createActionColumn, GridSchema, SelectValue } from '@dxos/aurora-grid';
import { coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/aurora-theme';
import { Expando, TypedObject } from '@dxos/client/echo';
import { useQuery } from '@dxos/react-client/echo';
import { findPlugin, usePlugins } from '@dxos/react-surface';

const EMPTY_ROW_ID = '__new';

const getPropType = (type?: SchemaType.PropType): GridSchemaProp['type'] => {
  switch (type) {
    case SchemaType.PropType.REF:
      return 'ref';
    case SchemaType.PropType.BOOLEAN:
      return 'boolean';
    case SchemaType.PropType.NUMBER:
      return 'number';
    case SchemaType.PropType.DATE:
      return 'date';
    case SchemaType.PropType.STRING:
    default:
      return 'string';
  }
};

const getSchemaType = (type?: GridSchemaProp['type']): SchemaType.PropType => {
  switch (type) {
    case 'ref':
      return SchemaType.PropType.REF;
    case 'boolean':
      return SchemaType.PropType.BOOLEAN;
    case 'number':
      return SchemaType.PropType.NUMBER;
    case 'date':
      return SchemaType.PropType.DATE;
    case 'string':
    default:
      return SchemaType.PropType.STRING;
  }
};

const schemaPropMapper =
  (table: TableType) =>
  ({ id, type, label, digits, ref, refProp }: SchemaType.Prop): GridSchemaProp => ({
    id: id!,
    type: getPropType(type),
    label,
    digits,
    ref: ref?.id,
    refProp,
    size: table.props?.find((prop) => prop.id === id)?.size,
    editable: true,
    resizable: true,
  });

export const TableMain: FC<{ data: TableType }> = ({ data: table }) => {
  const { plugins } = usePlugins();
  const [, forceUpdate] = useState({});
  const spacePlugin = findPlugin<SpacePluginProvides>(plugins, 'dxos.org/plugin/space');
  const space = spacePlugin?.provides?.space.active;
  // TODO(burdon): Not updated when object deleted.
  const tables = useQuery<TableType>(space, TableType.filter());
  const objects = useQuery<TypedObject>(
    space,
    // TODO(burdon): System meta property.
    (object) => object.__meta?.schema?.id === table.schema.id,
    {}, // TODO(burdon): Toggle deleted.
    [table.schema],
  );

  const rows = [...objects, {} as any];

  const columns = useMemo(() => {
    if (!tables.length) {
      return [];
    }

    // TODO(burdon): Map other tables.
    const schemasDefs: GridSchema[] = tables.map((table) => ({
      id: table.schema.id,
      name: table.schema.typename ?? table.title,
      props: table.schema.props.map(schemaPropMapper(table)),
    }));

    const schemaDef = schemasDefs.find((def) => def.id === table.schema?.id);
    if (!schemaDef) {
      return [];
    }

    const columns = createColumns<TypedObject>(schemasDefs, schemaDef, {
      getRefValue: ({ refProp }, object) => (object ? (object as Expando)[refProp!] : undefined),
      getRefValues: async ({ ref, refProp }, text: string) => {
        if (!ref || !refProp) {
          return [];
        }

        // TODO(burdon): Filter by text.
        const { objects } = space!.db.query((object) => object.__meta?.schema?.id === ref);
        return objects
          .map((object) => {
            const label = (object as Expando)[refProp];
            if (!label || !label.toLowerCase().includes(text.toLowerCase())) {
              return undefined;
            }

            return { id: object.id, value: object, label };
          })
          .filter(Boolean) as SelectValue[];
      },
      onColumnUpdate: (id, column) => {
        const idx = table.schema?.props.findIndex((prop) => prop.id === id);
        if (idx !== -1) {
          const { id, type, label, digits, ref, refProp } = column;
          table.schema?.props.splice(idx, 1, {
            id,
            type: getSchemaType(type),
            label,
            digits,
            ref: type === 'ref' ? tables.find((table) => table.schema.id === ref)?.schema : undefined,
            refProp,
          });
          forceUpdate({}); // TODO(burdon): Fix refresh.
        }
      },
      onColumnDelete: (id) => {
        const idx = table.schema?.props.findIndex((prop) => prop.id === id);
        if (idx !== -1) {
          table.schema?.props.splice(idx, 1);
          forceUpdate({}); // TODO(burdon): Fix refresh.
        }
      },
      onUpdate: (object, prop, value) => {
        object[prop] = value;
        if (!object.id) {
          // TODO(burdon): Silent invariant error if adding object directly (i.e., not Expando).
          space!.db.add(new Expando(Object.assign(object, { __meta: { schema: table.schema } })));
        }
      },
    });

    const actionColumn = createActionColumn<TypedObject>(schemaDef, {
      isDeletable: (row) => !!row.id,
      onColumnCreate: ({ id, type, label, digits }) => {
        table.schema?.props.push({ id, type: getSchemaType(type), label, digits });
        forceUpdate({}); // TODO(burdon): Fix refresh.
      },
      onRowDelete: (object) => {
        // TODO(burdon): Rename delete.
        space!.db.remove(object);
      },
    });

    return [...columns, actionColumn];
  }, [space, tables, JSON.stringify(table), JSON.stringify(table.schema)]); // TODO(burdon): Impl. echo useMemo-like hook.

  const handleColumnResize = (state: Record<string, number>) => {
    Object.entries(state).forEach(([id, size]) => {
      const idx = table.props?.findIndex((prop) => prop.id === id);
      if (idx !== -1) {
        table.props[idx] = { id, size };
      } else {
        (table.props ??= []).push({ id, size });
      }
    });
  };

  return (
    <Main.Content classNames={[fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <DensityProvider density='fine'>
        <div className='flex grow -ml-[1px] -mt-[1px] overflow-hidden'>
          <Grid<TypedObject>
            keyAccessor={(row) => row.id ?? EMPTY_ROW_ID}
            columns={columns}
            data={rows}
            onColumnResize={handleColumnResize}
            border
          />
        </div>
      </DensityProvider>
    </Main.Content>
  );
};
