//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Button, type ButtonProps } from './Button';
import { useThemeContext } from '../../hooks';
import { Icon, type IconProps } from '../Icon';

type IconButtonProps = Omit<ButtonProps, 'children'> & Pick<IconProps, 'icon'> & { label?: string };

const IconButton = ({ icon, label, ...props }: IconButtonProps) => {
  const { tx } = useThemeContext();
  return (
    <Button {...props} classNames={tx('iconButton.root', 'iconButton')}>
      <Icon icon={icon} />
      {label && <span>{label}</span>}
    </Button>
  );
};

export { IconButton };

export type { IconButtonProps };
