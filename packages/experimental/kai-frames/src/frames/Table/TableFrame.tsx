//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Table, Toolbar } from '@dxos/mosaic';
import { Searchbar, Select } from '@dxos/react-appkit';
import { TypedObject, useQuery } from '@dxos/react-client/echo';

import { ColumnType, getColumnType, schemaTypes } from './util';
import { useFrameContext } from '../../hooks';

export const TableFrame = () => {
  const { space } = useFrameContext();
  const [type, setType] = useState<ColumnType<any> | undefined>(schemaTypes[0]);
  const [text, setText] = useState<string>();
  // TODO(burdon): Bug if changes.
  const objects = useQuery(space, type?.filter).filter(type?.subFilter?.(text?.toLowerCase()) ?? Boolean);

  useEffect(() => {
    const initialType = schemaTypes.find((type) => type.id === 'dxos.experimental.kai.Contact');
    setType(initialType);
  }, []);

  const handleSearch = (text: string) => {
    setText(text);
  };

  return (
    <div className='flex flex-col flex-1 overflow-hidden'>
      <Toolbar className='mb-2'>
        <div className='w-screen md:w-column'>
          <Select value={type?.id} onValueChange={(value) => value && setType(getColumnType(value))}>
            {schemaTypes?.map((type) => (
              <Select.Item key={type.id} value={type.id}>
                {type.title}
              </Select.Item>
            ))}
          </Select>
        </div>

        <div className='grow' />
        <div className='w-screen md:w-column'>
          <Searchbar slots={{ root: { placeholder: 'Filter...' } }} onSearch={handleSearch} />
        </div>
      </Toolbar>

      {type && (
        <div className='flex flex-1 overflow-hidden px-2'>
          <Table<TypedObject>
            columns={type.columns}
            data={objects}
            slots={{
              header: { className: 'bg-paper-1-bg' },
              row: { className: 'hover:bg-hover-bg odd:bg-table-rowOdd even:bg-table-rowEven' },
            }}
          />
        </div>
      )}
    </div>
  );
};

export default TableFrame;
