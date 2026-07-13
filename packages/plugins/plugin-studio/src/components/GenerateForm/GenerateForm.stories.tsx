//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { GenerateForm } from './GenerateForm';

import { translations } from '../../translations';

/** A representative kind-specific request schema (mirrors an image provider's knobs). */
const RequestSchema = Schema.Struct({
  model: Schema.optional(Schema.String.annotations({ title: 'Model' })),
  aspectRatio: Schema.optional(Schema.String.annotations({ title: 'Aspect ratio' })),
  style: Schema.optional(Schema.String.annotations({ title: 'Style' })),
  seed: Schema.optional(Schema.Number.annotations({ title: 'Seed' })),
});

const meta: Meta = {
  title: 'plugins/plugin-studio/components/GenerateForm',
  decorators: [withTheme(), withLayout()],
  parameters: { translations },
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState<Record<string, unknown>>({ model: 'V_2', aspectRatio: '1x1' });
    return (
      <div className='is-80'>
        <GenerateForm schema={RequestSchema} value={value} onChange={setValue} />
        <pre className='mt-2 text-xs text-description'>{JSON.stringify(value, null, 2)}</pre>
      </div>
    );
  },
};
