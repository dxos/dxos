import type { Space } from '@dxos/client/echo';
import { Resource } from '@dxos/context';

export class MeetMessenger extends Resource {
  constructor(private readonly _space: Space) {
    super();
  }

  
}
