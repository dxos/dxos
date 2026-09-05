//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type CSSProperties, type PropsWithChildren, useState } from 'react';

import { mx } from '@dxos/ui-theme';
import { type Density } from '@dxos/ui-types';

import { Button, Icon, IconButton, Input, type InputVariant, Select } from '../components';
import { withTheme } from '../testing';

/** Tailwind hues the accent can take; the roles derive every accent token from one hue. */
const ACCENT_HUES = ['blue', 'indigo', 'violet', 'purple', 'pink', 'red', 'orange', 'amber', 'green', 'teal', 'cyan'];

/** Overrides the accent role tokens for a subtree, the way `roles.css` derives them from blue. */
const accentStyle = (hue: string): CSSProperties =>
  ({
    '--color-accent-bg': `light-dark(var(--color-${hue}-600), var(--color-${hue}-700))`,
    '--color-accent-bg-hover': `light-dark(var(--color-${hue}-700), var(--color-${hue}-800))`,
    '--color-accent-fg': `var(--color-${hue}-100)`,
    '--color-accent-text': `light-dark(var(--color-${hue}-600), var(--color-${hue}-400))`,
    '--color-accent-text-hover': `var(--color-${hue}-500)`,
  }) as CSSProperties;

const Section = ({ title, fields = true, children }: PropsWithChildren<{ title: string; fields?: boolean }>) => (
  <section className='flex flex-col gap-2'>
    <h2 className='text-sm text-description'>{title}</h2>
    {/* `Input.Root` renders no element, so a row of fields has the fields as its own children. */}
    <div className={mx('flex flex-wrap items-center gap-3', fields && '[&>*]:w-64')}>{children}</div>
  </section>
);

const DENSITIES: Density[] = ['sm', 'md', 'lg'];
const VARIANTS: InputVariant[] = ['default', 'subdued'];

const PlaygroundStory = () => {
  const [hue, setHue] = useState('blue');
  const [value, setValue] = useState('');
  return (
    <div className='flex flex-col gap-6 p-4' style={accentStyle(hue)}>
      <Section title='Accent' fields={false}>
        <Select.Root value={hue} onValueChange={setHue}>
          <Select.TriggerButton placeholder='Accent' />
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                {ACCENT_HUES.map((option) => (
                  <Select.Option key={option} value={option}>
                    <span className='flex items-center gap-2'>
                      <span className='size-3 rounded-full' style={{ background: `var(--color-${option}-600)` }} />
                      {option}
                    </span>
                  </Select.Option>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
        <Button variant='primary'>Primary</Button>
        <Button>Default</Button>
        <Input.Root>
          <Input.Checkbox defaultChecked />
          <Input.Label>Checked</Input.Label>
        </Input.Root>
      </Section>

      <Section title='Density'>
        {DENSITIES.map((density) => (
          <Input.Root key={density}>
            <Input.TextInput density={density} placeholder={density} />
          </Input.Root>
        ))}
      </Section>

      <Section title='Variant'>
        {VARIANTS.map((variant) => (
          <Input.Root key={variant}>
            <Input.TextInput variant={variant} placeholder={variant} />
          </Input.Root>
        ))}
      </Section>

      <Section title='Adornments'>
        <Input.Root>
          <Input.TextInput placeholder='Search' start={<Icon icon='ph--magnifying-glass--regular' />} />
        </Input.Root>
        <Input.Root>
          <Input.TextInput
            placeholder='Type to clear'
            value={value}
            onChange={(event) => setValue(event.target.value)}
            end={
              value ? (
                <IconButton variant='ghost' icon='ph--x--regular' iconOnly label='Clear' onClick={() => setValue('')} />
              ) : undefined
            }
          />
        </Input.Root>
        <Input.Root>
          <Input.TextInput
            placeholder='Command'
            start={<Icon icon='ph--terminal--regular' />}
            end={<kbd className='text-xs text-description'>⌘K</kbd>}
          />
        </Input.Root>
        <Input.Root>
          <Input.TextInput
            placeholder='With action'
            end={
              <Button density='sm' variant='primary'>
                Go
              </Button>
            }
          />
        </Input.Root>
      </Section>

      <Section title='State'>
        <Input.Root>
          <Input.TextInput placeholder='Disabled' disabled />
        </Input.Root>
        <Input.Root>
          <Input.TextInput placeholder='Read only' readOnly defaultValue='Read only' />
        </Input.Root>
        <Input.Root validationValence='error'>
          <Input.TextInput placeholder='Error' defaultValue='Not an email' />
        </Input.Root>
        <Input.Root validationValence='warning'>
          <Input.TextInput placeholder='Warning' defaultValue='Weak' />
        </Input.Root>
        <Input.Root validationValence='success'>
          <Input.TextInput placeholder='Success' defaultValue='Available' />
        </Input.Root>
      </Section>

      <Section title='Labelled'>
        <Input.Root>
          <div className='flex flex-col gap-1'>
            <Input.Label>Email</Input.Label>
            <Input.TextInput placeholder='you@example.com' start={<Icon icon='ph--envelope--regular' />} />
            <Input.DescriptionAndValidation>
              <Input.Description>Where we reach you.</Input.Description>
            </Input.DescriptionAndValidation>
          </div>
        </Input.Root>
      </Section>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-core/playground/TextField',
  render: PlaygroundStory,
  decorators: [withTheme()],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof PlaygroundStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
