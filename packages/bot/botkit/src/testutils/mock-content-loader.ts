//
// Copyright 2021 DXOS.org
//

import assert from "assert";
import type { ContentLoader } from "../bot-factory";
import { BotPackageSpecifier } from "../proto/gen/dxos/bot";

export class MockContentLoader implements ContentLoader {
  async download(pkg: BotPackageSpecifier, dir: string): Promise<string> {
    assert(pkg.localPath, "Mock content loader support only local path specifiers.");
    return pkg.localPath;
  };
}
