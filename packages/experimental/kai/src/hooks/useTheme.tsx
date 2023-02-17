//
// Copyright 2023 DXOS.org
//

import { AirplaneTakeoff, Bank, Buildings, Confetti, Factory, Package, Rocket, Users } from 'phosphor-react';
import { FC } from 'react';
import hash from 'string-hash';

import { useSpace } from './useSpace';

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
const themes: ThemeClasses[] = [
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

/**
 * Support theme variants.
 */
export const useTheme = (): Theme => {
  const space = useSpace();
  const x = hash(space.key.toString());
  const classes = themes[x % themes.length];
  return { classes };
};
