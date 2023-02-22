//
// Copyright 2023 DXOS.org
//

import { AirplaneTakeoff, Bank, Buildings, Bug, Confetti, Factory, Rocket, Users } from 'phosphor-react';
import { FC, useEffect, useState } from 'react';

import { Properties } from '@dxos/client';

import { useAppRouter } from '../hooks';

export const icons: { id: string; Icon: FC<any> }[] = [
  {
    id: 'bug',
    Icon: Bug
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
    id: 'sky',
    classes: {
      header: 'bg-sky-500',
      toolbar: 'bg-sky-300'
    }
  },
  {
    id: 'orange',
    classes: {
      header: 'bg-orange-500',
      toolbar: 'bg-orange-300'
    }
  },
  {
    id: 'emerald',
    classes: {
      header: 'bg-emerald-500',
      toolbar: 'bg-emerald-300'
    }
  },
  {
    id: 'violet',
    classes: {
      header: 'bg-violet-500',
      toolbar: 'bg-violet-300'
    }
  },
  {
    id: 'pink',
    classes: {
      header: 'bg-pink-500',
      toolbar: 'bg-pink-300'
    }
  },
  {
    id: 'indigo',
    classes: {
      header: 'bg-indigo-500',
      toolbar: 'bg-indigo-300'
    }
  },
  {
    id: 'cyan',
    classes: {
      header: 'bg-cyan-500',
      toolbar: 'bg-cyan-300'
    }
  },
  {
    id: 'blue',
    classes: {
      header: 'bg-blue-500',
      toolbar: 'bg-blue-300'
    }
  }
];

export const getIcon = (icon: string | undefined) => {
  const { Icon } = icons.find(({ id }) => id === icon) ?? icons[0];
  return Icon;
};

export const getTheme = (theme: string | undefined) => {
  return themes.find(({ id }) => id === theme) ?? themes[0];
};

/**
 * Support theme variants.
 */
// TODO(wittjosiah): Update head theme as well.
export const useTheme = (): Theme => {
  const { space } = useAppRouter();
  const [theme, setTheme] = useState(getTheme(space?.properties.theme));
  useEffect(() => {
    const query = space?.db.query(Properties.filter());
    return query?.subscribe(() => {
      setTheme(getTheme(space?.properties.theme));
    });
  }, [space]);

  return theme;
};
