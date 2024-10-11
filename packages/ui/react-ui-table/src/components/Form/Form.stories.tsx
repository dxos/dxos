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
      {props.map((prop, i) => {
        const { name, annotations } = prop;
        const a = AST.getDescriptionAnnotation(prop);
        console.log(a, annotations);
        return (
          <Input.Root key={i}>
            <Input.Label>{name.toString()}</Input.Label>
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

const schema = S.Struct({
  name: S.String.annotations({ [AST.DescriptionAnnotationId]: 'Name' }),
  email: S.String,
  age: S.Number,
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
    schema,
  },
};
