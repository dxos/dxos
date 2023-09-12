//
// Copyright 2023 DXOS.org
//
import React from 'react';

import { TileProps } from '../types';

const Card = ({ tile: { id, label } }: TileProps) => {
  return <p>{label}</p>;
};

export { Card };
