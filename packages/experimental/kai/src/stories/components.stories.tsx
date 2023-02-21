//
// Copyright 2023 DXOS.org
//

import defaultsDeep from 'lodash.defaultsdeep';
import { Bug, List } from 'phosphor-react';
import React, { createContext, FC, ReactNode, useContext } from 'react';

import { getSize, mx } from '@dxos/react-components';

const Frame: FC<{ children: ReactNode; className?: string }> = ({ children, className }) => {
  return <div className={mx('flex flex-col absolute top-0 bottom-0 left-0 right-0', className)}>{children}</div>;
};

const GroupContext = createContext<{ compact?: boolean }>({ compact: false });

const useGroupContext = (defaults: { compact?: boolean }) => {
  const props = useContext(GroupContext) ?? {};
  return defaultsDeep({}, defaults, props);
};

export default {
  component: Frame
};

const Stripe: FC<{ compact?: boolean; length?: number; row?: number }> = ({ compact, length = 16, row = 0 }) => {
  const props = useGroupContext({ compact });
  const classNames = props.compact ? 'w-[32px] h-[32px]' : 'w-[40px] h-[40px]';

  return (
    <div className='flex w-full items-center'>
      {Array.from({ length }).map((_, i) => (
        <div key={i} className={mx('flex ', classNames, (i + row) % 2 === 0 ? ' bg-sky-50' : 'bg-sky-100')} />
      ))}
    </div>
  );
};

//
// Controls
//

const Button: FC<{ compact?: boolean; size?: number; className?: string; children?: ReactNode }> = ({
  compact,
  size,
  className,
  children
}) => {
  const props = useGroupContext({ compact });

  return (
    <button
      style={size ? { width: size * (props.compact ? 32 : 40) } : {}}
      className={mx(
        'flex shrink-0 justify-center items-center bg-slate-400',
        props.compact ? 'p-0.5' : 'p-1.5',
        className
      )}
    >
      {children}
    </button>
  );
};

const IconButton: FC<{ compact?: boolean; className?: string; children?: ReactNode }> = ({
  compact,
  className,
  children
}) => {
  const props = useGroupContext({ compact });

  return (
    <button
      className={mx(
        'flex shrink-0 justify-center items-center bg-slate-400',
        props.compact ? 'w-[32px] h-[32px]' : 'w-[40px] h-[40px]',
        className
      )}
    >
      {children}
    </button>
  );
};

const Checkbox: FC<{ compact?: boolean; className?: string }> = ({ compact, className }) => {
  const props = useGroupContext({ compact });

  return (
    <div
      className={mx(
        'flex shrink-0 justify-center items-center',
        props.compact ? 'w-[32px] h-[32px]' : 'w-[40px] h-[40px]',
        className
      )}
    >
      <input type='checkbox' />
    </div>
  );
};

const Input: FC<{ compact?: boolean; size?: number; className?: string }> = ({ compact, size, className }) => {
  const props = useGroupContext({ compact });

  return (
    <input
      type='text'
      autoFocus
      placeholder='Text'
      style={size ? { width: size * (props.compact ? 32 : 40) } : {}}
      className={mx('flex shrink-0 leading-4', props.compact ? 'p-1' : 'p-2', className)}
    />
  );
};

const Select: FC<{ compact?: boolean; size?: number; className?: string }> = ({ compact, size, className }) => {
  const props = useGroupContext({ compact });

  return (
    <select
      style={size ? { width: size * (props.compact ? 32 : 40) } : {}}
      className={mx('flex shrink-0 leading-4', props.compact ? 'p-1.5' : 'p-2.5', className)}
    >
      <option>1</option>
      <option>2</option>
      <option>3</option>
    </select>
  );
};

//
// Stories
//

export const Controls = () => {
  return (
    <Frame className='bg-neutral-100'>
      {[false, true].map((compact, i) => (
        <div key={i} className='flex flex-col m-4'>
          <GroupContext.Provider value={{ compact }}>
            <Stripe />

            <div className='flex items-center'>
              <IconButton>
                <Bug className={getSize(6)} />
              </IconButton>
              <Checkbox />
              <Input size={7} />
              <Button size={2}>Test</Button>
              <Select size={4} />
              <IconButton>
                <List className={getSize(6)} />
              </IconButton>
            </div>

            <Stripe row={1} />
          </GroupContext.Provider>
        </div>
      ))}
    </Frame>
  );
};
