import { defineTemplate, text } from '@dxos/plate';
import config from './config.t';

export default defineTemplate<typeof config>(({ input }) => {
  const { name, monorepo } = input;
  return !monorepo
    ? null
    : text`
  version: 1

  runtime:
    client:
      remoteSource: http://localhost:3967/vault.html

    services:
      signal:
        server: ws://localhost:8888/.well-known/dx/signal
  `;
});
