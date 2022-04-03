//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import React, { useState } from 'react';

import { ChevronRight as ExpandIcon, ExpandMore as CollapseIcon } from '@mui/icons-material';
import { TreeItem, TreeView } from '@mui/lab';
import { Box } from '@mui/material';

import { Item, Party } from '@dxos/client';
import { ObjectModel } from '@dxos/object-model';
import { useAsyncEffect } from '@dxos/react-async';
import { ClientProvider, ProfileInitializer, useClient, useSelection } from '@dxos/react-client';

import { TableBuilder, useTableBuilder, useTestTable } from '../src';

export default {
  title: 'react-client-testing/TestTable'
};

const ItemNode = ({ item, onSelect }: { item: Item<ObjectModel>, onSelect?: (item: Item<ObjectModel>) => void }) => {
  const children = useSelection(item.select().children(), []);

  return (
    <TreeItem nodeId={item.id} label={item.type} onClick={() => onSelect?.(item)}>
      {children?.map((child) => (
        <ItemNode key={child.id} item={child} onSelect={onSelect} />
      ))}
    </TreeItem>
  );
};

const TestTableStory = () => {
  const client = useClient();
  const [party, setParty] = useState<Party>();
  const table = useTestTable(party);

  useAsyncEffect(async () => {
    const party = await client.echo.createParty();
    setParty(party);
  }, []);

  return (
    <TreeView
      defaultCollapseIcon={<CollapseIcon />}
      defaultExpandIcon={<ExpandIcon />}
      sx={{
        flex: 1,
        maxWidth: 300,
        overflowY: 'auto'
      }}
    >
      {table && (
        <ItemNode
          key={table.id}
          item={table}
        />
      )}
    </TreeView>
  );
};

export const Primary = () => {
  return (
    <ClientProvider>
      <ProfileInitializer>
        <TestTableStory />
      </ProfileInitializer>
    </ClientProvider>
  );
};

const customFields = [
  {
    fieldName: 'Name',
    generator: faker.name.firstName
  },
  {
    fieldName: 'Last Name',
    generator: faker.name.lastName
  }
];

const TableBuilderStory = () => {
  const client = useClient();
  const [party, setParty] = useState<Party>();
  const [table, setTable] = useState<Item<ObjectModel>>();
  const tableBuilder = useTableBuilder(party, table);
  const [selected, setSelected] = useState<object>();

  useAsyncEffect(async () => {
    const party = await client.echo.createParty();
    const tableItem = await party.database.createItem({
      model: ObjectModel,
      type: 'dxos:type.table.table'
    });

    setParty(party);
    setTable(tableItem);
  }, []);

  const buildCustomTestTable = async (builder: TableBuilder) => {
    const columns = await builder.createColumns(undefined, customFields.map(field => field.fieldName));
    const fields = customFields.map((field) => {
      const columnId = columns.find(column => column.model.get('field') === field.fieldName)?.id ?? '';
      return {
        ...field,
        columnId
      };
    });

    await builder.createRows(fields, 10);
  };

  useAsyncEffect(async () => {
    if (tableBuilder) {
      await buildCustomTestTable(tableBuilder);
    }
  }, [tableBuilder]);

  return (
    <Box display='flex'>
      <TreeView
        defaultCollapseIcon={<CollapseIcon />}
        defaultExpandIcon={<ExpandIcon />}
        sx={{
          flex: 1,
          overflowY: 'auto',
          width: '30%'
        }}
      >
        {table && (
          <ItemNode
            key={table.id}
            item={table}
            onSelect={(item) => setSelected({
              id: item.id,
              ...item.model.toObject()
            })}
          />
        )}
      </TreeView>

      {/* TODO(burdon): Use Mui Table. */}
      {selected && (
        <Box sx={{
          width: '70%',
          '& td': {
            verticalAlign: 'top'
          }
        }}>
          <table>
            <tbody>
              {Object.entries(selected).map(([key, value]) => (
                <tr key={key}>
                  <td style={{ width: 100 }}>{key}</td>
                  <td>{value as string}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      )}
    </Box>
  );
};

export const Secondary = () => {
  return (
    <ClientProvider>
      <ProfileInitializer>
        <TableBuilderStory />
      </ProfileInitializer>
    </ClientProvider>
  );
};
