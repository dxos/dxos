//
// Copyright 2023 DXOS.org
//

import { jwtDecode } from 'jwt-decode';

import { synchronized } from '@dxos/async';
import { type Halo } from '@dxos/client-protocol';
import { type Config } from '@dxos/config';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { type AgentManager, InitAuthSequenceResponse } from '@dxos/protocols/proto/dxos/service/agentmanager';
import { type WebsocketRpcClient } from '@dxos/websocket-rpc';

export type AgentHostingProvider = {
  name: string;
  baseUrl: string;
  username: string;
  password?: string;
};

/**
 * Cannot communicate with, or decode response from hosting provider.
 */
export class ProviderApiError extends Error {}

// TODO: Load from config or dynamically discover
const defaultConfig: AgentHostingProvider = {
  name: 'default',
  baseUrl: 'http://localhost:8082/v1alpha1/',
  username: 'dxos',
};

export interface AgentHostingProviderClient {
  /**
   * Initialize the client, potentially using the authToken to check authorization.
   */

  // TODO: will need to be async?
  init(authToken?: any): boolean;
  createAgent(invitationCode: string, identityKey: string): Promise<string>;
  getAgent(agentID: string): Promise<string | null>;
  destroyAgent(agentID: string): Promise<boolean>;
}

// Interface to REST API to manage agent deployments
// TODO(nf): for now API just simply returns created k8s CRD objects, define backend-agnostic API
const COMPOSER_BETA_COOKIE_NAME = 'COMPOSER-BETA';
const HUB_SERVICE_ACCESS_CAPABILITY = 'agent:beta';
const HUB_SERVICE_ACCESS_MAGIC = 'HubServiceAccessCredential';

export type ComposerBetaJwt = {
  access_token: string;
  auth_app?: number;
  auth_agent?: number;
};

export class AgentManagerClient implements AgentHostingProviderClient {
  private readonly _config: AgentHostingProvider;
  private readonly DXRPC_PATH = 'dxrpc';
  private readonly _wsDxrpcUrl: string;
  private _rpc: WebsocketRpcClient<{ AgentManager: AgentManager }, {}> | undefined;
  private _rpcState: 'connected' | 'disconnected' = 'disconnected';
  private _authToken: string | null = null;

  // TODO(nf): just accept Client instead?
  constructor(
    private readonly _clientConfig: Config,
    private readonly _halo: Halo,
  ) {
    const runtimeAgentHostingConfig = this._clientConfig.get('runtime.services.agentHosting');
    invariant(runtimeAgentHostingConfig, 'agentHosting config not found');
    invariant(runtimeAgentHostingConfig.server, 'agentHosting server not found');
    this._config = {
      ...defaultConfig,
      baseUrl: runtimeAgentHostingConfig.server,
      password: this._clientConfig.get('runtime.app.env.DX_AGENTHOSTING_PASSWORD'),
    };

    // Ensure trailing slash to ensure proper path joining with URL() constructor.
    if (!this._config.baseUrl.endsWith('/')) {
      this._config.baseUrl += '/';
    }
    this._wsDxrpcUrl = new URL(this.DXRPC_PATH, this._config.baseUrl.replace('http', 'ws')).href;
  }

  init(authToken?: any) {
    if (!this._checkAuthorization(authToken)) {
      return false;
    }

    // TODO: AgentHostingContext is currently called 4 times on startup.
    // when this is reduced to one, preemptively open the Websocket connection to decrease the latency of the first RPC call.
    // void this._openRpc();
    return true;
  }

  /**
   * Check auth token/credential from CF worker whether identity is allowed to create agent.
   *
   * Note: This will prevent the client from making unnecessary requests to the AgentHostingProvider API.
   * The AgentHostingProvider will also validate the auth token/credential on its own.
   */

  _checkAuthorization(authToken?: any) {
    const validCookie = this._checkAuthCookie(authToken);
    if (validCookie) {
      log('beta JWT found');
      return true;
    }

    const credential = this._getAuthorizationCredential();
    if (credential) {
      log('beta credential found', { credential });
      return true;
    }

    log('neither JWT nor beta credential found');
    return false;
  }

  _checkAuthCookie(authToken: any) {
    const cookies = Object.fromEntries(
      document.cookie.split('; ').map((v) => v.split(/=(.*)/s).map(decodeURIComponent)),
    );

    if (cookies[COMPOSER_BETA_COOKIE_NAME] == null) {
      return false;
    }

    const composerBetaJwt = this._decodeComposerBetaJwt();

    // The AgentManager server will verify the JWT. This check is just to prevent unnecessary requests.
    if (composerBetaJwt && composerBetaJwt.auth_agent) {
      return true;
    }
    return false;
  }

  // TODO(nf): use asymmetric key to verify token?
  _decodeComposerBetaJwt() {
    const decoded: ComposerBetaJwt = jwtDecode(this._getComposerBetaCookie());
    return decoded;
  }

  _getComposerBetaCookie() {
    const cookies = Object.fromEntries(
      document.cookie.split('; ').map((v) => v.split(/=(.*)/s).map(decodeURIComponent)),
    );

    if (cookies[COMPOSER_BETA_COOKIE_NAME] == null) {
      return null;
    }
    return cookies[COMPOSER_BETA_COOKIE_NAME];
  }

  _getAuthorizationCredential() {
    // TODO: ensure we use the newest credential?
    return this._halo
      .queryCredentials()
      .toSorted((a, b) => b.issuanceDate.getTime() - a.issuanceDate.getTime())
      .find(matchServiceCredential([HUB_SERVICE_ACCESS_CAPABILITY]));
  }

  public requestInitWithCredentials(req: RequestInit): RequestInit {
    return {
      ...req,
      headers: {
        ...req.headers,
        Authorization: 'Basic ' + Buffer.from(`${this._config.username}:${this._config.password}`).toString('base64'),
      },
    };
  }

  public requestInitWithAuthToken(req: RequestInit): RequestInit {
    return {
      ...req,
      headers: {
        ...req.headers,
        Authorization: 'Bearer ' + this._authToken,
      },
    };
  }

  @synchronized
  async _ensureAuthenticated() {
    if (this._validAuthToken()) {
      return;
    }
    const { deviceKey } = this._halo.device!;

    invariant(deviceKey, 'deviceKey not found');
    const authDeviceCreds = await this._queryCredentials('dxos.halo.credentials.AuthorizedDevice', (cred) =>
      PublicKey.equals(cred.subject.id, deviceKey),
    );

    invariant(authDeviceCreds.length === 1, 'Improper number of authorized devices');

    const agentBetaCredential = this._getAuthorizationCredential();
    await this._agentManagerAuth(authDeviceCreds[0], agentBetaCredential);
  }

  async _openRpc() {
    if (this._rpcState === 'connected') {
      return;
    }
    const { WebsocketRpcClient } = await import('@dxos/websocket-rpc');
    this._rpc = new WebsocketRpcClient({
      url: this._wsDxrpcUrl,
      requested: { AgentManager: schema.getService('dxos.service.agentmanager.AgentManager') },
      noHandshake: true,
    });

    this._rpc.connected.on(() => {
      this._rpcState = 'connected';
    });

    this._rpc.disconnected.on(() => {
      this._rpcState = 'disconnected';
    });

    this._rpc.error.on((err) => {
      log.info('rpc error', { err });
      this._rpcState = 'disconnected';
    });
    try {
      await this._rpc.open();
    } catch (err) {
      log.warn('failed to open rpc', { err });
      throw new Error('Failed to open rpc');
    }
  }

  // Authenticate to the agentmanager service using dxrpc and obtain a JWT token for subsequent HTTP requests.
  async _agentManagerAuth(authDeviceCreds: Credential, agentAuthzCredential?: Credential) {
    await this._openRpc();
    invariant(this._rpc, 'RPC not initialized');
    const { result, nonce, agentmanagerKey, initAuthResponseReason } =
      await this._rpc.rpc.AgentManager.initAuthSequence({
        authToken: agentAuthzCredential ? HUB_SERVICE_ACCESS_MAGIC : this._getComposerBetaCookie(),
      });

    if (result !== InitAuthSequenceResponse.InitAuthSequenceResult.SUCCESS || !nonce || !agentmanagerKey) {
      log('auth init failed', { result, nonce, agentmanagerKey, initAuthResponseReason });
      throw new Error('Failed to initialize auth sequence');
    }
    const agentmanagerAccessCreds = await this._queryCredentials('dxos.halo.credentials.ServiceAccess', (cred) =>
      PublicKey.equals(cred.issuer, agentmanagerKey),
    );
    if (!agentmanagerAccessCreds.length) {
      log.info('no access credentials - requesting...');
    } else {
      log.info('access credentials found - requesting session token..');
    }

    const credsToPresent = [authDeviceCreds.id, agentmanagerAccessCreds[0]?.id, agentAuthzCredential?.id].filter(
      Boolean,
    );
    const presentation = await this._halo.presentCredentials({
      ids: credsToPresent as PublicKey[],
      nonce,
    });

    const { token, credential } = await this._rpc.rpc.AgentManager.authenticate({ presentation });
    if (token) {
      this._authToken = token;
      if (!this._validAuthToken()) {
        log('received invalid authToken', { token });
        throw new ProviderApiError('Received invalid authToken');
      }
    } else {
      invariant(credential, 'No credential or token received');
      log('received credential, writing to HALO', { credential });
      await this._halo.writeCredentials([credential]);
      // re-do authentication now that we have a agentmanager serviceAccess credential.
      await this._agentManagerAuth(authDeviceCreds, agentAuthzCredential);
    }
  }

  _validAuthToken() {
    if (!this._authToken) {
      return null;
    }
    const decoded = jwtDecode(this._authToken);
    if (!decoded.exp) {
      log.warn('authToken missing expiry', { decoded });
      return null;
    }
    if (decoded.exp * 1000 < Date.now()) {
      log('authToken expired', { decoded });
      return null;
    }
    return decoded;
  }

  public async _queryCredentials(type?: string, predicate?: (value: Credential) => boolean) {
    // assumes all credentials are already loaded. should client.spaces.isReady.wait()?
    const haloCredentials = this._halo.credentials.get();

    return haloCredentials.filter((cred) => {
      if (type && cred.subject.assertion['@type'] !== type) {
        return false;
      }
      if (predicate && !predicate(cred)) {
        return false;
      }
      return true;
    });
  }

  public async createAgent(invitationCode: string, identityKey: string) {
    await this._ensureAuthenticated();
    const res = await fetch(
      new URL('agent', this._config.baseUrl),
      this.requestInitWithAuthToken({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitation: invitationCode,
          identityKey,
        }),
      }),
    );

    try {
      const agent = await res.json();
      return agent.metadata.uid;
    } catch (err) {
      if (err instanceof TypeError) {
        log.warn('failed to parse response from agent create', { res });
        throw new ProviderApiError('failed to parse response from hosting provider');
      }
      log.warn('bad response from agent create', { res });
      throw new ProviderApiError('bad response from hosting provider');
    }
  }

  public async getAgent(agentID: string) {
    await this._ensureAuthenticated();
    const res = await fetch(
      new URL('agent/' + agentID, this._config.baseUrl),
      this.requestInitWithAuthToken({
        method: 'GET',
      }),
    );
    // TODO(nf): is Sentry logging this and causing the log message?
    switch (res.status) {
      // TODO(nf): other status codes?
      case 200:
        break;
      case 404:
        return null;
      case 401:
        throw new ProviderApiError('unauthorized');
      case 403:
        throw new ProviderApiError('forbidden');
      case 500:
        log.warn('request to agent get failed', { res });
        throw new ProviderApiError('internal server error from hosting provider');
      default:
        log.warn('request to agent get failed', { res });
        throw new ProviderApiError('unknown API error');
    }

    log.info('getAgent', { res });

    try {
      const agent = await res.json();
      return agent.metadata.uid;
    } catch (err) {
      if (err instanceof TypeError) {
        log.warn('failed to parse response from agent get', { err });
        throw new ProviderApiError('failed to parse response from hosting provider');
      }
      log.warn('bad response from agent get', { res });
      throw new ProviderApiError('bad response from hosting provider');
    }
  }

  public async destroyAgent(agentID: string) {
    await this._ensureAuthenticated();
    const res = await fetch(
      new URL('agent/' + agentID, this._config.baseUrl),
      this.requestInitWithAuthToken({
        method: 'DELETE',
      }),
    );

    switch (res.status) {
      // TODO(nf): other status codes?
      case 204:
        return true;
      case 404:
        log.warn('requested destroy on non-existent agent');
        return false;
      case 403:
        throw new ProviderApiError('forbidden');
      case 500:
        log.warn('request to agent destroy failed', { res });
        throw new ProviderApiError('internal server error from hosting provider');
      default:
        log.warn('request to agent destroy failed', { res });
        throw new ProviderApiError('unknown API error');
    }
  }
}

// TODO: match serverName and serverKey

export const matchServiceCredential =
  (capabilities: string[] = []) =>
  (credential: Credential) => {
    if (credential.subject.assertion['@type'] !== 'dxos.halo.credentials.ServiceAccess') {
      return false;
    }

    const { capabilities: credentialCapabilities } = credential.subject.assertion;
    return capabilities.every((capability) => credentialCapabilities.includes(capability));
  };
