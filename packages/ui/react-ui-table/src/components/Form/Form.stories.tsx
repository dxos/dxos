//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { AST, S } from '@dxos/echo-schema';
import { Input } from '@dxos/react-ui';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import translations from '../../translations';

const Story = (props: FormProps) => (
  <div className='flex w-[240px] m-2 p-2 border border-separator rounded'>
    <Form {...props} />
  </div>
);

type FormProps = {
  schema: S.Schema<any>;
};

const Form = ({ schema }: FormProps) => {
  // const types = getColumnTypes(schema);
  const props = AST.getPropertySignatures(schema.ast);

  return (
    <div className='flex flex-col w-full gap-2'>
      {props.map(({ type, name }, i) => {
        const description = AST.getDescriptionAnnotation(type);
        console.log(description);
        return (
          <Input.Root key={i}>
            <Input.Label>{description.value?.toString() ?? name.toString()}</Input.Label>
            <Input.TextInput
              placeholder={name.toString()}
              // value={formState.label ?? ''}
              // onChange={(event) => setFormState((prevState) => ({ ...prevState, label: event.target.value }))}
            />
          </Input.Root>
        );
      })}
    </div>
  );
};

const dataSchema = S.Struct({
  name: S.String.annotations({ [AST.DescriptionAnnotationId]: 'Full name' }),
  email: S.String,
  age: S.Number,
});

const columnSchema = S.Struct({
  prop: S.keyof(dataSchema),
  path: S.String,
  label: S.String,
  width: S.Number,
});

const tableSchema = S.Struct({
  schema: dataSchema,
  columns: S.Array(columnSchema),
});

export default {
  title: 'react-ui-table/Form',
  decorators: [withTheme, withLayout()],
  parameters: {
    translations,
  },
  render: Story,
};

export const Default = {
  args: {
    schema: dataSchema,
  },
};
