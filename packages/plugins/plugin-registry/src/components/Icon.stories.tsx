//
// Copyright 2023 DXOS.org
//

import { IconBase, type IconProps, type IconWeight } from '@phosphor-icons/react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type ReactElement, type SVGProps, forwardRef } from 'react';

import { Icon } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { getSize, mx } from '@dxos/react-ui-theme';

/**
 * Serializable icon props.
 */
type StoryIconProps = {
  name: string;
  weights: Record<string, SVGProps<SVGPathElement>[]>;
};

/**
 * Create icon from serializable data.
 * https://github.com/phosphor-icons/react#custom-icons
 * https://github.com/phosphor-icons/core/tree/main/assets
 */
const createIcon = ({ name, weights }: StoryIconProps) => {
  const CustomIcon = forwardRef<SVGSVGElement, IconProps>((props, ref) => (
    <IconBase
      ref={ref}
      {...props}
      weights={
        new Map<IconWeight, ReactElement>(
          Object.entries(weights).map(
            ([key, paths]) =>
              [
                key,
                <>
                  {paths.map((props, i) => (
                    <path key={`${key}-${i}`} {...props} />
                  ))}
                </>,
              ] as [IconWeight, ReactElement],
          ),
        )
      }
    />
  ));
  CustomIcon.displayName = name;
  return CustomIcon;
};

const DefaultStory = () => {
  const CustomIcon = createIcon({
    name: 'GithubLogo',
    weights: {
      // https://github.com/phosphor-icons/core/tree/main/assets
      // <path d="M119.83,56A52,52,0,0,0,76,32a51.92,51.92,0,0,0-3.49,44.7A49.28,49.28,0,0,0,64,104v8a48,48,0,0,0,48,48h48a48,48,0,0,0,48-48v-8a49.28,49.28,0,0,0-8.51-27.3A51.92,51.92,0,0,0,196,32a52,52,0,0,0-43.83,24Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/>
      // <path d="M104,232V192a32,32,0,0,1,32-32h0a32,32,0,0,1,32,32v40" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/>
      // <path d="M104,208H72a32,32,0,0,1-32-32A32,32,0,0,0,8,144" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/>
      regular: [
        {
          d: 'M119.83,56A52,52,0,0,0,76,32a51.92,51.92,0,0,0-3.49,44.7A49.28,49.28,0,0,0,64,104v8a48,48,0,0,0,48,48h48a48,48,0,0,0,48-48v-8a49.28,49.28,0,0,0-8.51-27.3A51.92,51.92,0,0,0,196,32a52,52,0,0,0-43.83,24Z',
          fill: 'none',
          stroke: 'currentColor',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          strokeWidth: '16',
        },
        {
          d: 'M104,232V192a32,32,0,0,1,32-32h0a32,32,0,0,1,32,32v40',
          fill: 'none',
          stroke: 'currentColor',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          strokeWidth: '16',
        },
        {
          d: 'M104,208H72a32,32,0,0,1-32-32A32,32,0,0,0,8,144',
          fill: 'none',
          stroke: 'currentColor',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          strokeWidth: '16',
        },
      ],
    },
  });

  return (
    <div className='flex gap-4 p-8 ring'>
      <CustomIcon weight={'regular'} className={mx(getSize(8))} />
      <Icon icon='ph--github-logo--regular' classNames={mx(getSize(8))} />
    </div>
  );
};

export const Default: Story = {};

const meta = {
  title: 'plugins/plugin-registry/Icon',
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof IconBase>;

export default meta;

type Story = StoryObj<typeof meta>;
