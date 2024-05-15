//
// Copyright 2024 DXOS.org
//

import { BaseCommand } from '../../base-command';
import { FriendlyError } from '../../errors';

export default class Error extends BaseCommand<typeof Error> {
  static override description = 'Throw error for debugging.';

  async run(): Promise<any> {
    throw new TestError();
  }
}

class TestError extends FriendlyError {
  constructor() {
    super('Test error.');
  }

  get friendlyMessage() {
    return 'Friendly error message.';
  }

  override get hint() {
    return 'Error suggestion.';
  }
}
