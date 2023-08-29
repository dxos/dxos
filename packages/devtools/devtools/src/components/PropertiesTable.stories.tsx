//
// Copyright 2023 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { PublicKey } from '@dxos/keys';

import '@dxosTheme';

import { PropertiesSchema, PropertiesTable, PropertySchemaFormat } from './PropertiesTable';

const TestStory = () => {
  const schema = useMemo<PropertiesSchema>(
    () => ({
      key: PropertySchemaFormat.key(),
      count: PropertySchemaFormat.number(),
      complete: PropertySchemaFormat.percent(2),
      memory: PropertySchemaFormat.unit('B'),
      duration: PropertySchemaFormat.number('ms'),
      now: PropertySchemaFormat.date(),
      recent: PropertySchemaFormat.date({ format: 'HH:mm:ss' }),
      relative: PropertySchemaFormat.date({ relative: true }),
    }),
    [],
  );

  const [properties] = useState({
    key: PublicKey.random(),
    count: 100_000,
    complete: Math.PI,
    memory: 25_000_100,
    duration: 1234,
    now: Date.now(),
    recent: Date.now() - 10_000,
    relative: Date.now() - 10_000,
  });

  return (
    <div className='flex flex-col gap-16 bg-white p-4'>
      <PropertiesTable schema={schema} object={properties} />
    </div>
  );
};

export default {
  component: TestStory,
};

export const Default = {
  args: {},
};
