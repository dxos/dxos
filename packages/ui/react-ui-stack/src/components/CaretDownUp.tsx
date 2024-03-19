//
// Copyright 2024 DXOS.org
//
import { type IconProps } from '@phosphor-icons/react';
import React from 'react';

export const CaretDownUp = ({ children, weight, ...props }: IconProps) => {
  return (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256' {...props}>
      <rect width='256' height='256' fill='none' />
      <polyline
        points='80 224 128 176 176 224'
        fill='none'
        stroke='currentColor'
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='16'
      />
      <polyline
        points='80 32 128 80 176 32'
        fill='none'
        stroke='currentColor'
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='16'
      />
      {children}
    </svg>
  );
};
