import { defineTemplate, text } from '@dxos/plate';
import config from './config.t';

export default defineTemplate<typeof config>(({ input }) => {
  const { name } = input;
  return text`
  version: 1
  package:
    modules:
      - name: exampledomain:app/${name}
        type: dxos:type/app
        build:
          command: npm run build
          outdir: out/${name}
  runtime:
    client:
      storage:
        persistent: true
    services:
      signal:
        server: ws://localhost:8888/.well-known/dx/signal
      ice:
        - urls: turn:kube.dxos.org:3478
          username: dxos
          credential: dxos`
});
