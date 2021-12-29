//
// Copyright 2021 DXOS.org
//

import type { ContentLoader } from "../bot-factory";
import { BotPackageSpecifier } from "../proto/gen/dxos/bot";

export class MockContentLoader implements ContentLoader {
  async download(pkg: BotPackageSpecifier, dir: string): Promise<string> {
    return pkg.localPath ?? 'bot';
  };
}
