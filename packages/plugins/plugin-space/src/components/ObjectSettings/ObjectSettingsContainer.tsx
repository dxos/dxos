//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework';
import { type ReactiveEchoObject } from '@dxos/react-client/echo';
import { Clipboard } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';

import { AdvancedObjectSettings } from './AdvancedObjectSettings';
import { BaseObjectSettings } from './BaseObjectSettings';

export type ObjectSettingsContainerProps = {
  object: ReactiveEchoObject<any>;
  role: string;
};

export const ObjectSettingsContainer = ({ object, role }: ObjectSettingsContainerProps) => {
  const data = useMemo(() => ({ subject: object }), [object]);

  return (
    <Clipboard.Provider>
      <StackItem.Content toolbar={false} role={role}>
        <div className='flex flex-col overflow-y-auto divide-y divide-separator'>
          <BaseObjectSettings object={object}>
            <Surface role='base-object-settings' data={data} />
          </BaseObjectSettings>
          <Surface role='object-settings' data={data} />
          <AdvancedObjectSettings object={object} />
        </div>
      </StackItem.Content>
    </Clipboard.Provider>
  );
};
