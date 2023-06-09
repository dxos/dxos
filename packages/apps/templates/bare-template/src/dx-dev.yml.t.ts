import { defineTemplate, text } from '@dxos/plate';
import config from './config.t';

export default defineTemplate<typeof config>(() => {
  return text`
  version: 1

  runtime:
    client:
      remoteSource: http://localhost:3967/vault.html
    services:
      signaling: [
        server: wss://kube.dxos.org/.well-known/dx/signal
      ]
  `;
  // TODO(wittjosiah): Use local signal in monorepo.
  // ${monorepo && text`services:
  //   signal:
  //     server: ws://localhost:8888/.well-known/dx/signal`}
});
