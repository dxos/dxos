//
// Copyright 2025 DXOS.org
//

export const getScreenshare = async ({ contentHint }: { contentHint: string }) => {
  const ms = await navigator.mediaDevices.getDisplayMedia();
  ms.getVideoTracks().forEach((track) => {
    if (contentHint && 'contentHint' in track) {
      track.contentHint = contentHint;
    }
  });

  return ms;
};
