//
// Copyright 2020 DXOS.org
//

import { type Event } from '@dxos/async';
import { schema } from '@dxos/protocols/proto';
import type {
  ContactsService,
  DevicesService,
  EdgeAgentService,
  FeedService,
  IdentityService,
  InvitationsService,
  LoggingService,
  NetworkService,
  SpacesService,
  SystemService,
} from '@dxos/protocols/proto/dxos/client/services';
import type { DevtoolsHost } from '@dxos/protocols/proto/dxos/devtools/host';
import type { QueryService } from '@dxos/protocols/proto/dxos/echo/query';
import type { DataService } from '@dxos/protocols/proto/dxos/echo/service';
import type { AppService, ShellService } from '@dxos/protocols/proto/dxos/iframe';
import { type ServiceBundle, createServiceBundle } from '@dxos/rpc';

import { type ClientServicesRpc } from './service-rpc';

export type { FeedService } from '@dxos/protocols/proto/dxos/client/services';

//
// NOTE: Should contain client/proxy dependencies only.
//

export type ClientServices = {
  SystemService: SystemService;
  NetworkService: NetworkService;
  LoggingService: LoggingService;

  IdentityService: IdentityService;
  InvitationsService: InvitationsService;
  DevicesService: DevicesService;
  SpacesService: SpacesService;

  DataService: DataService;
  QueryService: QueryService;
  FeedService: FeedService;

  ContactsService: ContactsService;
  EdgeAgentService: EdgeAgentService;

  // TODO(burdon): Deprecated.
  DevtoolsHost: DevtoolsHost;
};

/**
 * Provide access to client services definitions and service handler.
 */
export interface ClientServicesProvider {
  /**
   * The connection to the services provider was terminated.
   * This should fire if the services disconnect unexpectedly or during a client reset.
   */
  closed: Event<Error | undefined>;

  /**
   * The underlying service connection was re-established.
   * Fires after all reconnection callbacks have completed.
   */
  reconnected?: Event<void>;

  /**
   * Register a callback to be invoked when services reconnect.
   * The callback should re-establish any RPC streams.
   * Reconnection waits for all callbacks to complete before emitting `reconnected`.
   */
  onReconnect?: (callback: () => Promise<void>) => void;

  /**
   * Effect-native client for all client services, inferred from the effect-rpc definitions.
   * Preferred surface for new consumers; must be re-read after reconnect rather than cached.
   * Effects it produces require only the default runtime and can be run with any `Runtime<never>`.
   */
  rpc: ClientServicesRpc;

  /**
   * @deprecated Prefer {@link rpc}. Promise/`Stream` shaped services derived from {@link rpc}.
   */
  services: Partial<ClientServices>;

  // TODO(burdon): Should take context from parent?
  open(): Promise<unknown>;
  close(): Promise<unknown>;
}

/**
 * Services supported by host.
 */
export const clientServiceBundle = createServiceBundle<ClientServices>({
  SystemService: schema.getService('dxos.client.services.SystemService'),
  NetworkService: schema.getService('dxos.client.services.NetworkService'),
  LoggingService: schema.getService('dxos.client.services.LoggingService'),

  IdentityService: schema.getService('dxos.client.services.IdentityService'),
  QueryService: schema.getService('dxos.echo.query.QueryService'),
  InvitationsService: schema.getService('dxos.client.services.InvitationsService'),
  DevicesService: schema.getService('dxos.client.services.DevicesService'),
  SpacesService: schema.getService('dxos.client.services.SpacesService'),
  DataService: schema.getService('dxos.echo.service.DataService'),
  ContactsService: schema.getService('dxos.client.services.ContactsService'),
  EdgeAgentService: schema.getService('dxos.client.services.EdgeAgentService'),
  FeedService: schema.getService('dxos.client.services.FeedService'),

  // TODO(burdon): Deprecated.
  DevtoolsHost: schema.getService('dxos.devtools.host.DevtoolsHost'),
});

export type AppServiceBundle = {
  AppService: AppService;
};

export const appServiceBundle: ServiceBundle<AppServiceBundle> = {
  AppService: schema.getService('dxos.iframe.AppService'),
};

export type ShellServiceBundle = {
  ShellService: ShellService;
};

export const shellServiceBundle: ServiceBundle<ShellServiceBundle> = {
  ShellService: schema.getService('dxos.iframe.ShellService'),
};
