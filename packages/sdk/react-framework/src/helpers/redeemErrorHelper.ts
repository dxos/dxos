//
// Copyright 2019 DXOS.org
//

export enum RedeemErrorType {
  INVALID_CODE = 'Invalid invitation code.',
  NOT_AUTHORIZED = 'Invitation not authorized.',
  TIMEOUT = 'Timed out.',
  ALREADY_CONNECTED = 'Already connected.'
}

/**
 * @deprecated
 */
export const handleRedeemError = (error: string) => {
  if (error.includes('SyntaxError: Unexpected token') || error.includes('InvalidCharacterError')) {
    return RedeemErrorType.INVALID_CODE;
  } else if (error.includes('ERR_GREET_INVALID_INVITATION')) {
    return RedeemErrorType.NOT_AUTHORIZED;
  } else if (error.includes('ERR_GREET_ALREADY_CONNECTED_TO_SWARM')) {
    return RedeemErrorType.ALREADY_CONNECTED;
  } else if (error.includes('ERR_GREET_CONNECTED_TO_SWARM_TIMEOUT')) {
    return RedeemErrorType.TIMEOUT;
  }

  return error;
};
