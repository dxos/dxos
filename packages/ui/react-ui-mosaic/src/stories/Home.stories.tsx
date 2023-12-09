//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { FullscreenDecorator } from '../testing';

const org = '@dxos-mosaic';

const data = {
  quote: `"I've written a few thousand words on why traditional “semantic class names” are the reason CSS is hard to ' +
    'maintain, but the truth is you’re never going to believe me until you actually try it. If you can suppress the ' +
    'urge to retch long enough to give it a chance, I really think you’ll wonder how you ever worked with CSS any other ' +
    'way." [User]`,
};

const packages = [
  {
    name: `${org}/ui`,
    description: 'Component primitives.',
  },
  {
    name: `${org}/dnd`,
    description: 'Drag-and-drop containers and tiles.',
  },
  {
    name: `${org}/echo`,
    description: 'DXOS ECHO bindings.',
  },
  {
    name: `${org}/editor`,
    description: 'Rich text editor.',
  },
  {
    name: `${org}/table`,
    description: 'Blazingly fast virtualized tables.',
  },
  {
    name: `${org}/stack`,
    description: 'Flexible block editor.',
  },
  {
    name: `${org}/grid`,
    description: 'Hierarchical and zoomable grid.',
  },
];

const Home = () => {
  return (
    <div className='flex flex-col w-[800px] bg-white px-16 py-20 gap-4 text-lg font-light'>
      <b className='text-4xl font-medium text-black'>Mosaic</b>
      <p>
        Mosaic is an extensible user interface framework and component library built using{' '}
        <span className='font-mono text-purple-700'>radix</span> and{' '}
        <span className='font-mono text-purple-700'>tailwindcss</span>. It enables the rapid development of beautiful
        data-driven applications.
      </p>
      <p>Mosaic is an extensible family of packages, which include:</p>
      <table>
        <tbody>
          {packages.map(({ name, description }) => (
            <tr key={name}>
              <td className='font-mono text-purple-700 w-[260px]'>{name}</td>
              <td>{description}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <br />
      <h1 className='text-lg flex justify-center font-medium text-blue-700'>Data-drive components, done right.</h1>
      <p className='px-8'>{data.quote}</p>
    </div>
  );
};

export default {
  component: Home,
  decorators: [withTheme, FullscreenDecorator('flex justify-center bg-[url(/images/bg-mosaic.png)]')],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
