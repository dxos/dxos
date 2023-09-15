//
// Copyright 2022 DXOS.org
//

import path from "node:path";

import { directory } from "@dxos/plate";

export type Input = {
  banner: string;
  name: string;
  background: string;
  badges: string[];
  description: string;
  features: string[];
  install: string;
  usage: string;
  demo: string;
  diagram: string;
  storybooks: string[];
  quickStartUrl: string;
  guideUrl: string;
  apiReferenceUrl: string | boolean;
  dependencyDiagramUrl: string;
  codeCoverageUrl: string;
  twitter: string;
  conductUrl: string;
  issuesUrl: string;
  prGuideUrl: string;
  repoGuideUrl: string;
  contributionGuideUrl: string;
  blogUrl: string;
  eventsUrl: string;
  roadmapUrl: string;
  discordUrl: string;
  stackOverflowTag: string;
};

export default directory<Input>({
  src: __filename.endsWith('.ts') ? __dirname : path.resolve(__dirname, '../../../../src/templates/readme'),
});

