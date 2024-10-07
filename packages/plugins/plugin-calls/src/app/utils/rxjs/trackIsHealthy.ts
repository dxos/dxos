//
// Copyright 2024 DXOS.org
//

export const trackIsHealthy = async (track: MediaStreamTrack): Promise<boolean> => {
  console.info('👩🏻‍⚕️ Checking track health...');

  if (track.enabled) {
    // TODO:
    // if (track.kind === "audio") {
    //   test audio stream with web audio api
    // }
    //
    // if (track.kind === "video") {
    //   draw to canvas and check if all black pixels
    // }
  }

  const randomFailuresEnabled = localStorage.getItem('flags.randomTrackFailuresEnabled') === 'true';

  const randomFailure = randomFailuresEnabled && Math.random() < 0.2;

  if (randomFailure) {
    console.log('🎲 Random track failure!');
  }

  const healthy = !track.muted && track.readyState === 'live' && !randomFailure;

  console.info(`👩🏻‍⚕️ track is ${healthy ? 'healthy' : 'unhealthy'}!`);
  return healthy;
};
