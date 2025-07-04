//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework';
import { type Obj } from '@dxos/echo';
import { Clipboard } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';

import { BaseObjectSettings } from './BaseObjectSettings';

export type ObjectSettingsContainerProps = {
  object: Obj.Any;
  role: string;
};

export const ObjectSettingsContainer = ({ object, role }: ObjectSettingsContainerProps) => {
  const data = useMemo(() => ({ subject: object }), [object]);

  return (
    <Clipboard.Provider>
      <StackItem.Content toolbar={false}>
        <div role='none' className='overflow-y-auto pli-cardSpacingInline plb-cardSpacingBlock'>
          <BaseObjectSettings object={object}>
            <Surface role='base-object-settings' data={data} />
          </BaseObjectSettings>
          <Surface role='object-settings' data={data} />
          {/* TODO(wittjosiah): Remove? */}
          {/* <AdvancedObjectSettings object={object} /> */}
        </div>
      </StackItem.Content>
    </Clipboard.Provider>
  );
};
