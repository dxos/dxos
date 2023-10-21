//
// Copyright 2023 DXOS.org
//

import React from 'React';

import { FullscreenDecorator } from '../testing';

const Home = () => {
  return (
    <div className='flex flex-col w-[800px] bg-white p-8 my-8 gap-4 text-lg font-thin'>
      <b className='text-4xl font-medium text-black'>Mosaic</b>
      <p>
        <b>React Mosaic</b> is a user interface framework and component library built on Radix and Tailwind.
      </p>
      <p>It enables developer to rapidly build beautiful data-driven applications.</p>
      <table className='border [&>tbody>tr>td]:p-1'>
        <tbody>
          <tr>
            <td className='font-mono text-blue-800'>@react-mosaic/components</td>
            <td>Radix component library.</td>
          </tr>
          <tr>
            <td className='font-mono text-blue-800'>@react-mosaic/dnd</td>
            <td>Drag and drop container and tiling.</td>
          </tr>
          <tr>
            <td className='font-mono text-blue-800'>@react-mosaic/view</td>
            <td>Data-driven components.</td>
          </tr>
          <tr>
            <td className='font-mono text-blue-800'>@react-mosaic/table</td>
            <td>Data-driven tables.</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default {
  component: Home,
  decorators: [FullscreenDecorator('flex justify-center')],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
