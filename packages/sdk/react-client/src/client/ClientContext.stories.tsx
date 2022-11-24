//
// Copyright 2021 DXOS.org
//

import React, { Component, PropsWithChildren } from 'react';

import { Config } from '@dxos/config';

import { ClientProvider, useClient } from './ClientContext';

export default {
  title: 'react-client/ClientContext'
};

const JsonPanel = ({ value }: { value: any }) => (
  <pre
    style={{
      margin: 0,
      // code whiteSpace: 'pre-wrap',
      // code wordBreak: 'break-all',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
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
        <JsonPanel value={client.halo.profile} />
      </div>
    </div>
  );
};

export const Primary = () => (
  <ClientProvider>
    <TestApp />
  </ClientProvider>
);

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
      return <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}

export const Failure = () => (
  <ErrorBoundary>
    <ClientProvider config={new Config({ runtime: { client: { remoteSource: 'bad-value' } } })}>
      <TestApp />
    </ClientProvider>
  </ErrorBoundary>
);
