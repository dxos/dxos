//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { type Obj } from '@dxos/echo';
import { Toolbar } from '@dxos/react-ui';
import { Layout } from '@dxos/react-ui';

import { BaseObjectSettings } from './BaseObjectSettings';

export type ObjectDetailsProps = SurfaceComponentProps<Obj.Unknown>;

export const ObjectDetails = forwardRef<HTMLDivElement, ObjectDetailsProps>(
  ({ role, subject: object }, forwardedRef) => {
    const data = useMemo(() => ({ subject: object }), [object]);

    return (
      <Layout.Main toolbar role={role} ref={forwardedRef}>
        <Toolbar.Root />
        <BaseObjectSettings object={object}>
          <Surface.Surface role='base-object-settings' data={data} />
          <Surface.Surface role='object-settings' data={data} />
          {/* TODO(wittjosiah): Remove (or add as surface)? */}
          {/* <AdvancedObjectSettings object={object} /> */}
        </BaseObjectSettings>
      </Layout.Main>
    );
  },
);
