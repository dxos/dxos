//
// Copyright 2023 DXOS.org
//
import React, { forwardRef } from 'react';

import { Card } from '../card';
import { Stack } from '../stack';
import { TileProps } from '../types';

const Tile = forwardRef<HTMLDivElement, TileProps>((props: TileProps, forwardedRef) => {
  switch (props.variant) {
    case 'stack':
      return <Stack {...props} ref={forwardedRef} />;
    case 'card':
      return <Card {...props} ref={forwardedRef} />;
    default:
      return null;
  }
});

export { Tile };
