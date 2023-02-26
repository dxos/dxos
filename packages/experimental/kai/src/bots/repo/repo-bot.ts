//
// Copyright 2023 DXOS.org
//

import { Octokit } from '@octokit/rest';

import { Bot } from '../bot';

export class RepoBot extends Bot {
  private _octokit?: Octokit;

  // TODO(burdon): Get API key from config.
  // https://github.com/settings/tokens
  override async onInit() {
    this._octokit = new Octokit({
      auth: ''
    });
  }

  async onStart() {}
  async onStop() {}
}
