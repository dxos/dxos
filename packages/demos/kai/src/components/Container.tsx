//
// Copyright 2022 DXOS.org
//

import { css } from '@emotion/css';
import React from 'react';

import {
  Add as AddIcon,
  Share as ShareIcon
} from '@mui/icons-material';

import { useTestItems } from '../hooks';
import { Actions } from './Actions';
import { ItemCard } from './ItemCard';
import { Searchbar } from './Searchbar';

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
export const Container = () => {
  const items = useTestItems(10);

  return (
    <div className={styles}>
      <div>
        <div className='header'>
          <Searchbar />
        </div>
        <div className='items'>
          {items.map(item => (
            <ItemCard
              key={item.id}
              item={item}
            />
          ))}
        </div>
        <div>
          <Actions
            actions={actions}
          />
        </div>
      </div>
    </div>
  );
};
