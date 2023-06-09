//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Cannot run in browser.
// import { Octokit } from '@octokit/rest';

import { Bot } from '../bot';

/**
 * Sync records with Github.
 */
export class GithubBot extends Bot {
  // private _octokit?: Octokit;

  // TODO(burdon): Get API key from config.
  // https://github.com/settings/tokens
  override async onInit() {
    // this._octokit = new Octokit({
    //   auth: ''
    // });
  }

  async onStart() {}
  async onStop() {}
}
