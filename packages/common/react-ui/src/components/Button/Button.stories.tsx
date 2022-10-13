//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React, { PropsWithChildren } from 'react';

import { Button } from './Button';

export default {
  title: 'react-ui/Button'
};

const Container = ({ children }: PropsWithChildren<{}>) => (
  <div
    className='flex gap-4'>{children}</div>
);

export const Default = () => {
  return (
    <Container>
      <Button>Hello</Button>
      <Button disabled>Disabled</Button>
    </Container>
  );
};

export const Primary = () => {
  return (
    <Container>
      <Button variant='primary'>Hello</Button>
      <Button variant='primary' disabled>Disabled</Button>
    </Container>
  );
};

export const Outline = () => {
  return (
    <Container>
      <Button variant='outline'>Hello</Button>
      <Button variant='outline' disabled>Disabled</Button>
    </Container>
  );
};
