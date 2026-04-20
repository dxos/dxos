//
// Copyright 2026 DXOS.org
//

import * as Function from 'effect/Function';
import { describe, test } from 'vitest';

import { sleep } from '@dxos/async';
import { Client, Config, DXOS_VERSION, LocalClientServices } from '@dxos/client';
import { performInvitation } from '@dxos/client-services/testing';
import { runAndForwardErrors } from '@dxos/effect';
import { log } from '@dxos/log';
import { MemoryTransportFactory } from '@dxos/network-manager';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';

import * as Otel from '../../src/extensions/otel';
import { type Observability, make, addExtension, initialize } from '../../src/observability';
import { identityProvider } from '../../src/providers/client-observability';

// Dev-only: this suite is permanently skipped in CI. It boots two Clients against
// the real edge-main worker and emits spans to a real SigNoz ingestion endpoint.
// There are no assertions on trace structure — this is a manual smoke for eyeballing
// the resulting trace tree in SigNoz. Run locally with:
//
// DX_TEST_TAGS=tracing-e2e \
// DX_OTEL_ENDPOINT=https://ingest.eu.signoz.cloud:443 \
// DX_OTEL_HEADERS='signoz-ingestion-key:<YOUR_SIGNOZ_INGESTION_KEY>' \
// DX_TELEMETRY_TAG=tracing-e2e-$(uuidgen) \
//   moon run observability:test -- --run test/e2e/tracing-invitation.test.ts
//
// ...and flip `describe.skip` to `describe` (or `describe.runIf(...)`) below.

const LOCAL = false;
const EDGE_URL = LOCAL ? 'http://localhost:8787' : 'https://edge-main.dxos.workers.dev';

const createEdgeConfig = () =>
  new Config({
    version: 1,
    runtime: {
      services: {
        edge: { url: EDGE_URL },
      },
      client: {
        edgeFeatures: {
          echoReplicator: true,
          feedReplicator: true,
          signaling: true,
          agents: true,
        },
        storage: {
          persistent: false,
        },
      },
    },
  });

// Initialize observability once per process. OtelTraces mutates process-global state
// (`trace.setGlobalTracerProvider` and `TRACE_PROCESSOR.tracingBackend`), so running
// this more than once in a single Node test would overwrite the first setup.
const initTracing = (config: Config): Promise<Observability> =>
  Function.pipe(
    make(),
    addExtension(
      Otel.extensions({
        serviceName: 'composer',
        serviceVersion: DXOS_VERSION,
        environment: 'test',
        config,
        traces: true,
      }),
    ),
    initialize,
    runAndForwardErrors,
  );

describe.skip('tracing invitation e2e (dev-only)', { timeout: 300_000, retry: 0 }, () => {
  test('host + guest complete a DELEGATED space invitation via edge-main (tagged for SigNoz)', async ({ expect }) => {
    const clientTag = process.env.DX_TELEMETRY_TAG;
    expect(clientTag, 'DX_TELEMETRY_TAG must be set').toBeTruthy();
    expect(process.env.DX_OTEL_ENDPOINT, 'DX_OTEL_ENDPOINT must be set').toBeTruthy();
    expect(process.env.DX_OTEL_HEADERS, 'DX_OTEL_HEADERS must be set').toBeTruthy();

    console.log(`### starting tracing-e2e run: client.tag=${clientTag} edge=${EDGE_URL}`);

    const hostConfig = createEdgeConfig();
    const guestConfig = createEdgeConfig();

    // Single observability instance — Node tracer provider is process-global.
    const observability = await initTracing(hostConfig);

    // Use memory transport for peer-to-peer ONLY to dodge the known node-datachannel
    // SIGSEGV when two WebRTC stacks run in the same process
    // (see packages/sdk/client/src/services/local-client-services.ts line 86).
    // Signaling is intentionally NOT overridden: service-host builds EdgeSignalManager
    // from edgeFeatures.signaling=true → real edge signaling is in use.
    const mkServices = (config: Config) =>
      new LocalClientServices({
        config,
        transportFactory: MemoryTransportFactory,
      });

    const host = new Client({ config: hostConfig, services: mkServices(hostConfig) });
    const guest = new Client({ config: guestConfig, services: mkServices(guestConfig) });
    try {
      await host.initialize();
      await guest.initialize();

      await host.halo.createIdentity({ displayName: 'tracing-e2e-host' });
      await guest.halo.createIdentity({ displayName: 'tracing-e2e-guest' });

      // Subscribe identity stream → stamp `did` (+ `deviceKey`/`deviceProfile`) on every span.
      await runAndForwardErrors(observability.addDataProvider(identityProvider(host.services.services)));
      await runAndForwardErrors(observability.addDataProvider(identityProvider(guest.services.services)));

      // Create edge agent on host so the space can be admitted by edge when a
      // DELEGATED invitation arrives.
      console.log('### host: creating edge agent');
      await host.services.services.EdgeAgentService!.createAgent(undefined, { timeout: 15_000 });
      console.log('### host: edge agent created; waiting for HALO feed sync');
      await sleep(15_000);

      console.log('### host: creating space');
      const space = await host.spaces.create();
      await space.waitUntilReady();
      await space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED);
      log.info('host space ready', { spaceId: space.id });

      console.log('### host: waiting for edge to catch up with the space');
      // Pragmatic sleep instead of polling getSyncState — we don't need a strict sync
      // guarantee for the test (trace capture is the point, not admission success).
      await sleep(10_000);

      console.log('### host → guest: DELEGATED invitation + join');
      const [hostResult, guestResult] = await Promise.all(
        performInvitation({
          host: space,
          guest: guest.spaces,
          options: {
            type: Invitation.Type.DELEGATED,
            authMethod: Invitation.AuthMethod.KNOWN_PUBLIC_KEY,
            multiUse: false,
          },
        }),
      );

      // Invitation may end in SUCCESS or a non-success state depending on edge agent trust.
      // The purpose of this test is trace structure, not invitation outcome.
      log.info('invitation result', {
        hostState: hostResult.invitation?.state,
        guestState: guestResult.invitation?.state,
        hostError: hostResult.error?.message,
        guestError: guestResult.error?.message,
      });

      // Let edge return trailing WS/HTTP frames so their spans land in the same export batch.
      await sleep(8_000);
    } finally {
      // BatchSpanProcessor defers export by 5s; flush explicitly before teardown.
      await runAndForwardErrors(observability.flush());

      // `Client.destroy()` can block on in-flight edge replication; cap it so the
      // test doesn't hang if the worker is still finishing a sync round.
      const destroyWithTimeout = (client: Client, label: string) =>
        Promise.race([
          client.destroy().catch((err: Error) => log.catch(err)),
          sleep(15_000).then(() => log.warn(`${label}.destroy() timed out; leaking`)),
        ]);
      await Promise.all([destroyWithTimeout(host, 'host'), destroyWithTimeout(guest, 'guest')]);
      await runAndForwardErrors(observability.close());
    }

    console.log(`### done — SigNoz filter: ctx.tag = '${clientTag}'`);
  });
});
