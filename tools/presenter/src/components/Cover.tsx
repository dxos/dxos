//
// Copyright 2022 DXOS.org
//

import React, { ReactNode } from 'react';

export type CoverProps = {
  backgroundImage?: string;
  children: ReactNode[];
} & React.HTMLProps<HTMLDivElement>;

/**
 * Cover page.
 */
export const Cover = ({ backgroundImage, children, ...props }: CoverProps) => {
  return (
    <>
      <div
        className='flex flex-1'
        style={{
          backgroundImage,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center',
          backgroundSize: 'cover'
        }}
      />

      <div className='flex flex-col' style={{ position: 'absolute', left: 0, right: 0, ...props }}>
        <div className='flex flex-col' style={{ alignItems: 'center' }}>
          {children}
        </div>
      </div>
    </>
  );
};
