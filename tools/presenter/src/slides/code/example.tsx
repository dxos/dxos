// Copyright 2022 DXOS.org
// prettier-ignore

import {
  ClientProvider,
  useClient
} from '@dxos/react-client';

export const App = () => {
  const client = useClient();
  // ...
  return <div />;
};

ReactDOM.render(
  <ClientProvider client={client}>
    <App />
  </ClientProvider>,
  document.getElementById('root')
);
