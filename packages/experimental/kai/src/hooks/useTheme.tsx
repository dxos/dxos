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
  Users
} from '@phosphor-icons/react';
import { FC, useState } from 'react';

import { useSubscription } from '@dxos/react-client';

import { useAppRouter } from '../hooks';

export const icons: { id: string; Icon: FC<any> }[] = [
  {
    id: 'bug',
    Icon: Bug
  },
  {
    id: 'atom',
    Icon: Atom
  },
  {
    id: 'suitcase',
    Icon: Bag
  },
  {
    id: 'presentation',
    Icon: Presentation
  },
  {
    id: 'plane',
    Icon: AirplaneTakeoff
  },
  {
    id: 'bank',
    Icon: Bank
  },
  {
    id: 'building',
    Icon: Buildings
  },
  {
    id: 'party',
    Icon: Confetti
  },
  {
    id: 'factory',
    Icon: Factory
  },
  {
    id: 'rocket',
    Icon: Rocket
  },
  {
    id: 'sport',
    Icon: Basketball
  },
  {
    id: 'team',
    Icon: Users
  }
];

export type Theme = {
  id: string;
  classes: {
    header: string;
    toolbar: string;
  };
  panel?: 'normal' | 'flat';
};

// https://tailwindcss.com/docs/customizing-colors#aliasing-color-names
export const themes: Theme[] = [
  {
    id: 'slate',
    classes: {
      header: 'bg-slate-400',
      toolbar: 'bg-slate-300'
    }
  },
  {
    id: 'zinc',
    classes: {
      header: 'bg-zinc-400',
      toolbar: 'bg-zinc-300'
    }
  },
  {
    id: 'red',
    classes: {
      header: 'bg-red-400',
      toolbar: 'bg-red-300'
    }
  },
  {
    id: 'orange',
    classes: {
      header: 'bg-orange-400',
      toolbar: 'bg-orange-300'
    }
  },
  {
    id: 'emerald',
    classes: {
      header: 'bg-emerald-400',
      toolbar: 'bg-emerald-300'
    }
  },
  {
    id: 'cyan',
    classes: {
      header: 'bg-cyan-400',
      toolbar: 'bg-cyan-300'
    }
  },
  {
    id: 'sky',
    classes: {
      header: 'bg-sky-400',
      toolbar: 'bg-sky-300'
    }
  },
  {
    id: 'blue',
    classes: {
      header: 'bg-blue-400',
      toolbar: 'bg-blue-300'
    }
  },
  {
    id: 'indigo',
    classes: {
      header: 'bg-indigo-400',
      toolbar: 'bg-indigo-300'
    }
  },
  {
    id: 'fuchsia',
    classes: {
      header: 'bg-fuchsia-400',
      toolbar: 'bg-fuchsia-300'
    }
  },
  {
    id: 'violet',
    classes: {
      header: 'bg-violet-400',
      toolbar: 'bg-violet-300'
    }
  },
  {
    id: 'pink',
    classes: {
      header: 'bg-pink-400',
      toolbar: 'bg-pink-300'
    }
  }
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
  useSubscription(() => {
    setTheme(getTheme(space?.properties.theme));
  }, [space?.properties]);

  return theme;
};
