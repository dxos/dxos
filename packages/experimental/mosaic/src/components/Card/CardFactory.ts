//
// Copyright 2023 DXOS.org
//

import { FC } from 'react';

import { CardProps } from './Card';

export type CardFactory<T extends {}> = (type: string, object: T) => FC<CardProps>;
