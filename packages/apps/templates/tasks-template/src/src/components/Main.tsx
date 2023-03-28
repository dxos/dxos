//
// Copyright 2023 DXOS.org
//

import React, { ReactNode } from 'react';

export type MainProps = {
  children?: ReactNode;
};
export const Main = ({ children }: MainProps) => {
  return <main className='p-4'>{children}</main>;
};
