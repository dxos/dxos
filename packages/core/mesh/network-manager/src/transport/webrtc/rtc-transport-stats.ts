//
// Copyright 2024 DXOS.org
//

import type { TransportStats } from '../transport';

export const describeSelectedRemoteCandidate = async (connection?: RTCPeerConnection): Promise<string> => {
  const stats = connection && (await getRtcConnectionStats(connection));
  const rc = stats?.remoteCandidate;
  if (!rc) {
    return 'unavailable';
  }

  if (rc.candidateType === 'relay') {
    return `${rc.ip}:${rc.port} relay for ${rc.relatedAddress}:${rc.relatedPort}`;
  }

  return `${rc.ip}:${rc.port} ${rc.candidateType}`;
};

export const createRtcTransportStats = async (
  connection: RTCPeerConnection | undefined,
  topic: string,
): Promise<TransportStats> => {
  const stats = connection && (await getRtcConnectionStats(connection, topic));
  if (!stats) {
    return {
      bytesSent: 0,
      bytesReceived: 0,
      packetsSent: 0,
      packetsReceived: 0,
      rawStats: {},
    };
  }

  return {
    bytesSent: stats.dataChannel?.bytesSent,
    bytesReceived: stats.dataChannel?.bytesReceived,
    packetsSent: 0,
    packetsReceived: 0,
    rawStats: stats.raw,
  };
};

const getRtcConnectionStats = async (connection: RTCPeerConnection, channelTopic?: string): Promise<any> => {
  const stats = await connection.getStats();

  const statsEntries: [string, any][] = Array.from((stats as any).entries());
  const transport = statsEntries.find(([_, entry]) => entry.type === 'transport')?.[1];

  const selectedCandidatePair =
    transport && statsEntries.find(([entryId]) => entryId === transport.selectedCandidatePairId)?.[1];
  const remoteCandidate =
    selectedCandidatePair && statsEntries.find(([entryId]) => entryId === selectedCandidatePair.remoteCandidateId)?.[1];

  const dataChannel =
    channelTopic &&
    statsEntries.find(([_, entry]) => entry.type === 'data-channel' && entry.label === channelTopic)?.[1];

  return {
    transport,
    selectedCandidatePair,
    dataChannel,
    remoteCandidate,
    raw: Object.fromEntries(stats as any),
  };
};
