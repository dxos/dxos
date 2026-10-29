//
// Copyright 2026 DXOS.org
//

/**
 * Feeds a browser context's camera and microphone from a pre-recorded video file.
 *
 * Chromium's `--use-file-for-fake-video-capture` applies to the whole process, so every context in one browser
 * would show the same clip. This patches `navigator.mediaDevices` per context instead: `getUserMedia` answers with
 * tracks captured from a hidden `<video>` playing the file, and `enumerateDevices` lists a matching camera and
 * microphone (plugin-calls refuses to call `getUserMedia` for a kind it cannot enumerate). Everything downstream -
 * pushing to the SFU, the speaking monitor, transcription - runs its production path on those tracks.
 *
 * The clip loops its first `leadIn` seconds until `start()` is called on the page (`peer.page.evaluate(() =>
 * window.__fakeMedia.start())`), so several contexts begin a scripted conversation on one cue. Give every
 * participant's file the same silent lead-in and the same length.
 *
 * The browser must launch with `--autoplay-policy=no-user-gesture-required`: no gesture ever reaches the hidden
 * element, and without the flag it never plays. The file must be VP8/VP9 + Opus WebM, because Chromium builds
 * (unlike Chrome) have no H.264/AAC decoder; `conversation.mjs` transcodes to it.
 */

import { readFileSync } from 'node:fs';

/** Same-origin path, so the captured tracks are not tainted by a cross-origin source. */
const ROUTE = '/__fake-media/';

/**
 * Serves a WebM file to the context at a same-origin path and returns that path, e.g. for the `src` of
 * plugin-calls' `SetSimulatedParticipants`.
 *
 * @param {import('playwright').BrowserContext} context
 * @param {{ file: string, name: string }} options
 */
export const serveMedia = async (context, { file, name }) => {
  const body = readFileSync(file);
  await context.route(`**${ROUTE}${name}`, (route) =>
    route.fulfill({ status: 200, body, headers: { 'content-type': 'video/webm', 'accept-ranges': 'none' } }),
  );
  return `${ROUTE}${name}`;
};

/**
 * @param {import('playwright').BrowserContext} context
 * @param {{ file: string, name: string, leadIn?: number }} options `leadIn` in seconds.
 */
export const installFakeMedia = async (context, { file, name, leadIn = 3 }) => {
  const src = await serveMedia(context, { file, name });
  await context.addInitScript(fakeMediaScript, { src, leadIn, label: name });
};

/** Runs in the page before any app code; must be self-contained. */
const fakeMediaScript = ({ src, leadIn, label }) => {
  const mediaDevices = navigator.mediaDevices;
  if (!mediaDevices || globalThis.__fakeMedia) {
    return;
  }

  let source;
  const open = async () => {
    if (source) {
      return source;
    }
    const video = document.createElement('video');
    video.src = src;
    video.loop = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    video.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;';
    document.documentElement.appendChild(video);

    // Route audio through Web Audio rather than the element, so it reaches the track but not the speakers.
    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();
    audioContext.createMediaElementSource(video).connect(destination);

    const state = { started: false };
    video.addEventListener('timeupdate', () => {
      if (!state.started && video.currentTime >= leadIn) {
        video.currentTime = 0;
      }
    });
    await new Promise((resolve, reject) => {
      video.addEventListener('loadeddata', resolve, { once: true });
      video.addEventListener('error', () => reject(new Error(`fake media ${label}: cannot load ${src}`)), {
        once: true,
      });
    });
    await video.play();
    await audioContext.resume();

    const captured = video.captureStream();
    source = { video, audioContext, state, videoTrack: captured.getVideoTracks()[0], audio: destination.stream };
    return source;
  };

  const devices = [
    { kind: 'videoinput', deviceId: 'fake-camera', groupId: 'fake', label: `Fake camera (${label})` },
    { kind: 'audioinput', deviceId: 'fake-microphone', groupId: 'fake', label: `Fake microphone (${label})` },
  ].map((device) => ({ ...device, toJSON: () => device }));

  mediaDevices.enumerateDevices = async () => devices;
  mediaDevices.getUserMedia = async (constraints = {}) => {
    const { videoTrack, audio } = await open();
    const tracks = [];
    if (constraints.video) {
      tracks.push(videoTrack.clone());
    }
    if (constraints.audio) {
      tracks.push(audio.getAudioTracks()[0].clone());
    }
    return new MediaStream(tracks);
  };

  globalThis.__fakeMedia = {
    /** Plays the clip from the top: the end of the lead-in loop and the start of the scripted conversation. */
    start: async () => {
      const { video, state } = await open();
      state.started = true;
      video.loop = false;
      video.currentTime = 0;
      await video.play();
    },
    /** Seconds into the clip, for checking that participants stayed in step. */
    position: () => source?.video.currentTime ?? 0,
  };
};
