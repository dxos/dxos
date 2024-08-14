//
// Copyright 2021 DXOS.org
//

import '@dxosTheme';

import React, { Component, type PropsWithChildren } from 'react';

import { fromHost } from '@dxos/client';
import { Config } from '@dxos/config';
import { withTheme } from '@dxos/storybook-utils';

import { ClientProvider, useClient } from './ClientContext';

export default {
  title: 'react-client/ClientContext',
  component: ClientProvider,
  decorators: [withTheme],
};

const JsonPanel = ({ value }: { value: any }) => (
  <pre
    style={{
      margin: 0,
      // code whiteSpace: 'pre-wrap',
      // code wordBreak: 'break-all',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }}
  >
    {JSON.stringify(value, undefined, 2)}
  </pre>
);

const TestApp = () => {
  const client = useClient();

  return (
    <div>
      <div style={{ padding: 1 }}>
        <JsonPanel value={client.config} />
      </div>
      <div style={{ padding: 1 }}>
        <JsonPanel value={client.toJSON()} />
      </div>
      <div style={{ padding: 1 }}>
        <JsonPanel value={client.halo.identity} />
      </div>
    </div>
  );
};

const servicesProvider = (config?: Config) => fromHost(config);

export const Default = {
  render: () => (
    <ClientProvider services={servicesProvider}>
      <TestApp />
    </ClientProvider>
  ),
};

class ErrorBoundary extends Component<PropsWithChildren<{}>, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return <div>Runtime Error</div>;
    }

    return this.props.children;
  }
}

const config = new Config({ runtime: { client: { remoteSource: 'bad-value' } } });

export const Error = {
  render: () => (
    <ErrorBoundary>
      <ClientProvider config={config}>
        <TestApp />
      </ClientProvider>
    </ErrorBoundary>
  ),
};
