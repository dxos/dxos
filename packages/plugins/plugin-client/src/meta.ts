//
// Copyright 2023 DXOS.org
//

export const CLIENT_PLUGIN = 'dxos.org/plugin/client';

export default {
  id: CLIENT_PLUGIN,
  name: 'Client',
};

const CLIENT_ACTION = `${CLIENT_PLUGIN}/action`;
export enum ClientAction {
  OPEN_SHELL = `${CLIENT_ACTION}/SHELL`,
  CREATE_IDENTITY = `${CLIENT_ACTION}/CREATE_IDENTITY`,
  JOIN_IDENTITY = `${CLIENT_ACTION}/JOIN_IDENTITY`,
  SHARE_IDENTITY = `${CLIENT_ACTION}/SHARE_IDENTITY`,
}
