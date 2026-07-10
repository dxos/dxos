//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { type Script } from '@dxos/compute';
import { Form } from '@dxos/react-ui-form';

import { FunctionBinding } from './FunctionBinding';
import { FunctionPublishing } from './FunctionPublishing';
import { SkillEditor } from './SkillEditor';

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
