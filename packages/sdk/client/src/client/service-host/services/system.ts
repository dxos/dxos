//
// Copyright 2022 DXOS.org
//

import { latch } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { defaultSecretValidator, generatePasscode, SecretProvider } from '@dxos/credentials';
import { raise } from '@dxos/debug';
import { ECHO, EchoNotOpenError, InvitationDescriptor, PartyNotFoundError } from '@dxos/echo-db';
import { SubscriptionGroup } from '@dxos/util';
import assert from 'assert';
import { v4 } from 'uuid';
import { ClientServiceProvider, ClientServices } from '../../../interfaces';
import { Contacts, InvitationState, SubscribeMembersResponse, SubscribePartiesResponse, SubscribePartyResponse } from '../../../proto/gen/dxos/client';
import { encodeInvitation, resultSetToStream } from '../../../util';
import { Config } from '@dxos/config';
import { CreateServicesOpts } from './interfaces';


export const createSystemService = ({config, echo}: CreateServicesOpts): ClientServices['SystemService'] => {
  return {
    GetConfig: async () => {
      return {
        ...config.values,
        build: {
          ...config.values.build,
          timestamp: undefined // TODO(rzadp): Substitution did not kick in here?.
        }
      };
    },
    Reset: async () => {
      await echo.reset();
    }
  };
}
