//
// Copyright 2024 DXOS.org
//

import { PersistentLifecycle } from '@dxos/async';
import { type Context, Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { HistoryCache } from './history-cache';
import { BulkRequestDispatcher, FIFOScheduler } from './task-scheduling';
import {
  type SessionResponse,
  type ErrorResponse,
  type RenegotiationResponse,
  type TrackObject,
  type TracksResponse,
} from '../types';

const NETWORK_TIMEOUT = 5_000;

export type Session = {
  sessionId: string;
  peerConnection: RTCPeerConnection;
};

export type CallsServiceConfig = {
  apiBase: string;
  apiExtraParams?: string;
  iceServers?: RTCIceServer[];
};

export type HistoryRecord =
  | {
      type: 'request';
      time: string;
      method: string;
      body: any;
    }
  | {
      type: 'response';
      time: string;
      status: number;
      text?: string;
      json?: any;
    };

/**
 * Client for Cloudflare Calls service.
 * API: https://developers.cloudflare.com/calls/https-api/
 * Inspired by client from https://github.com/threepointone/partyserver/tree/main/packages/partytracks
 */
// TODO(mykola): Expose session errors.
export class CallsServicePeer extends Resource {
  public readonly history = new HistoryCache<HistoryRecord>(100);

  private readonly _persistentLifecycle = new PersistentLifecycle<Session>({
    start: () => this._startSession(),
    stop: (session) => this._stopSession(session),
  });

  private readonly _config: CallsServiceConfig;

  taskScheduler = new FIFOScheduler();
  pushTrackDispatcher = new BulkRequestDispatcher<
    {
      trackName: string;
      transceiver: RTCRtpTransceiver;
    },
    { tracks: TrackObject[] }
  >(32);

  pullTrackDispatcher = new BulkRequestDispatcher<
    TrackObject,
    {
      trackMap: Map<TrackObject, { resolvedTrack: Promise<MediaStreamTrack>; mid: string }>;
    }
  >(32);

  closeTrackDispatcher = new BulkRequestDispatcher(32);
  constructor(config: CallsServiceConfig) {
    super();
    this._config = config;
  }

  protected override async _open(ctx: Context): Promise<void> {
    await this._persistentLifecycle.open(ctx);
  }

  protected override async _close(): Promise<void> {
    await this._persistentLifecycle.close();
  }

  get session() {
    return this._persistentLifecycle.state;
  }

  private async _startSession() {
    const peerConnection = await this._createRtcConnection();
    const sessionId = await this._initiateCallSession();
    return { sessionId, peerConnection };
  }

  private async _stopSession(session: Session): Promise<void> {
    session.peerConnection.close();
  }

  private async _createRtcConnection(): Promise<RTCPeerConnection> {
    const peerConnection = new RTCPeerConnection({
      iceServers: this._config.iceServers,
      bundlePolicy: 'max-bundle',
    });
    peerConnection.addEventListener('connectionstatechange', () => {
      if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'closed') {
        log.warn('calls connection failed', { state: peerConnection.connectionState });
        void this._persistentLifecycle.scheduleRestart();
      }
    });

    let iceTimeout = -1;
    peerConnection.addEventListener('iceconnectionstatechange', () => {
      clearTimeout(iceTimeout);
      if (peerConnection.iceConnectionState === 'failed' || peerConnection.iceConnectionState === 'closed') {
        log.warn('calls connection to ICEs failed', { state: peerConnection.iceConnectionState });
        void this._persistentLifecycle.scheduleRestart();
      } else if (peerConnection.iceConnectionState === 'disconnected') {
        // TODO(mykola): we should start to inspect the connection stats from here on for
        // any other signs of trouble to guide what to do next (instead of just hoping
        // for the best like we do here for now)
        const timeoutSeconds = 7;
        iceTimeout = window.setTimeout(() => {
          if (peerConnection.iceConnectionState === 'connected') {
            log.info('calls iceConnectionState is connected');
            return;
          }

          log.warn('calls iceConnectionState timed out', { state: peerConnection.iceConnectionState, timeoutSeconds });
          void this._persistentLifecycle.scheduleRestart();
        }, timeoutSeconds * 1_000);
      }
    });

    return peerConnection;
  }

  private async _initiateCallSession(): Promise<string> {
    log('creating new session');
    const { sessionId } = await this._fetch<SessionResponse>('/sessions/new?SESSION', { method: 'POST' });
    return sessionId;
  }

  private async _fetch<T extends ErrorResponse>(relativePath: string, requestInit?: RequestInit): Promise<T> {
    this.history.push({
      type: 'request',
      time: new Date().toISOString(),
      method: requestInit?.method ?? 'GET',
      body: requestInit?.body,
    });
    // TODO(mykola): Handle access control. Use EdgeClient.
    const response = await fetch(`${this._config.apiBase}${relativePath}`, { ...requestInit, redirect: 'manual' });
    if (response.status >= 400) {
      log.error('error while fetching from Calls service', { status: response.status, text: await response.text() });
      throw new Error('Error while fetching from Calls service');
    }

    try {
      const data = (await response.clone().json()) as T;
      this.history.push({
        type: 'response',
        time: new Date().toISOString(),
        status: response.status,
        json: data,
      });
      if (data.errorCode) {
        throw new Error(data.errorDescription);
      }

      return data;
    } catch (error) {
      const text = await response.text();
      this.history.push({
        type: 'response',
        time: new Date().toISOString(),
        status: response.status,
        text,
      });
      log.error('Error parsing response from Calls service', {
        error,
        text,
        status: response.status,
      });
      throw error;
    }
  }

  private async _pushTrackInBulk({
    ctx,
    peerConnection,
    transceiver,
    sessionId,
    trackName,
  }: {
    peerConnection: RTCPeerConnection;
    transceiver: RTCRtpTransceiver;
    sessionId: string;
    trackName: string;
    ctx?: Context;
  }): Promise<TrackObject | void> {
    log.verbose('pushing track ', trackName);
    const pushedTrackPromise = this.pushTrackDispatcher
      .doBulkRequest({ trackName, transceiver }, (tracks) =>
        this.taskScheduler.schedule(async () => {
          // Create offer.
          // Turn on Opus DTX to save bandwidth and set the offer as the local description.
          const offer = await peerConnection.createOffer();
          offer.sdp = offer.sdp?.replace('useinbandfec=1', 'usedtx=1;useinbandfec=1');
          await peerConnection.setLocalDescription(offer);

          const response = await this._fetch<TracksResponse>(`/sessions/${sessionId}/tracks/new?PUSHING`, {
            method: 'POST',
            body: JSON.stringify({
              sessionDescription: {
                sdp: offer.sdp,
                type: 'offer',
              },
              tracks: tracks.map(({ trackName, transceiver }) => ({
                trackName,
                mid: transceiver.mid,
                location: 'local',
              })),
            }),
          });

          invariant(response.tracks !== undefined);
          if (!response.errorCode) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(response.sessionDescription));
            await peerConnectionIsConnected(peerConnection);
          }

          return {
            tracks: response.tracks,
          };
        }),
      )
      .then(({ tracks }) => {
        const trackData = tracks.find((t) => t.mid === transceiver.mid);
        if (trackData) {
          return {
            ...trackData,
            sessionId,
            location: 'remote',
          } satisfies TrackObject;
        } else {
          log.error('missing track data');
        }
      })
      .catch((err) => {
        log.catch(err);
      });

    const onDispose = async () => {
      if (transceiver.mid) {
        await this._closeTrackInBulk(peerConnection, transceiver.mid, sessionId);
      }
    };

    ctx?.onDispose(async () => await onDispose());
    this._ctx.onDispose(() => onDispose());

    return pushedTrackPromise;
  }

  async pushTrack({
    track,
    encodings = [],
    ctx,
    previousTrack,
  }: {
    track: MediaStreamTrack | null;
    encodings?: RTCRtpEncodingParameters[];
    ctx?: Context;
    previousTrack?: TrackObject;
  }): Promise<TrackObject | undefined> {
    await this.waitUntilOpen();
    invariant(this.session);
    log('trying to push track', { track, previousTrack, encodings });
    if (previousTrack) {
      const transceiver = this.session.peerConnection.getTransceivers().find((t) => t.mid === previousTrack.mid);
      if (transceiver?.sender.track === track) {
        log.verbose('track already pushed', { track, previousTrack, transceiver });
        return previousTrack;
      } else if (transceiver) {
        log.verbose('replacing track', { track, previousTrack, transceiver });
        transceiver.sender.replaceTrack(track).catch((err) => log.catch(err));
        return previousTrack;
      }
    }
    invariant(track);

    // We want a single id for this connection.
    const stableId = crypto.randomUUID();
    const transceiver = this.session.peerConnection!.addTransceiver(track, { direction: 'sendonly' });
    log.verbose('creating transceiver');

    const pushedTrackData = await this._pushTrackInBulk({
      ctx,
      peerConnection: this.session.peerConnection!,
      transceiver,
      sessionId: this.session.sessionId!,
      trackName: stableId,
    });
    invariant(pushedTrackData);

    const parameters = transceiver.sender.getParameters();
    encodings.forEach((encoding, i) => {
      const existing = parameters.encodings[i];
      parameters.encodings[i] = { ...existing, ...encoding };
    });
    transceiver.sender.setParameters(parameters).catch((err) => log.catch(err));

    return pushedTrackData;
  }

  // TODO(mykola): Add retry logic if the tracks fails to pull.
  private async _pullTrackInBulk({
    peerConnection,
    sessionId,
    trackData,
    ctx,
  }: {
    peerConnection: RTCPeerConnection;
    sessionId: string;
    trackData: TrackObject;
    ctx?: Context;
  }): Promise<MediaStreamTrack | undefined> {
    let mid = '';
    log('pulling track', { trackName: trackData.trackName });
    const pulledTrackPromise = this.pullTrackDispatcher
      .doBulkRequest(trackData, (tracks) =>
        this.taskScheduler.schedule(async () => {
          const newTrackResponse = await this._fetch<TracksResponse>(`/sessions/${sessionId}/tracks/new?PULLING`, {
            method: 'POST',
            body: JSON.stringify({ tracks }),
          });

          if (newTrackResponse.errorCode) {
            throw new Error(newTrackResponse.errorDescription);
          }

          invariant(newTrackResponse.tracks);
          const trackMap = tracks.reduce((acc, track) => {
            const pulledTrackData = newTrackResponse.tracks?.find(
              (t) => t.trackName === track.trackName && t.sessionId === track.sessionId,
            );

            if (pulledTrackData && pulledTrackData.mid) {
              acc.set(track, {
                mid: pulledTrackData.mid,
                resolvedTrack: resolveTrack(peerConnection, (t) => t.mid === pulledTrackData.mid),
              });
            }

            return acc;
          }, new Map<TrackObject, { resolvedTrack: Promise<MediaStreamTrack>; mid: string }>());

          if (newTrackResponse.requiresImmediateRenegotiation) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(newTrackResponse.sessionDescription));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            const renegotiationResponse = await this._fetch<RenegotiationResponse>(
              `/sessions/${sessionId}/renegotiate`,
              {
                method: 'PUT',
                body: JSON.stringify({
                  sessionDescription: {
                    type: 'answer',
                    sdp: peerConnection.currentLocalDescription?.sdp,
                  },
                }),
              },
            );

            if (renegotiationResponse.errorCode) {
              throw new Error(renegotiationResponse.errorDescription);
            } else {
              await peerConnectionIsConnected(peerConnection);
            }
          }

          return { trackMap };
        }),
      )
      .then(({ trackMap }) => {
        const trackInfo = trackMap.get(trackData);
        if (trackInfo) {
          return trackInfo.resolvedTrack
            .then((track) => {
              mid = trackInfo.mid;
              return track;
            })
            .catch((err) => log.catch(err));
        } else {
          log.error('missing track info');
        }
      });

    const onDispose = async () => {
      if (mid) {
        log('closing pulled track ', trackData.trackName);
        await this._closeTrackInBulk(peerConnection, mid, sessionId);
        mid = '';
      }
    };

    this._ctx.onDispose(() => onDispose());
    ctx?.onDispose(() => onDispose());

    return pulledTrackPromise as Promise<MediaStreamTrack | undefined>;
  }

  async pullTrack({
    ctx,
    trackData,
  }: {
    trackData: TrackObject;
    ctx?: Context;
  }): Promise<MediaStreamTrack | undefined> {
    await this.waitUntilOpen();

    invariant(this.session);
    const session = this.session;
    return this._pullTrackInBulk({
      peerConnection: session.peerConnection,
      sessionId: session.sessionId,
      trackData,
      ctx,
    });
  }

  async _closeTrackInBulk(peerConnection: RTCPeerConnection, mid: string, sessionId: string): Promise<void> {
    const transceiver = peerConnection.getTransceivers().find((t) => t.mid === mid);

    if (peerConnection.connectionState !== 'connected' || transceiver === undefined) {
      return;
    }
    await this.closeTrackDispatcher.doBulkRequest({ mid }, (mids) =>
      this.taskScheduler.schedule(async () => {
        transceiver.stop();
        const activeTransceivers = peerConnection
          .getTransceivers()
          .filter((t) => t.mid !== mid && t.direction !== 'stopped');

        let requestBody;
        if (activeTransceivers.length > 0) {
          // create an offer
          const offer = await peerConnection.createOffer();
          // And set the offer as the local description
          await peerConnection.setLocalDescription(offer);
          requestBody = {
            tracks: mids,
            sessionDescription: {
              sdp: peerConnection.localDescription?.sdp,
              type: 'offer',
            },
            force: false,
          };
        } else {
          requestBody = {
            tracks: mids,
            force: true,
          };
        }

        const response = await this._fetch<TracksResponse>(`/sessions/${sessionId}/tracks/close`, {
          method: 'PUT',
          body: JSON.stringify(requestBody),
        });

        if (requestBody.sessionDescription) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(response.sessionDescription));
        }
      }),
    );
  }
}

const resolveTrack = async (
  peerConnection: RTCPeerConnection,
  compare: (t: RTCRtpTransceiver) => boolean,
  timeout = NETWORK_TIMEOUT,
) =>
  new Promise<MediaStreamTrack>((resolve, reject) => {
    setTimeout(reject, timeout);
    const handler = () => {
      const transceiver = peerConnection.getTransceivers().find(compare);
      if (transceiver) {
        resolve(transceiver.receiver.track);
        peerConnection.removeEventListener('track', handler);
      }
    };

    peerConnection.addEventListener('track', handler);
  });

const peerConnectionIsConnected = async (peerConnection: RTCPeerConnection) => {
  if (peerConnection.connectionState !== 'connected') {
    const connected = new Promise((resolve, reject) => {
      // Timeout after 5s.
      const timeout = setTimeout(() => {
        peerConnection.removeEventListener('connectionstatechange', connectionStateChangeHandler);
        reject(new Error('Connection timeout'));
      }, NETWORK_TIMEOUT);

      const connectionStateChangeHandler = () => {
        if (peerConnection.connectionState === 'connected') {
          peerConnection.removeEventListener('connectionstatechange', connectionStateChangeHandler);
          clearTimeout(timeout);
          resolve(undefined);
        }
      };
      peerConnection.addEventListener('connectionstatechange', connectionStateChangeHandler);
    });

    await connected;
  }
};
