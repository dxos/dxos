//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { type Obj } from '@dxos/echo';
import { Panel, Toolbar } from '@dxos/react-ui';
import { ObjectProperties as NaturalObjectProperties } from '@dxos/react-ui-form';

export type ObjectPropertiesProps = AppSurface.ObjectPropertiesProps<Obj.Unknown>;

export const ObjectProperties = forwardRef<HTMLDivElement, ObjectPropertiesProps>(
  ({ role, subject: object }, forwardedRef) => {
    const data = useMemo<AppSurface.ObjectPropertiesData>(() => ({ subject: object }), [object]);

    return (
      <Panel.Root role={role} className='dx-document' ref={forwardedRef}>
        <Panel.Toolbar asChild>
          <Toolbar.Root />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <NaturalObjectProperties object={object}>
            <Surface.Surface type={AppSurface.ObjectProperties} data={data} />
          </NaturalObjectProperties>
        </Panel.Content>
      </Panel.Root>
    );
  },
);
