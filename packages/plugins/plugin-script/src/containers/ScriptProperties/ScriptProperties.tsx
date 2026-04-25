//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { type Script } from '@dxos/compute';

import { BlueprintEditor } from './BlueprintEditor';
import { FunctionBinding } from './FunctionBinding';
import { FunctionPublishing } from './FunctionPublishing';

export type ScriptPropertiesProps = AppSurface.ObjectPropertiesProps<Script.Script>;

export const ScriptProperties = ({ subject: object }: ScriptPropertiesProps) => {
  return (
    <div role='none' className='flex flex-col py-form-gap gap-form-section-gap'>
      <FunctionBinding object={object} />
      <BlueprintEditor object={object} />
      <FunctionPublishing object={object} />
    </div>
  );
};
