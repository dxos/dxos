//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { Icon } from '../Icon';

type Severity = 'info' | 'warning' | 'success' | 'error';

const [CalloutProvider, useCalloutContext] = createContext<{ severity: Severity }>('Callout');

type CalloutRootProps = ThemedClassName<PropsWithChildren<{ severity?: Severity }>>;

const CalloutRoot = ({ classNames, children, severity = 'info' }: CalloutRootProps) => {
  const { tx } = useThemeContext();
  return (
    <CalloutProvider severity={severity}>
      <div role='alert' className={tx('callout.root', 'callout__root', { severity }, classNames)}>
        {children}
      </div>
    </CalloutProvider>
  );
};

const icons: Record<Severity, string> = {
  info: 'ph--info--regular',
  warning: 'ph--warning--regular',
  success: 'ph--check-circle--regular',
  error: 'ph--warning-circle--regular',
};

const CalloutIcon = () => {
  const { tx } = useThemeContext();
  const { severity } = useCalloutContext('CalloutIcon');
  return (
    <div role='none' className='items-center'>
      <Icon classNames={tx('callout.icon', 'callout__icon', { severity })} size={6} icon={icons[severity]} />
    </div>
  );
};

type CalloutTextProps = PropsWithChildren;

const CalloutText = ({ children }: CalloutTextProps) => {
  const { tx } = useThemeContext();
  const { severity } = useCalloutContext('CalloutIcon');
  return <p className={tx('callout.text', 'callout__text', { severity })}>{children}</p>;
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
