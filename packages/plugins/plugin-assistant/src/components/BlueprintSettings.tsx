//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React from 'react';

import { Blueprint } from '@dxos/blueprints';
import { Form } from '@dxos/react-ui-form';

const FormSchema = Blueprint.Blueprint.pipe(Schema.pick('tools'));

export const BlueprintSettings = ({ blueprint }: { blueprint: Blueprint.Blueprint }) => {
  return <Form outerSpacing={false} readonly='disabled-input' values={blueprint} schema={FormSchema} />;
};
