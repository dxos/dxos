//
// Copyright 2020 DXOS.org
//

import * as Option from 'effect/Option';
import * as SchemaAST from 'effect/SchemaAST';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { DXN, Entity, Format, Type } from '@dxos/echo';
import { type URI } from '@dxos/keys';
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
  return (item: Type.AnyEntity) => {
    const schema = Type.getSchema(item);
    let match = false;
    match ||= !!Type.getURI(item)?.toString().match(matcher);
    match ||= !!SchemaAST.getTitleAnnotation(schema.ast).pipe(Option.getOrUndefined)?.match(matcher);
    match ||= !!SchemaAST.getDescriptionAnnotation(schema.ast).pipe(Option.getOrUndefined)?.match(matcher);
    return match;
  };
};

const useSchemaQuery = (space?: Space): Type.AnyEntity[] => {
  const [schema, setSchema] = useState<Type.AnyEntity[]>([]);
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
  const [selected, setSelected] = useState<Type.AnyEntity>();

  const onNavigate = (dxn: URI.URI) => {
    const selectedSchema = schema.find((item) => Type.getURI(item) === dxn);
    if (selectedSchema) {
      setSelected(() => selectedSchema);
      return;
    }

    // If the DXN is a valid new-style DXN without a version, find the latest versioned schema.
    if (DXN.isDXN(dxn) && DXN.getVersion(dxn) === undefined) {
      const latestSchema = schema.find((item) => Type.getURI(item)?.toString().startsWith(dxn.toString()));
      if (latestSchema) {
        setSelected(() => latestSchema);
      }
    }
  };

  const itemSelect = (item: Type.AnyEntity) => {
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
      .map((item) => {
        const itemSchema = Type.getSchema(item);
        return {
          id: Type.getURI(item),
          typename: Type.getTypename(item) ?? '',
          version: Type.getVersion(item) ?? '',
          kind: Entity.getKind(itemSchema),

          _original: item, // Store the original item for selection
        };
      })
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
      <div className='h-full grid grid-cols-[4fr_3fr] overflow-hidden'>
        <div className='flex flex-col w-full overflow-hidden'>
          <DynamicTable
            properties={dataProperties}
            rows={dataRows}
            features={features}
            onRowClick={handleObjectRowClicked}
          />
          <div
            className={mx(
              'h-(--dx-statusbar-size)',
              'flex shrink-0 justify-end items-center gap-2',
              'bg-base-surface text-description',
            )}
          >
            <div className='text-sm pe-2'>Objects: {dataRows.length}</div>
          </div>
        </div>

        <div className='min-h-0 h-full border-s border-t border-separator'>
          <div className={mx('p-1 min-h-0 h-full overflow-auto')}>
            {selected ? (
              <ObjectViewer
                object={selected.jsonSchema}
                id={Type.getURI(selected)?.toString()}
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
