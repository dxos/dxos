//
// Copyright 2020 DXOS.org
//

import React, { type ComponentType, type JSX, useCallback, useEffect, useMemo, useState } from 'react';

import { type ReactiveEchoObject } from '@dxos/echo-db';
import {
  FormatEnum,
  getEntityKind,
  getSchemaDXN,
  getSchemaTypename,
  getSchemaVersion,
  toJsonSchema,
} from '@dxos/echo-schema';
import { DXN } from '@dxos/keys';
import { getType } from '@dxos/live-object';
import { type Space } from '@dxos/react-client/echo';
import { Toolbar } from '@dxos/react-ui';
import { createElement, SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { DynamicTable, type TableFeatures } from '@dxos/react-ui-table';
import { mx } from '@dxos/react-ui-theme';

import type { Schema } from 'effect';
import { PanelContainer, Placeholder, Searchbar } from '../../../components';
import { DataSpaceSelector } from '../../../containers';
import { useDevtoolsState } from '../../../hooks';
import { styles } from '../../../styles';

const textFilter = (text?: string) => {
  if (!text) {
    return () => true;
  }

  // TODO(burdon): Structured query (e.g., "type:Text").
  const matcher = new RegExp(text, 'i');
  return (item: ReactiveEchoObject<any>) => {
    let match = false;
    match ||= !!getType(item)?.objectId.match(matcher);
    match ||= !!String((item as any).title ?? '').match(matcher);
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
        setSchema([...space.db.graph.schemaRegistry.schemas, ...query.results]);
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

  console.log({ schema, space });

  const onNavigate = (dxn: DXN) => {
    const selectedSchema = schema.find((item) => getSchemaDXN(item) && DXN.equals(getSchemaDXN(item)!, dxn));
    if (selectedSchema) {
      setSelected(() => selectedSchema);
      return;
    }

    const typeDXN = dxn.asTypeDXN();
    if (typeDXN && typeDXN.version === undefined) {
      const latestSchema = schema.find((item) => getSchemaDXN(item)?.toString().startsWith(dxn.toString()));
      if (latestSchema) {
        setSelected(() => latestSchema);
        return;
      }
    }
  };

  const itemSelect = (item: Schema.Schema.AnyNoContext) => {
    setSelected(() => item);
  };

  const dataProperties = useMemo(
    () => [
      { name: 'typename', format: FormatEnum.String },
      { name: 'version', format: FormatEnum.String, size: 100 },
      {
        name: 'kind',
        format: FormatEnum.SingleSelect,
        size: 100,
        config: {
          options: [
            { id: 'object', title: 'OBJECT', color: 'red' },
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
        id: getSchemaDXN(item),
        typename: getSchemaTypename(item) ?? '',
        version: getSchemaVersion(item) ?? '',
        kind: getEntityKind(item),

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
      <div className={mx('bs-full grid grid-cols-[4fr_3fr]', 'overflow-hidden', styles.border)}>
        <div className='flex flex-col w-full overflow-hidden'>
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
          <div className={mx('p-1 min-bs-0 overflow-auto')}>
            {selected ? (
              <ObjectDataViewer object={toJsonSchema(selected)} onNavigate={onNavigate} />
            ) : (
              <Placeholder label='Data' />
            )}
          </div>
        </div>
      </div>
    </PanelContainer>
  );
};

export type ObjectDataViewerProps = {
  object: ReactiveEchoObject<any>;
  onNavigate: (dxn: DXN) => void;
};

// TODO(dmaretskyi): Extract.
const ObjectDataViewer = ({ object, onNavigate }: ObjectDataViewerProps) => {
  const text = JSON.stringify(object, null, 2);

  const rowRenderer = ({
    rows,
    stylesheet,
    useInlineStyles,
  }: {
    rows: rendererNode[];
    stylesheet: any;
    useInlineStyles: any;
  }) => {
    /**
     * Changes the "dxn:..." span to an anchor tag that navigates to the object.
     */
    const addDxnLinks = (node: rendererNode) => {
      if (isDxnSpanNode(node)) {
        node.tagName = 'a';
        node.properties ??= { className: [] };
        node.properties.className.push('underline', 'cursor-pointer');
        node.properties.onClick = () => {
          onNavigate(DXN.parse((node.children![0].value as string).slice(1, -1)));
        };
      } else {
        node.children?.forEach(addDxnLinks);
      }
    };

    rows.forEach(addDxnLinks);

    return rows.map((row, index) => {
      return createElement({
        node: row,
        stylesheet,
        style: {},
        useInlineStyles,
        key: index,
      });
    });
  };

  return (
    <SyntaxHighlighter classNames='text-sm' language='json' renderer={rowRenderer}>
      {text}
    </SyntaxHighlighter>
  );
};

interface rendererNode {
  type: 'element' | 'text';
  value?: string | number | undefined;
  tagName?: keyof JSX.IntrinsicElements | ComponentType<any> | undefined;
  properties?: { className: any[]; [key: string]: any };
  children?: rendererNode[];
}

const isDxnSpanNode = (node: rendererNode) => {
  return (
    node.type === 'element' &&
    node.tagName === 'span' &&
    node.children?.length === 1 &&
    node.children[0].type === 'text' &&
    typeof node.children[0].value === 'string' &&
    node.children[0].value.match(/^"(dxn:[^"]+)"$/)
  );
};
