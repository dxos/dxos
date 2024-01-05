import { plate } from '@dxos/plate';
import template from './template.t';

export default template.define.text({
  content: () => plate`
  version: 1
  runtime:
    services:
      signaling: [
        server: wss://kube.dxos.org/.well-known/dx/signal
      ]
  `,
  // TODO(wittjosiah): Use local signal in monorepo.
  // ${monorepo && text`services:
  //   signal:
  //     server: ws://localhost:8888/.well-known/dx/signal`}
});
