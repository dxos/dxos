//
// Copyright 2023 DXOS.org
//

import { AirplaneTakeoff, Bank, Buildings, Confetti, Factory, Package, Rocket, Users } from 'phosphor-react';
import { FC } from 'react';
import hash from 'string-hash';

import { PublicKey } from '@dxos/keys';

import { useAppRouter } from '../hooks';

// TODO(burdon): Space properties.
export const ThemeIcons: FC<any>[] = [AirplaneTakeoff, Bank, Buildings, Confetti, Factory, Package, Rocket, Users];

export type ThemeClasses = {
  header: string;
  toolbar: string;
};

// TODO(burdon): See Button "compact" flag vs "variant"
export type Theme = {
  panel?: 'regular' | 'flat';
  classes?: ThemeClasses;
};

// https://tailwindcss.com/docs/customizing-colors#aliasing-color-names
export const themes: ThemeClasses[] = [
  {
    header: 'bg-sky-500',
    toolbar: 'bg-sky-300'
  },
  {
    header: 'bg-orange-500',
    toolbar: 'bg-orange-300'
  },
  {
    header: 'bg-emerald-500',
    toolbar: 'bg-emerald-300'
  },
  {
    header: 'bg-violet-500',
    toolbar: 'bg-violet-300'
  },
  {
    header: 'bg-pink-500',
    toolbar: 'bg-pink-300'
  },
  {
    header: 'bg-indigo-500',
    toolbar: 'bg-indigo-300'
  },
  {
    header: 'bg-cyan-500',
    toolbar: 'bg-cyan-300'
  },
  {
    header: 'bg-blue-500',
    toolbar: 'bg-blue-300'
  }
];

export const getThemeClasses = (spaceKey: PublicKey) => {
  const x = hash(spaceKey.toString());
  const classes = themes[x % themes.length];
  return { classes, Icon: ThemeIcons[x % ThemeIcons.length] };
};

/**
 * Support theme variants.
 */
// TODO(wittjosiah): Update head theme as well.
export const useTheme = (): Theme => {
  const { space } = useAppRouter();
  const x = space ? hash(space.key.toString()) : 0;
  const classes = themes[x % themes.length];
  return { classes };
};
