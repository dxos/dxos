//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { PublicKey } from '@dxos/protocols';

import { JsonTreeView } from '../src';
import { Container } from './helpers';

export default {
  title: 'react-components/JsonTreeView',
  component: JsonTreeView
};

export const Primary = () => {
  const data = {
    first: {
      second: {
        third: {
          null: null,
          success: true,
          failure: false,
          num: 100,
          string: 'text',
          key: PublicKey.random()
        }
      }
    },
    peer: false
  };

  return (
    <Container>
      <JsonTreeView data={data} />
    </Container>
  );
};
