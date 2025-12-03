//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/react';
import { type Obj } from '@dxos/echo';
import { Toolbar } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';

import { BaseObjectSettings } from './BaseObjectSettings';

export type ObjectDetailsProps = {
  object: Obj.Any;
  role: string;
};

export const ObjectDetails = ({ object }: ObjectDetailsProps) => {
  const data = useMemo(() => ({ subject: object }), [object]);

  return (
    <StackItem.Content toolbar>
      <Toolbar.Root />
      <BaseObjectSettings object={object}>
        <Surface role='base-object-settings' data={data} />
        <Surface role='object-settings' data={data} />
        {/* TODO(wittjosiah): Remove (or add as surface)? */}
        {/* <AdvancedObjectSettings object={object} /> */}
      </BaseObjectSettings>
    </StackItem.Content>
  );
};
