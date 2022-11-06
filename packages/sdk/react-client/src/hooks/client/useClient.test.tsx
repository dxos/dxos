//
// Copyright 2020 DXOS.org
//

import { renderHook } from '@testing-library/react';
import expect from 'expect';
import React, { Component, PropsWithChildren } from 'react';

import { Client } from '@dxos/client';
import { ConfigProto } from '@dxos/config';
import { log } from '@dxos/log';

import { ClientProvider } from '../../containers';
import { useClient } from './useClient';

describe('Client hook', function () {
  const render = () => useClient();

  it.skip('should throw when used outside a context', function () {
    // TODO(wittjosiah): Fix and factor out.
    // Based on https://github.com/testing-library/react-testing-library/pull/991#issuecomment-1207138334
    let error;
    const { result } = renderHook(render, {
      wrapper: class Wrapper extends Component<PropsWithChildren<unknown>> {
        constructor(props: PropsWithChildren<unknown>) {
          super(props);
          this.state = { hasError: false };
        }

        static getDerivedStateFromError() {
          // Update state so the next render will show the fallback UI.
          return { hasError: true };
        }

        override componentDidCatch(err: Error) {
          log.error(err);
          error = err;
        }

        override render() {
          return this.props.children;
        }
      }
    });

    expect(error).toBeDefined();
    expect(result).not.toBeDefined();
  });

  it('should return client when used properly in a context', function () {
    const config: ConfigProto = {
      version: 1,
      runtime: {
        client: {
          storage: {
            persistent: false
          }
        }
      }
    };

    const client = new Client({ config });
    const wrapper = ({ children }: any) => <ClientProvider client={client}>{children}</ClientProvider>;
    const { result } = renderHook(render, { wrapper });
    expect(result.current).toEqual(client);
  });
});
