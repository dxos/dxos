//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React, { experimental_useEvent, useEffect, useId, useReducer, useRef, useState } from 'react';

import { PublicKey } from '@dxos/client';
import { log } from '@dxos/log';
import { Button } from '@dxos/react-components';

import { ClientSpaceDecorator } from '../testing';
import { withReactor } from './useReactor';
import { useSpace } from './useSpaces';
import { useSubscription, useSubscriptionEffect } from './useSubscription';

log.config({ filter: 'ClientContext:debug,ClientSpaceDecorator:debug,useReactor:debug,warn' });

export default {
  title: 'echo/useReactor'
};

export const Test = {
  render: () => {
    return <div>client active</div>;
  },
  decorators: [ClientSpaceDecorator()]
};

export const Default = {
  render: ({ spaceKey }: { spaceKey: PublicKey }) => {
    const ref = useRef<HTMLElement>(null);
    const space = useSpace(spaceKey);
    console.log(ref.current);

    const id = useId();

    const [x__, forceUpdate] = useReducer((x) => {
      console.log('reduce');
      return x + 1
    }, 0);

    const state = useRef({
      mounted: false,
      updateBeforeMount: false
    });

    const triggerForceUpdate = () => {
      console.log('trigger', {
        count: space?.properties.count,
        id
      });
      if (!state.current.mounted) {
        state.current.updateBeforeMount = true;
        return;
      }
      forceUpdate();
    }

    console.log('render',{
      count: space?.properties.count,
      id
    });

    useEffect(() => {
      console.log('mount', {
        count: space?.properties.count,
        id
      })
      state.current.mounted = true;
      if (state.current.updateBeforeMount) {
        triggerForceUpdate();
      }
      return () => {
        console.log('unmount', {
          count: space?.properties.count,
          id
        })
      }
    })

    useSubscriptionEffect(() => {
      console.log("CHANGED!")
      triggerForceUpdate()
    }, [space?.properties])


    return (
      <div>
        <Button
          onClick={() => {
            if (!space) {
              return;
            }
            console.log('decrement');
            space.properties.count ??= 0;
            space.properties.count--;
          }}
        >
          -
        </Button>
        <span ref={ref}>{space?.properties.count ?? 0}</span>
        <Button
          onClick={() => {
            if (!space) {
              return;
            }
            console.log('increment');
            space.properties.count ??= 0;
            space.properties.count++;
          }}
        >
          +
        </Button>
        <button onClick={triggerForceUpdate}>forceUpdate</button>
      </div>
    );
  },
  decorators: [ClientSpaceDecorator()]
};

let count = 0;

export const Primitive = {
  render: () => {
    const [, forceUpdate] = useState({});
    console.log('render', count);

    return (
      <>
        <Button
          onClick={() => {
            count--;
            forceUpdate({});
          }}
        >
          -
        </Button>
        <span>{count}</span>
        <Button
          onClick={() => {
            count++;
            forceUpdate({});
          }}
        >
          +
        </Button>
      </>
    );
  }
};
