//
// Copyright 2026 DXOS.org
//

import { describe, test, vi } from 'vitest';

import { waitForCondition } from '@dxos/async';

import { FakeTransport } from '../testing/fake-transport';
import { MediaManager } from './media-manager';
import { TrackNameCodec, type TrackObject } from './types';

const makeRemoteVideoTrack = (): MediaStreamTrack => {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  return canvas.captureStream(1).getVideoTracks()[0];
};

// `getUserMediaTrack` hits real `getUserMedia`, which has no camera/mic in headless CI. Stub only that
// export so enable/disable behavior can be exercised offline.
vi.mock('./util', async (importActual) => {
  const actual = await importActual<typeof import('./util')>();
  const makeVideoTrack = (): MediaStreamTrack => {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    return canvas.captureStream(1).getVideoTracks()[0];
  };
  const makeAudioTrack = (): MediaStreamTrack =>
    new AudioContext().createMediaStreamDestination().stream.getAudioTracks()[0];
  return {
    ...actual,
    getUserMediaTrack: async (kind: 'audioinput' | 'videoinput') =>
      kind === 'videoinput' ? makeVideoTrack() : makeAudioTrack(),
  };
});

describe('MediaManager transport seam', () => {
  test('does not publish a placeholder on join; publishes real media only once enabled', async ({ expect }) => {
    const fake = new FakeTransport();
    const mediaManager = new MediaManager();
    await mediaManager.open();
    await mediaManager.join(fake);

    // RealtimeKit has native enable/disable semantics: nothing is published until the user enables a device
    // (unlike the Cloudflare-Calls-era model that published black-canvas / inaudible placeholders on join).
    await mediaManager.turnVideoOn();
    await waitForCondition({ condition: () => fake.events.length > 0, timeout: 3_000 });
    // The very first publish is the real camera enable — proving join published no placeholder before it.
    expect(fake.events[0]).toMatchObject({ op: 'enable', kind: 'video' });
    expect(fake.published.some((published) => published.track?.kind === 'video')).toBe(true);

    await mediaManager.close();
  });

  test('toggling the camera unpublishes via disable, never republishing a placeholder', async ({ expect }) => {
    const fake = new FakeTransport();
    const mediaManager = new MediaManager();
    await mediaManager.open();
    await mediaManager.join(fake);

    const videoOps = () => fake.events.filter((event) => event.kind === 'video').map((event) => event.op);

    await mediaManager.turnVideoOn();
    await waitForCondition({ condition: () => videoOps().length === 1, timeout: 3_000 });

    await mediaManager.turnVideoOff();
    // Camera-off must map to `disableVideo` — not to publishing the black-canvas placeholder (which would
    // leave the participant `videoEnabled` on the SFU and make the next enable a fragile custom-track swap).
    await waitForCondition({ condition: () => videoOps().length === 2, timeout: 3_000 });

    await mediaManager.turnVideoOn();
    await waitForCondition({ condition: () => videoOps().length === 3, timeout: 3_000 });

    // Clean enable → disable → enable, matching the native `RtkMeeting` path — never `enable → enable → enable`.
    expect(videoOps()).toEqual(['enable', 'disable', 'enable']);

    await mediaManager.close();
  });

  test('caches remote tracks on media-change events and clears them when the peer leaves', async ({ expect }) => {
    const fake = new FakeTransport();
    const mediaManager = new MediaManager();
    await mediaManager.open();
    await mediaManager.join(fake);

    const videoTrack = makeRemoteVideoTrack();
    const trackData: TrackObject = { location: 'remote', sessionId: 'peer-1', trackName: 'video', mid: 'video' };
    const name = TrackNameCodec.encode(trackData);
    const pulledStream = () => mediaManager._getState().pulledVideoStreams[name];

    // Nothing is pulled speculatively: the cache stays empty until the transport signals the track's arrival.
    expect(pulledStream()).toBeUndefined();

    // A media-change event (peer published video) populates the cache synchronously, keyed by the swarm name.
    fake.setRemoteTracks([{ trackData, track: videoTrack }]);
    const stream = pulledStream();
    expect(stream?.getVideoTracks()[0]).toBe(videoTrack);

    // A later event with the same track reuses the same `MediaStream` — so the bound `<video>` never re-binds
    // (no flicker). Reactivity relies on this reference stability.
    fake.setRemoteTracks([{ trackData, track: videoTrack }]);
    expect(pulledStream()).toBe(stream);

    // The peer leaving (empty roster) clears the cached stream.
    fake.setRemoteTracks([]);
    expect(pulledStream()).toBeUndefined();

    await mediaManager.close();
  });

  test('screenshare toggles via the transport screenshare API, never the camera track path', async ({ expect }) => {
    const fake = new FakeTransport();
    fake.screenShareLocalTrack = makeRemoteVideoTrack();
    const mediaManager = new MediaManager();
    await mediaManager.open();
    await mediaManager.join(fake);

    await mediaManager.turnScreenshareOn();
    const state = mediaManager._getState();
    expect(state.screenshareEnabled).toBe(true);
    // Self-view mirrors the RealtimeKit-captured local track, advertised on the swarm as a `screenshare` track.
    expect(state.screenshareTrack).toBe(fake.screenShareLocalTrack);
    expect(state.pushedScreenshareTrack).toMatchObject({ trackName: 'screenshare' });
    // It goes through the dedicated screenshare API — never the camera video slot.
    expect(fake.events.some((event) => event.op === 'enable' && event.kind === 'screenshare')).toBe(true);
    expect(fake.events.some((event) => event.kind === 'video')).toBe(false);

    await mediaManager.turnScreenshareOff();
    expect(mediaManager._getState().screenshareEnabled).toBe(false);
    expect(mediaManager._getState().pushedScreenshareTrack).toBeUndefined();
    expect(fake.events.some((event) => event.op === 'disable' && event.kind === 'screenshare')).toBe(true);

    await mediaManager.close();
  });
});
