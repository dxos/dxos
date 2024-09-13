//
// Copyright 2024 DXOS.org
//

export const chooseInitiatorPeer = (peer1Key: string, peer2Key: string) => (peer1Key < peer2Key ? peer1Key : peer2Key);
