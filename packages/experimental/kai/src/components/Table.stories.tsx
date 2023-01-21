//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { Column } from 'react-table';

import { EchoObject } from '@dxos/echo-schema';

import '@dxosTheme';

import { Contact } from '../proto';
import { Table } from './Table';

export default {
  component: Table,
  argTypes: {}
};

const columns: Column<EchoObject>[] = [];

const data: EchoObject[] = [new Contact()];

export const Default = {
  render: () => {
    return (
      <div>
        <Table columns={columns} data={data} />
      </div>
    );
  }
};
