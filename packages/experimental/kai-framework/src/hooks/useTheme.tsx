//
// Copyright 2023 DXOS.org
//

import {
  AirplaneTakeoff,
  Atom,
  Bag,
  Bank,
  Basketball,
  Bug,
  Buildings,
  Confetti,
  Factory,
  Presentation,
  Rocket,
  Users,
} from '@phosphor-icons/react';
import { FC, useState } from 'react';

import { useSubscription } from '@dxos/react-client/echo';

import { useAppRouter } from '../hooks';

export const icons: { id: string; Icon: FC<any> }[] = [
  {
    id: 'bug',
    Icon: Bug,
  },
  {
    id: 'atom',
    Icon: Atom,
  },
  {
    id: 'suitcase',
    Icon: Bag,
  },
  {
    id: 'presentation',
    Icon: Presentation,
  },
  {
    id: 'plane',
    Icon: AirplaneTakeoff,
  },
  {
    id: 'bank',
    Icon: Bank,
  },
  {
    id: 'building',
    Icon: Buildings,
  },
  {
    id: 'party',
    Icon: Confetti,
  },
  {
    id: 'factory',
    Icon: Factory,
  },
  {
    id: 'rocket',
    Icon: Rocket,
  },
  {
    id: 'sport',
    Icon: Basketball,
  },
  {
    id: 'team',
    Icon: Users,
  },
];

export type Theme = {
  id: string;
  classes: {
    header: string;
    border: string;
  };
};

// https://tailwindcss.com/docs/customizing-colors#aliasing-color-names
export const themes: Theme[] = [
  {
    id: 'slate',
    classes: {
      header: 'bg-slate-400',
      border: 'border-slate-300',
    },
  },
  {
    id: 'zinc',
    classes: {
      header: 'bg-zinc-400',
      border: 'border-zinc-300',
    },
  },
  {
    id: 'red',
    classes: {
      header: 'bg-red-400',
      border: 'border-red-300',
    },
  },
  {
    id: 'orange',
    classes: {
      header: 'bg-orange-400',
      border: 'border-orange-300',
    },
  },
  {
    id: 'emerald',
    classes: {
      header: 'bg-emerald-400',
      border: 'border-emerald-300',
    },
  },
  {
    id: 'cyan',
    classes: {
      header: 'bg-cyan-400',
      border: 'border-cyan-300',
    },
  },
  {
    id: 'sky',
    classes: {
      header: 'bg-sky-400',
      border: 'border-sky-300',
    },
  },
  {
    id: 'blue',
    classes: {
      header: 'bg-blue-400',
      border: 'border-blue-300',
    },
  },
  {
    id: 'indigo',
    classes: {
      header: 'bg-indigo-400',
      border: 'border-indigo-300',
    },
  },
  {
    id: 'fuchsia',
    classes: {
      header: 'bg-fuchsia-400',
      border: 'border-fuchsia-300',
    },
  },
  {
    id: 'violet',
    classes: {
      header: 'bg-violet-400',
      border: 'border-violet-300',
    },
  },
  {
    id: 'pink',
    classes: {
      header: 'bg-pink-400',
      border: 'border-pink-300',
    },
  },
];

export const getIcon = (icon: string | undefined) => {
  const { Icon } = icons.find(({ id }) => id === icon) ?? icons[0];
  return Icon;
};

export const getTheme = (theme: string | undefined): Theme => {
  return themes.find(({ id }) => id === theme) ?? defaultTheme;
};

const defaultTheme = getTheme('sky') ?? themes[0];

/**
 * Support theme variants.
 */
// TODO(wittjosiah): Update head theme as well.
export const useTheme = (): Theme => {
  const { space } = useAppRouter();

  // TODO(dmaretskyi): useObserver hook? (memo with reactive subscription -- observer(...) in a hook form)
  // const theme = useObserver(() => getTheme(space?.properties.theme))
  const [theme, setTheme] = useState(() => getTheme(space?.properties.theme));
  // TODO(wittjosiah): Remove?
  useSubscription(() => {
    setTheme(getTheme(space?.properties.theme));
  }, [space?.properties]);

  return theme;
};
