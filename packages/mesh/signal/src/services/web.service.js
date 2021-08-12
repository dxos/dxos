//
// Copyright 2021 DXOS.org
//

import { Kind } from 'graphql';
import { ApolloService } from 'moleculer-apollo-server';
import MoleculerWebService from 'moleculer-web';
import moment from 'moment';

import { SignalServer } from '../signal';

export const WebService = {
  name: 'web',
  mixins: [
    MoleculerWebService,
    ApolloService({
      serverOptions: {
        subscriptions: false
      },
      routeOptions: {
        path: '/api',
        cors: true,
        mappingPolicy: 'restrict'
      },
      typeDefs: [
        'scalar Timestamp',
        'scalar Any'
      ],
      resolvers: {
        Timestamp: {
          __parseValue (value) {
            return moment(value); // value from the client
          },
          __serialize (value) {
            if (typeof value === 'string') {
              return value;
            }
            return value.toISOString(); // value sent to the client
          },
          __parseLiteral (ast) {
            if (ast.kind === Kind.INT) {
              return parseInt(ast.value, 10); // ast value is always in string format
            }

            return null;
          }
        },
        Any: {
          __parseValue (value) {
            return value;
          },
          __serialize (value) {
            return value;
          },
          __parseLiteral (ast) {
            return ast.value;
          }
        }
      }
    })
  ],
  created () {
    this.settings.port = this.broker.metadata.port || 4000;
    this._signal = new SignalServer(this.server, this.broker);
  },
  async started () {
    return this._signal.open();
  },
  async stopped () {
    return this._signal.close();
  }
};
