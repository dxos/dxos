//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import type * as Script from '@dxos/compute/Script';
import { Form } from '@dxos/react-ui-form';

import { FunctionBinding } from './FunctionBinding';
import { FunctionPublishing } from './FunctionPublishing';
import { SkillEditor } from './SkillEditor';

export type ScriptPropertiesProps = AppSurface.ObjectPropertiesProps<Script.Script>;

export const ScriptProperties = ({ subject: object }: ScriptPropertiesProps) => {
  return (
    <>
      <Form.FieldSet>
        <FunctionBinding object={object} />
      </Form.FieldSet>
      <Form.FieldSet>
        <SkillEditor object={object} />
      </Form.FieldSet>
      <Form.FieldSet>
        <FunctionPublishing object={object} />
      </Form.FieldSet>
    </>
  );
};

ScriptProperties.displayName = 'ScriptProperties';
