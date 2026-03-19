//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { type Obj } from '@dxos/echo';
import { Panel, Toolbar } from '@dxos/react-ui';

import { BaseObjectSettings } from '../../components';

export type ObjectDetailsProps = SurfaceComponentProps<Obj.Unknown>;

export const ObjectDetails = forwardRef<HTMLDivElement, ObjectDetailsProps>(
  ({ role, subject: object }, forwardedRef) => {
    const data = useMemo(() => ({ subject: object }), [object]);

    return (
      <Panel.Root role={role} className='dx-document' ref={forwardedRef}>
        <Panel.Toolbar asChild>
          <Toolbar.Root />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <BaseObjectSettings object={object}>
            <Surface.Surface role='base-object-settings' data={data} />
            <Surface.Surface role='object-settings' data={data} />
            {/* TODO(wittjosiah): Remove (or add as surface)? */}
            {/* <AdvancedObjectSettings object={object} /> */}
          </BaseObjectSettings>
        </Panel.Content>
      </Panel.Root>
    );
  },
);
