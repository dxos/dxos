//
// Copyright 2024 DXOS.org
//

import { PersistentLifecycle } from '@dxos/async';
import { type Context, Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { BulkRequestDispatcher, FIFOScheduler } from './util';
import { type RenegotiationResponse, type TrackObject, type TracksResponse } from '../types';

export type CloudflareCallsConfig = {
  apiExtraParams?: string;
  iceServers?: RTCIceServer[];
  apiBase: string;
};

export type Session = {
  sessionId: string;
  peerConnection: RTCPeerConnection;
};

/**
 * Client for Cloudflare Calls.
 * API: https://developers.cloudflare.com/calls/https-api/
 * Inspired by client from https://github.com/threepointone/partyserver/tree/main/packages/partytracks
 */
export class CloudflareCallsPeer extends Resource {
  private readonly _persistentLifecycle = new PersistentLifecycle<Session>({
    start: () => this._startSession(),
    stop: (session) => this._stopSession(session),
  });

  private readonly _config: CloudflareCallsConfig;

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
  constructor(config: CloudflareCallsConfig) {
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

  // TODO(mykola): Expose session errors.
  get sessionError() {
    return undefined;
  }

  private async _startSession() {
    const peerConnection = await this._createRtcConnection();
    const sessionId = await this._initiateCallSession();
    return { sessionId, peerConnection };
  }

  private async _stopSession(session: Session) {
    session.peerConnection.close();
  }

  private async _createRtcConnection(): Promise<RTCPeerConnection> {
    const peerConnection = new RTCPeerConnection({
      iceServers: this._config.iceServers,
      bundlePolicy: 'max-bundle',
    });
    peerConnection.addEventListener('connectionstatechange', () => {
      if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'closed') {
        log.warn(`Calls connection failed with state ${peerConnection.connectionState}`);
        this._persistentLifecycle.scheduleRestart();
      }
    });

    let iceTimeout = -1;
    peerConnection.addEventListener('iceconnectionstatechange', () => {
      clearTimeout(iceTimeout);
      if (peerConnection.iceConnectionState === 'failed' || peerConnection.iceConnectionState === 'closed') {
        log.warn(`Calls connection to ICEs failed with state ${peerConnection.iceConnectionState}`);
        this._persistentLifecycle.scheduleRestart();
      } else if (peerConnection.iceConnectionState === 'disconnected') {
        // TODO: we should start to inspect the connection stats from here on for
        // any other signs of trouble to guide what to do next (instead of just hoping
        // for the best like we do here for now)
        const timeoutSeconds = 7;
        iceTimeout = window.setTimeout(() => {
          if (peerConnection.iceConnectionState === 'connected') {
            log.info('Calls iceConnectionState is connected');
            return;
          }
          log.warn(
            `Calls iceConnectionState was ${peerConnection.iceConnectionState} for more than ${timeoutSeconds} seconds`,
          );
          this._persistentLifecycle.scheduleRestart();
        }, timeoutSeconds * 1000);
      }
    });

    return peerConnection;
  }

  private async _initiateCallSession() {
    log.debug('🆕 creating new session');
    const { apiBase } = this._config;
    const response = await this._fetch(`${apiBase}/sessions/new?SESSION`, { method: 'POST' });
    if (response.status > 400) {
      throw new Error('Error creating Calls session');
    }

    try {
      const { sessionId } = (await response.clone().json()) as any;
      return sessionId;
    } catch (error) {
      throw new Error(response.status + ': ' + (await response.text()));
    }
  }

  // TODO(mykola): Rename, no history is being recorded here.
  private async _fetch(path: string, requestInit?: RequestInit) {
    const response = await fetch(path, { ...requestInit, redirect: 'manual' });
    // handle Access redirect
    if (response.status === 0) {
      alert('Access session is expired, reloading page.');
      location.reload();
    }
    return response;
  }

  private async _pushTrackInBulk(
    peerConnection: RTCPeerConnection,
    transceiver: RTCRtpTransceiver,
    sessionId: string,
    trackName: string,
  ): Promise<TrackObject | void> {
    log.verbose('📤 pushing track ', trackName);
    const pushedTrackPromise = this.pushTrackDispatcher
      .doBulkRequest({ trackName, transceiver }, (tracks) =>
        this.taskScheduler.schedule(async () => {
          // create an offer
          const offer = await peerConnection.createOffer();
          // Turn on Opus DTX to save bandwidth
          offer.sdp = offer.sdp?.replace('useinbandfec=1', 'usedtx=1;useinbandfec=1');
          // And set the offer as the local description
          await peerConnection.setLocalDescription(offer);

          const requestBody = {
            sessionDescription: {
              sdp: offer.sdp,
              type: 'offer',
            },
            tracks: tracks.map(({ trackName, transceiver }) => ({
              trackName,
              mid: transceiver.mid,
              location: 'local',
            })),
          };
          const response = await this._fetch(`${this._config.apiBase}/sessions/${sessionId}/tracks/new?PUSHING`, {
            method: 'POST',
            body: JSON.stringify(requestBody),
          }).then((res) => res.json() as Promise<TracksResponse>);
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
          log.error('Missing TrackData');
        }
      })
      .catch((err) => {
        log.catch(err);
      });

    this._ctx.onDispose(() => {
      this._closeTrack(peerConnection, transceiver.mid, sessionId).catch((err) => log.catch(err));
    });
    return pushedTrackPromise;
  }

  async pushTrack(
    track: MediaStreamTrack | null,
    encodings: RTCRtpEncodingParameters[] = [],
    previousTrack?: TrackObject,
  ): Promise<TrackObject | undefined> {
    await this.waitUntilOpen();

    invariant(this.session);
    // we want a single id for this connection, but we need to wait for
    // the first track to show up before we can proceed, so we

    if (previousTrack) {
      const transceiver = this.session.peerConnection!.getTransceivers().find((t) => t.mid === previousTrack.mid);
      if (transceiver) {
        void transceiver.sender.replaceTrack(track).catch((err) => log.catch(err));
        return previousTrack;
      }
    }

    if (!track) {
      return undefined;
    }

    const stableId = crypto.randomUUID();

    const transceiver = this.session.peerConnection!.addTransceiver(track!, {
      direction: 'sendonly',
    });
    log.verbose('🌱 creating transceiver!');

    const pushedTrackData = await this._pushTrackInBulk(
      this.session.peerConnection!,
      transceiver,
      this.session.sessionId!,
      stableId,
    );

    invariant(pushedTrackData);

    const parameters = transceiver.sender.getParameters();
    encodings.forEach((encoding, i) => {
      const existing = parameters.encodings[i];
      parameters.encodings[i] = { ...existing, ...encoding };
    });
    transceiver.sender.setParameters(parameters).catch((err) => log.catch(err));

    return pushedTrackData;
  }

  private async _pullTrackInBulk(
    peerConnection: RTCPeerConnection,
    sessionId: string,
    trackData: TrackObject,
  ): Promise<MediaStreamTrack | undefined> {
    let mid = '';
    log.debug('📥 pulling track ', trackData.trackName);
    const pulledTrackPromise = this.pullTrackDispatcher
      .doBulkRequest(trackData, (tracks) =>
        this.taskScheduler.schedule(async () => {
          const newTrackResponse: TracksResponse = await this._fetch(
            `${this._config.apiBase}/sessions/${sessionId}/tracks/new?PULLING`,
            {
              method: 'POST',
              body: JSON.stringify({
                tracks,
              }),
            },
          ).then((res) => res.json() as Promise<TracksResponse>);
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

            const renegotiationResponse = await this._fetch(
              `${this._config.apiBase}/sessions/${sessionId}/renegotiate`,
              {
                method: 'PUT',
                body: JSON.stringify({
                  sessionDescription: {
                    type: 'answer',
                    sdp: peerConnection.currentLocalDescription?.sdp,
                  },
                }),
              },
            ).then((res) => res.json() as Promise<RenegotiationResponse>);
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
          log.catch(new Error('Missing Track Info'));
        }
      });

    this._ctx.onDispose(() => {
      if (mid) {
        log.debug('🔚 Closing pulled track ', trackData.trackName);
        this._closeTrack(peerConnection, mid, sessionId).catch((err) => log.catch(err));
      }
    });

    return pulledTrackPromise as Promise<MediaStreamTrack | undefined>;
  }

  async pullTrack(trackData: TrackObject): Promise<MediaStreamTrack | undefined> {
    await this.waitUntilOpen();

    invariant(this.session);
    return this._pullTrackInBulk(this.session.peerConnection!, this.session.sessionId!, trackData);
  }

  private async _closeTrack(peerConnection: RTCPeerConnection, mid: string | null, sessionId: string) {
    // TODO: Close tracks in bulk
    const { apiBase } = this._config;
    const transceiver = peerConnection.getTransceivers().find((t) => t.mid === mid);
    if (peerConnection.connectionState !== 'connected' || transceiver === undefined) {
      return;
    }
    transceiver.direction = 'inactive';
    // create an offer
    const offer = await peerConnection.createOffer();
    // Turn on Opus DTX to save bandwidth
    offer.sdp = offer.sdp?.replace('useinbandfec=1', 'usedtx=1;useinbandfec=1');
    // And set the offer as the local description
    await peerConnection.setLocalDescription(offer);
    const requestBody = {
      tracks: [{ mid: transceiver.mid }],
      sessionDescription: {
        sdp: peerConnection.localDescription?.sdp,
        type: 'offer',
      },
      force: false,
    };
    const response = await this._fetch(`${apiBase}/sessions/${sessionId}/tracks/close`, {
      method: 'PUT',
      body: JSON.stringify(requestBody),
    }).then((res) => res.json() as Promise<TracksResponse>);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(response.sessionDescription));
  }
}

const resolveTrack = async (
  peerConnection: RTCPeerConnection,
  compare: (t: RTCRtpTransceiver) => boolean,
  timeout = 5000,
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
      // timeout after 5s
      const timeout = setTimeout(() => {
        peerConnection.removeEventListener('connectionstatechange', connectionStateChangeHandler);
        reject(new Error('Connection timeout'));
      }, 5000);
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
