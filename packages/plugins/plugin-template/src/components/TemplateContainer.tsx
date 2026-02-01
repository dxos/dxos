//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-framework/react';
import { Obj } from '@dxos/echo';
import { Layout } from '@dxos/react-ui-mosaic';

export type TemplateContainerProps = SurfaceComponentProps<Obj.Unknown>;

export const TemplateContainer = ({ role, subject: object }: TemplateContainerProps) => {
  return (
    <Layout.Main role={role}>
      <pre className='m-4 p-2 ring'>
        <span>{Obj.getDXN(object).toString()}</span>
      </pre>
    </Layout.Main>
  );
};
