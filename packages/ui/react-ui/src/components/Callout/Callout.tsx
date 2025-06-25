//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren } from 'react';

import { type MessageValence } from '@dxos/react-ui-types';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { Icon } from '../Icon';

const [CalloutProvider, useCalloutContext] = createContext<{ valence: MessageValence }>('Callout');

type CalloutRootProps = ThemedClassName<PropsWithChildren<{ valence?: MessageValence }>>;

const CalloutRoot = ({ classNames, children, valence = 'neutral' }: CalloutRootProps) => {
  const { tx } = useThemeContext();
  return (
    <CalloutProvider valence={valence}>
      <div role='alert' className={tx('callout.root', 'callout__root', { valence }, classNames)}>
        {children}
      </div>
    </CalloutProvider>
  );
};

const icons: Record<MessageValence, string> = {
  success: 'ph--check-circle--regular',
  info: 'ph--info--regular',
  warning: 'ph--warning--regular',
  error: 'ph--warning-circle--regular',
  neutral: 'ph--info--regular',
};

const CalloutIcon = () => {
  const { tx } = useThemeContext();
  const { valence } = useCalloutContext('CalloutIcon');
  return (
    <div role='none' className='items-center'>
      <Icon classNames={tx('callout.icon', 'callout__icon', { valence })} size={5} icon={icons[valence]} />
    </div>
  );
};

type CalloutTextProps = PropsWithChildren;

const CalloutText = ({ children }: CalloutTextProps) => {
  const { tx } = useThemeContext();
  const { valence } = useCalloutContext('CalloutIcon');
  return <p className={tx('callout.text', 'callout__text', { valence })}>{children}</p>;
};

/**
 * https://www.radix-ui.com/themes/docs/components/callout
 */
export const Callout = {
  Root: CalloutRoot,
  Icon: CalloutIcon,
  Text: CalloutText,
};

export type { CalloutRootProps, CalloutTextProps };
