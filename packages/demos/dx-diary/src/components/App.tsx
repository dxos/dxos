//
// Copyright 2022 DXOS.org
//

import { css } from '@emotion/css';
import React, { useEffect, useState } from 'react';

import {
  Add as AddIcon,
  Share as ShareIcon
} from '@mui/icons-material';

import { useTestItems } from '../hooks';
import { Actions } from './Actions';
import { ItemCard } from './ItemCard';
import { Searchbar } from './Searchbar';

import { Client } from '@dxos/client/client'
import { useClient, useParties, useParty, useSelection } from '@dxos/react-client';
import { DiaryEntry } from './DiaryEntry';

// TODO(burdon): Storybook for App.

const styles = css`
  display: flex;
  flex-direction: row;
  flex: 1;
  justify-content: center;
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background-color: #F5F5F5;
  > div {
    display: flex;
    flex-direction: column;
    width: 800px;
    overflow: hidden;

    .header {
      margin-top: 8px;
    }
    
    .items {
      overflow-y: scroll;
    }
  }
`;

const actions = [
  { icon: <AddIcon />, name: 'Copy' },
  { icon: <ShareIcon />, name: 'Share' }
];

/**
 * @constructor
 */
export const App = () => {
  const client = useClient();

  const [party] = useParties();
  useEffect(() => {
    if(!party) {
      void client.echo.createParty()
    }
  }, [party])

  const today = new Date('2022-08-17T14:20:54.441Z').toDateString();

  const items = useSelection(party?.select({ type: 'dx-diary:entry' }).exec())

  useEffect(() => {
    if(items && items.length === 0) {
      party?.database.createItem({
        type: 'dx-diary:entry',
        props: {
          title: undefined,
          date: today,
          content: '',
        }
      })
    }
  }, [items])

  console.log({ party, items, today })

  return (
    <div className={styles}>
      <div>
        <div className='items'>
          {items?.map(item => (
            <DiaryEntry
              key={item.id}
              item={item}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
