//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { type Chain as ChainType } from '@braneframe/types';
import { DensityProvider } from '@dxos/react-ui';
import { groupBorder, mx } from '@dxos/react-ui-theme';

import { InputRow } from './InputRow';
import { TriggerRow } from './TriggerRow';

type SignalTemplateProps = {
  signal: ChainType.FunctionSignal;
};

export const SignalTemplate = ({ signal }: SignalTemplateProps) => {
  return (
    <DensityProvider density='fine'>
      <div className={mx('flex flex-col w-full overflow-hidden gap-4', groupBorder)}>
        <Section title='Signal'>
          <div className='flex items-center pl-4 py-2'>{signal.type}</div>
        </Section>

        {(signal.triggers?.length ?? 0) > 0 && (
          <Section title='Trigger on change'>
            <div className='flex flex-col divide-y'>
              <table className='table-fixed border-collapse'>
                <tbody>
                  {signal.triggers.map((input) => (
                    <TriggerRow trigger={input} key={input.typename} />
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {signal.inputs?.length > 0 && (
          <Section title='Inputs'>
            <div className='flex flex-col divide-y'>
              <table className='table-fixed border-collapse'>
                <tbody>
                  {signal.inputs.map((input) => (
                    <InputRow input={input} key={input.name} />
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}
      </div>
    </DensityProvider>
  );
};

export const Section = ({ title, actions, children }: PropsWithChildren<{ title: string; actions?: JSX.Element }>) => {
  return (
    <div className={mx('border rounded-md', groupBorder)}>
      <div
        className={mx('flex h-[32px] items-center bg-neutral-50 dark:bg-neutral-800 rounded-t border-b', groupBorder)}
      >
        <h2 className='px-2 text-xs'>{title}</h2>
        <div className='grow' />
        {actions}
      </div>
      {children}
    </div>
  );
};
