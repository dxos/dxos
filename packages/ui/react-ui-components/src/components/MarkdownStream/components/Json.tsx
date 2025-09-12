//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Json as NaturalJson } from '@dxos/react-ui-syntax-highlighter';

import { type XmlComponentProps } from '../extensions';

export type JsonProps = XmlComponentProps<{ data: string }>;

export const Json = ({ data }: JsonProps) => {
  try {
    const jsonData = JSON.parse(data);
    return <NaturalJson data={jsonData} />;
  } catch (e) {
    return <p>error</p>;
  }
};
