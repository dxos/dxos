import { ExtensionContext, TeleportExtension } from '@dxos/teleport'
import { FeedWrapper } from '@dxos/feed-store'
import { DeferredTask } from '@dxos/async'
import { ReplicatorService } from '@dxos/protocols/proto/dxos/mesh/teleport/replicator'
import { Context } from '@dxos/context'

export type ReplicationOptions = {
  upload: boolean
}

export class ReplicatorExtension implements TeleportExtension {
  private readonly _ctx = new Context()

  private readonly _announceTask = new DeferredTask(async () => {

  })

  setOptions(options: ReplicationOptions) {}

  addFeed(feed: FeedWrapper<any>) {}

  onOpen(context: ExtensionContext): Promise<void> {
    throw new Error('Method not implemented.');
  }
  onClose(err?: Error | undefined): Promise<void> {
    throw new Error('Method not implemented.');
  }

}

type ServiceBundle = {
  ReplicatorService: ReplicatorService
}