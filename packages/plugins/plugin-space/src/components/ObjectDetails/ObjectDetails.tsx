//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useMemo } from 'react';

import { Surface, type SurfaceComponentProps } from '@dxos/app-framework/react';
import { type Obj } from '@dxos/echo';
import { Toolbar } from '@dxos/react-ui';
import { Layout } from '@dxos/react-ui-mosaic';

import { BaseObjectSettings } from './BaseObjectSettings';

export type ObjectDetailsProps = SurfaceComponentProps<Obj.Unknown>;

export const ObjectDetails = forwardRef<HTMLDivElement, ObjectDetailsProps>(
  ({ role, subject: object }, forwardedRef) => {
    const data = useMemo(() => ({ subject: object }), [object]);

    return (
      <Layout.Main role={role} ref={forwardedRef}>
        <Toolbar.Root />
        <BaseObjectSettings object={object}>
          <Surface role='base-object-settings' data={data} />
          <Surface role='object-settings' data={data} />
          {/* TODO(wittjosiah): Remove (or add as surface)? */}
          {/* <AdvancedObjectSettings object={object} /> */}
        </BaseObjectSettings>
      </Layout.Main>
    );
  },
);
