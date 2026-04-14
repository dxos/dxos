//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { type Obj } from '@dxos/echo';
import { Panel, Toolbar } from '@dxos/react-ui';
import { ObjectProperties } from '@dxos/react-ui-form';

export type ObjectDetailsProps = AppSurface.ObjectPropertiesProps<Obj.Unknown>;

export const ObjectDetails = forwardRef<HTMLDivElement, ObjectDetailsProps>(
  ({ role, subject: object }, forwardedRef) => {
    const data = useMemo<AppSurface.ObjectPropertiesData>(() => ({ subject: object }), [object]);

    return (
      <Panel.Root role={role} className='dx-document' ref={forwardedRef}>
        <Panel.Toolbar asChild>
          <Toolbar.Root />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <ObjectProperties object={object}>
            <Surface.Surface role='object-properties' data={data} />
          </ObjectProperties>
        </Panel.Content>
      </Panel.Root>
    );
  },
);
