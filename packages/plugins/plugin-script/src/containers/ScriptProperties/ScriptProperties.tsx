//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import type * as Script from '@dxos/compute/Script';
import { Form } from '@dxos/react-ui-form';

import { FunctionBinding } from './FunctionBinding.tsx';
import { FunctionPublishing } from './FunctionPublishing.tsx';
import { SkillEditor } from './SkillEditor.tsx';

export type ScriptPropertiesProps = AppSurface.ObjectPropertiesProps<Script.Script>;

export const ScriptProperties = ({ subject: object }: ScriptPropertiesProps) => {
  return (
    <>
      <Form.Section>
        <FunctionBinding object={object} />
      </Form.Section>
      <Form.Section>
        <SkillEditor object={object} />
      </Form.Section>
      <Form.Section>
        <FunctionPublishing object={object} />
      </Form.Section>
    </>
  );
};

ScriptProperties.displayName = 'ScriptProperties';
