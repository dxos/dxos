//
// Copyright 2023 DXOS.org
//

import { type FC } from 'react';

import { type CardProps } from './Card';

export type CardFactory<T extends {}> = (type: string, object: T) => FC<CardProps>;
