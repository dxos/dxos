import { plate } from '@dxos/plate';
import template from './template.t';

export default template.define.text({
  content: ({ input: { name } }) => plate`
  version: 1
  package:
    modules:
      - name: '${name}'
        type: dxos:type/app
        build:
          command: npm run build
          outdir: 'out/${name}'
  runtime:
    client:
      storage:
        persistent: true
    services:
      signaling: [
        server: wss://kube.dxos.org/.well-known/dx/signal
      ]
      ice:
        - urls: turn:kube.dxos.org:3478
          username: dxos
          credential: dxos`,
});