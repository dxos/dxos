//
// Copyright 2023 DXOS.org
//

import { FunctionContext } from '@dxos/functions';
import { PublicKey } from '@dxos/keys';

type HandlerProps = {
  space: string;
  objects: string[];
};

export default (event: HandlerProps, context: FunctionContext) => {
  // TODO(burdon): client.spaces.get() is a more natural API.
  const space = context.client.getSpace(PublicKey.from(event.space));
  for (const objectId of event.objects) {
    const game = space.db.getObjectById(objectId);
    if (game) {
      // TODO(burdon): Random move.
      console.log('game', game);
    }
  }

  // setTimeout(async () => {
  //   const { Chess } = await import('chess.js');
  //   console.log(Chess);
  // });

  return context.status(200).succeed({});
};
