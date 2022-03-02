import { Stream } from '@dxos/codec-protobuf';
import { JoinSwarmRequest, LeaveSwarmRequest, NetworkService, SendDataRequest, SwarmEvent } from '../../../proto/gen/dxos/client'
import { CreateServicesOpts } from './interfaces';

export class NetworkServiceHost implements NetworkService {
  joinSwarm(request: JoinSwarmRequest): Stream<SwarmEvent> {
    return new Stream(({ close }) => {
      close(new Error('Not implemented'));
    })
  };
  async leaveSwarm(request: LeaveSwarmRequest) {
    throw new Error("Not implemented");
  }
  async sendData(request: SendDataRequest) {
    throw new Error("Not implemented");
  }
}

export const createNetworkService = ({ echo }: CreateServicesOpts): NetworkService => {
  return new NetworkServiceHost();
};
