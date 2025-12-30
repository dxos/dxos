//
// Copyright 2020 DXOS.org
//

import * as Option from 'effect/Option';
import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { DXN, Entity, Format, Type } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { Toolbar } from '@dxos/react-ui';
import { DynamicTable, type TableFeatures } from '@dxos/react-ui-table';
import { mx } from '@dxos/ui-theme';

import { ObjectViewer, PanelContainer, Placeholder, Searchbar } from '../../../components';
import { DataSpaceSelector } from '../../../containers';
import { useDevtoolsState } from '../../../hooks';

const textFilter = (text?: string) => {
  if (!text) {
    return () => true;
  }

  // TODO(burdon): Structured query (e.g., "type:Text").
  const matcher = new RegExp(text, 'i');
  return (item: Schema.Schema.AnyNoContext) => {
    let match = false;
    match ||= !!Type.getDXN(item)?.toString().match(matcher);
    match ||= !!SchemaAST.getTitleAnnotation(item.ast).pipe(Option.getOrUndefined)?.match(matcher);
    match ||= !!SchemaAST.getDescriptionAnnotation(item.ast).pipe(Option.getOrUndefined)?.match(matcher);
    return match;
  };
};

const useSchemaQuery = (space?: Space): Schema.Schema.AnyNoContext[] => {
  const [schema, setSchema] = useState<Schema.Schema.AnyNoContext[]>([]);
  useEffect(() => {
    if (!space) {
      return;
    }

    return space.db.schemaRegistry.query().subscribe(
      (query) => {
        setSchema([...space.internal.db.graph.schemaRegistry.schemas, ...query.results]);
      },
      { fire: true },
    );
  }, [space]);

  return schema;
};

export const SchemaPanel = (props: { space?: Space }) => {
  const state = useDevtoolsState();
  const space = props.space ?? state.space;

  const schema = useSchemaQuery(space);
  const [filter, setFilter] = useState('');
  // NOTE: Always call setSelected with a function: setSelected(() => item) because schema is a class constructor.
  const [selected, setSelected] = useState<Schema.Schema.AnyNoContext>();

  const onNavigate = (dxn: DXN) => {
    const selectedSchema = schema.find((item) => Type.getDXN(item) && DXN.equals(Type.getDXN(item)!, dxn));
    if (selectedSchema) {
      setSelected(() => selectedSchema);
      return;
    }

    const typeDXN = dxn.asTypeDXN();
    if (typeDXN && typeDXN.version === undefined) {
      const latestSchema = schema.find((item) => Type.getDXN(item)?.toString().startsWith(dxn.toString()));
      if (latestSchema) {
        setSelected(() => latestSchema);
      }
    }
  };

  const itemSelect = (item: Schema.Schema.AnyNoContext) => {
    setSelected(() => item);
  };

  const dataProperties = useMemo(
    () => [
      { name: 'typename', format: Format.TypeFormat.String },
      { name: 'version', format: Format.TypeFormat.String, size: 100 },
      {
        name: 'kind',
        format: Format.TypeFormat.SingleSelect,
        size: 100,
        config: {
          options: [
            { id: 'object', title: 'OBJECT', color: 'indigo' },
            { id: 'relation', title: 'RELATION', color: 'green' },
          ],
        },
      },
    ],
    [],
  );

  const dataRows = useMemo(() => {
    return schema
      .filter(textFilter(filter))
      .map((item) => ({
        id: Type.getDXN(item),
        typename: Type.getTypename(item) ?? '',
        version: Type.getVersion(item) ?? '',
        kind: Entity.getKind(item),

        _original: item, // Store the original item for selection
      }))
      .toSorted((a, b) => (a.id?.toString() ?? '').localeCompare(b.id?.toString() ?? ''));
  }, [schema, filter]);

  const handleObjectRowClicked = useCallback((row: any) => {
    if (!row) {
      setSelected(undefined);
      return;
    }

    itemSelect(row._original);
  }, []);

  const features: Partial<TableFeatures> = useMemo(() => ({ selection: { enabled: true, mode: 'single' } }), []);

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          {!props.space && <DataSpaceSelector />}
          <Searchbar placeholder='Filter...' onChange={setFilter} />
        </Toolbar.Root>
      }
    >
      <div className='bs-full grid grid-cols-[4fr_3fr] overflow-hidden'>
        <div className='flex flex-col is-full overflow-hidden'>
          <DynamicTable
            properties={dataProperties}
            rows={dataRows}
            features={features}
            onRowClick={handleObjectRowClicked}
          />
          <div
            className={mx(
              'bs-[--statusbar-size]',
              'flex shrink-0 justify-end items-center gap-2',
              'bg-baseSurface text-description',
            )}
          >
            <div className='text-sm pie-2'>Objects: {dataRows.length}</div>
          </div>
        </div>

        <div className='min-bs-0 bs-full !border-separator border-is border-bs'>
          <div className={mx('p-1 min-bs-0 bs-full overflow-auto')}>
            {selected ? (
              <ObjectViewer
                object={Type.toJsonSchema(selected)}
                id={Type.getDXN(selected)?.toString()}
                onNavigate={onNavigate}
              />
            ) : (
              <Placeholder label='Data' />
            )}
          </div>
        </div>
      </div>
    </PanelContainer>
  );
};
