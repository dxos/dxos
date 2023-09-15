//
// Copyright 2023 DXOS.org
//

import React, { FC, useMemo, useState } from 'react';

import { SpacePluginProvides } from '@braneframe/plugin-space';
import { Schema as SchemaType, Table as TableType } from '@braneframe/types';
import { DensityProvider, Main } from '@dxos/aurora';
import {
  createColumns,
  createActionColumn,
  Table,
  TableSchemaProp,
  TableSchema,
  SelectQueryModel,
} from '@dxos/aurora-table';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/aurora-theme';
import { Expando, EchoDatabase, TypedObject } from '@dxos/client/echo';
import { useQuery } from '@dxos/react-client/echo';
import { findPlugin, usePlugins } from '@dxos/react-surface';

const EMPTY_ROW_ID = '__new';

const getPropType = (type?: SchemaType.PropType): TableSchemaProp['type'] => {
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

const getSchemaType = (type?: TableSchemaProp['type']): SchemaType.PropType => {
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

// TODO(burdon): Factor out.
class QueryModel implements SelectQueryModel<TypedObject> {
  constructor(
    private readonly _db: EchoDatabase,
    private readonly _schema: string,
    private readonly _prop: string,
  ) {}

  getId(object: TypedObject) {
    return object.id;
  }

  getText(object: TypedObject) {
    return object[this._prop];
  }

  async query(text?: string) {
    const { objects = [] } = this._db.query((object) => {
      if (!text?.length) {
        return null;
      }

      if (object.meta?.schema?.id !== this._schema) {
        return false;
      }

      const label = this.getText(object);
      if (!label || !label.toLowerCase().includes(text.toLowerCase())) {
        return false;
      }

      return true;
    });

    return objects;
  }
}

const schemaPropMapper =
  (table: TableType) =>
  ({ id, type, label, digits, ref, refProp }: SchemaType.Prop): TableSchemaProp => ({
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
    (object) => object.meta?.schema?.id === table.schema.id,
    {}, // TODO(burdon): Toggle deleted.
    [table.schema],
  );

  const rows = [...objects, {} as any];

  const columns = useMemo(() => {
    if (!tables.length) {
      return [];
    }

    // TODO(burdon): Map other tables.
    const schemasDefs: TableSchema[] = tables.map((table) => ({
      id: table.schema.id,
      name: table.schema.typename ?? table.title,
      props: table.schema.props.map(schemaPropMapper(table)),
    }));

    const schemaDef = schemasDefs.find((def) => def.id === table.schema?.id);
    if (!schemaDef) {
      return [];
    }

    const columns = createColumns<TypedObject>(schemasDefs, schemaDef, {
      modelFactory: (type: string, prop: string) => new QueryModel(space!.db, type, prop),
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
        console.log(object, prop, value);
        object[prop] = value;
        if (!object.id) {
          // TODO(burdon): Add directly.
          const obj = new Expando(object);
          obj.meta.schema = table.schema;
          // TODO(burdon): Silent exception if try to add plain object directly.
          space!.db.add(obj);
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
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <DensityProvider density='fine'>
        <div className='flex grow m-4 overflow-hidden'>
          <Table<TypedObject>
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
