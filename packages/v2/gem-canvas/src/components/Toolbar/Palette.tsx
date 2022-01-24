//
// Copyright 2022 DXOS.org
//

import clsx from 'clsx';
import React from 'react';
import { css } from '@emotion/css';
import { Crop32 as RectIcon } from '@material-ui/icons';

import { elementStyles, styleNames } from '../../controls';

export interface PaletteProps {
  selected?: string
  onSelect?: (style?: string) => void
}

const styles = css`
  display: flex;
  padding: 0;
  background-color: #EEE;
  button {
    width: 32px;
    height: 32px;
    padding: 0;
    padding-top: 2px;
    border: none;
    outline: none;
    background-color: #EEE;
  }
  button.selected {
    background-color: #CCC;
  }
`;

export const Palette = ({
  selected,
  onSelect
}: PaletteProps) => {
  return (
    <div className={clsx(styles, elementStyles)}>
      {['', ...styleNames].map(style => (
        <div
          key={style}
          className={clsx(style, style === selected && 'selected')}
          onClick={() => onSelect(style === selected ? undefined : style)}
        >
          <RectIcon className={elementStyles[style]} />
        </div>
      ))}
    </div>
  );
};
