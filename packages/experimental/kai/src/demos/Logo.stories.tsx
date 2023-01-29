//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

import Brain from '../../assets/images/brain.svg';
import Logo from '../../assets/images/think.svg';

const LogoIcon: FC<{ width: number; height: number }> = ({ width, height }) => {
  return <div style={{ width, height, backgroundImage: `url(${Logo})`, backgroundRepeat: 'no-repeat' }} />;
};

const BrainIcon: FC<{ width: number; height: number }> = ({ width, height }) => {
  return <div style={{ width, height, backgroundImage: `url(${Brain})`, backgroundRepeat: 'no-repeat' }} />;
};

const backgroundColor = '#010331';

const Test = () => {
  return (
    <div className='flex flex-1 justify-center items-center' style={{ backgroundColor }}>
      <div className='flex flex-col'>
        <div className='flex justify-center'>
          <LogoIcon width={600} height={240} />
        </div>
        <div className='flex justify-center'>
          <BrainIcon width={300} height={300} />
        </div>
      </div>
    </div>
  );
};

export default {
  component: Test,
  argTypes: {}
};

export const Default = () => {
  // TODO(burdon): Pattern for full screen?
  return (
    <div className='flex absolute left-0 right-0 top-0 bottom-0'>
      <Test />
    </div>
  );
};
