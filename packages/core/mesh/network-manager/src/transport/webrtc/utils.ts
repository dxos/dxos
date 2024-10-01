//
// Copyright 2024 DXOS.org
//

export const chooseInitiatorPeer = (peer1Key: string, peer2Key: string) => (peer1Key < peer2Key ? peer1Key : peer2Key);

export const areSdpEqual = (sdp1: string, sdp2: string) => {
  const sdp1Lines = deduplicatedSdpLines(sdp1);
  const sdp2Lines = deduplicatedSdpLines(sdp2);
  if (sdp1Lines.length !== sdp2Lines.length) {
    return false;
  }
  return sdp1Lines.every((line, idx) => line === sdp2Lines[idx]);
};

/**
 * For some reason libdatachannel duplicates some attributes after an sdp is set.
 * So the following test might fail:
 * conn.setRemoteDescription(sdp);
 * expect(conn.remoteDescription.sdp).toEqual(sdp);
 */
const deduplicatedSdpLines = (sdp: string) => {
  const deduplicatedLines: string[] = [];
  const seenLines: string[] = [];
  for (const line of sdp.split('\r\n')) {
    if (line.startsWith('m')) {
      seenLines.length = 0;
    }
    if (seenLines.includes(line)) {
      continue;
    }
    seenLines.push(line);
    deduplicatedLines.push(line);
  }
  return deduplicatedLines;
};
