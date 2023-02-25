import { Client, Config, fromHost, PublicKey } from '@dxos/client'
import { WebsocketRpcServer } from '@dxos/websocket-rpc'
import { log } from '@dxos/log'
import { ClientServices } from '@dxos/client-services';

const rpcPort = parseInt(process.env.DX_RPC_PORT ?? '3023');

(async () => {
  const config = new Config({
    runtime: {
      client: {
        storage: {
          persistent: true,
          path: './dxos-tmp'
        }
      },
      services: {
        signal: {
          server: 'wss://dev.kube.dxos.org/.well-known/dx/signal'
        },
        ice: [
          { urls: 'stun:enterprise.kube.dxos.network:3478' },
          {
            urls: 'turn:enterprise.kube.dxos.network:3478',
            username: 'dxos',
            credential: 'dxos'
          },
          { urls: 'stun:discovery.kube.dxos.network:3478' },
          {
            urls: 'turn:discovery.kube.dxos.network:3478',
            username: 'dxos',
            credential: 'dxos'
          }
        ]
      }
    }
  })

  log.info('config', { config: config.values })

  const client = new Client({
    config,
    services: fromHost(config)
  })

  await client.initialize();

  log.info('client initialized', {
    identity: client.halo.identity?.identityKey,
    spaces: client.echo.getSpaces().map(space => space.key.toHex())
  })

  const server = new WebsocketRpcServer<{}, ClientServices>({
    port: rpcPort,
    onConnection: async (info) => {
      const id = PublicKey.random().toHex();
      log.info('connection', { id })

      return {
        exposed: client.services.descriptors,
        requested: {},
        handlers: client.services.services as ClientServices,
        onOpen: async () => {
          log.info('open', { id })
        },
        onClose: async () => {
          log.info('close', { id })
        }
      }
    }
  })

  await server.open();
  log.info('listening ', { rpcPort })
})()