//
// Copyright 2022 DXOS.org
//

import React from 'react';

export const Welcome = ({ name }: { name: string }) => {
  const isDark = document.documentElement.classList.contains('dark');
  return (
    <div className='flex justify-center align-middle'>
      <div className='max-w-md bg-zinc-100 dark:bg-zinc-800 p-6 m-8 rounded-md shadow-lg'>
        <img src={isDark ? 'dxos-white.svg' : 'dxos.svg'} className='mb-10' />
        <h1>{name ?? 'hello'}</h1>
        <p>Your new DXOS app works.</p>
        <p>
          See <code>src/App.tsx</code> and <code>src/Welcome.tsx</code>
        </p>
        <p>
          <a href='https://tailwindcss.com/docs' target='_blank' rel='noreferrer'>
            Tailwind
          </a>{' '}
          is available.
        </p>
        <p>
          Add your <code>css</code> to <code>src/index.scss</code> or import <code>.scss</code> files from your{' '}
          <code>.ts</code> files directly.
        </p>
        <p>
          When you are ready you can deploy this app to your{' '}
          <a href='https://docs.dxos.org/guide/kube' target='_blank' rel='noreferrer'>
            KUBE
          </a>
          .
        </p>
        <pre>pnpm run deploy</pre>
        <h2>Learn more:</h2>

        <ul>
          <li>
            <a href='https://docs.dxos.org/guide/echo/react' target='_blank' rel='noreferrer'>
              Using ECHO with React
            </a>
          </li>
          <li>
            <a href='https://docs.dxos.org/guide/kube/dx-yml-file' target='_blank' rel='noreferrer'>
              Deploying to KUBE
            </a>
          </li>
          <li>
            <a href='https://docs.dxos.org' target='_blank' rel='noreferrer'>
              DXOS Documentation
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
};
