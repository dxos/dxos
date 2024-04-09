//
// Copyright 2024 DXOS.org
//

import { SmileyBlank, SmileyXEyes } from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';
import { useRouteError } from 'react-router-dom';

import { getSize, mx } from '@dxos/react-ui-theme';

export type ErrorProps = { noJoke?: boolean };

export const Error = ({ noJoke }: ErrorProps) => {
  const error = useRouteError();
  const stack = (error as any)?.stack;
  const [{ joke, punchline }, setJoke] = useState<any>({});
  const Face = punchline ? SmileyXEyes : SmileyBlank;

  useEffect(() => {
    if (noJoke) {
      return;
    }

    let t = setTimeout(async () => {
      // https://publicapis.io/jokes-api
      const result = await fetch('https://official-joke-api.appspot.com/jokes/programming/random', { mode: 'cors' });
      const json = await result.json();
      if (json.length) {
        const { setup: joke, punchline } = json[0];
        setJoke({ joke });
        t = setTimeout(() => setJoke({ joke, punchline }), 2_000);
      }
    });
    return () => clearTimeout(t);
  }, []);

  return (
    <div className='flex flex-col m-8 overflow-hidden divide-y border shadow-lg'>
      {!noJoke && (
        <div className='flex items-center p-4'>
          <Face className={mx(getSize(12), 'text-neutral-500')} />
          {joke && (
            <div className='flex flex-col opacity-50'>
              <span>
                <span className='inline-flex w-12 mx-2 justify-end text-sm'>Alice:</span>
                {joke}
              </span>
              {punchline && (
                <span>
                  <span className='inline-flex w-12 mx-2 justify-end text-sm'>Bob:</span>
                  {punchline}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div className='flex flex-col p-4 gap-4 font-mono overflow-hidden'>
        <div className='text-blue-500'>{String(error)}</div>
        {stack && <pre className='text-sm overflow-x opacity-75'>{stack}</pre>}
      </div>
    </div>
  );
};
