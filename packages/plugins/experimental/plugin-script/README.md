# @dxos/plugin-script

Surface plugin for script editor.

Composer config:

```yml
# packages/app/composer-app/dx.local.yml
version: 1
runtime:
  client:
    edgeFeatures:
      echoReplicator: true
  services:
    edge:
      url: wss://edge.dxos.workers.dev/
    agentHosting:
      type: LOCAL_TESTING
```

Test credentials:

```js
await dxos.client.halo.writeCredentials([{
  issuer: dxos.client.halo.identity.get().identityKey,
  subject: {
    id: dxos.client.halo.identity.get().identityKey,
    assertion: {
      '@type': 'dxos.halo.credentials.ServiceAccess',
      serverName: 'hub.dxos.network',
      serverKey: dxos.client.halo.identity.get().identityKey,
      identityKey: dxos.client.halo.identity.get().identityKey,
      capabilities: ['composer:beta']
    }
  }
}])
```

Start composer:

```bash
DX_HUB_URL="https://hub-staging.dxos.workers.dev/" DX_ENVIRONMENT=test px serve composer-app
```

Streaming request:

```bash
curl -X POST -sN -d 'What is DXOS'
```
