//
// Copyright 2022 DXOS.org
//

import path from 'path';
import { TemplateFunction, text, fileExists } from '@dxos/plate';
import { Input } from './index';

const template: TemplateFunction<Input> = async ({ input }) => {
  // const docsReadmeExists = await fileExists(path.resolve(outputDirectory, 'docs/README.md'));
  // const defaultDepDiagramUrl = docsReadmeExists ? './docs/README.md' : '';
  const {
    name,
    description,
    usage,
    install = `pnpm i ${input?.name}`,
    quickStartUrl,
    guideUrl,
    apiReferenceUrl = `https://docs.dxos.org/api/${input?.name}`,
    dependencyDiagramUrl,
    codeCoverageUrl,
    twitter = `dxos_org`,
    issuesUrl = 'https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-issues',
    conductUrl = 'https://github.com/dxos/dxos/blob/main/CODE_OF_CONDUCT.md',
    contributionGuideUrl = 'https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md',
    prGuideUrl = 'https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-prs',
    features,
    diagram,
    badges,
    storybooks,
    background,
    blogUrl,
    roadmapUrl,
    eventsUrl,
    discordUrl,
    stackOverflowTag = 'dxos'
  } = input;

  const section = (header: string, content: string, emitFlag?: any) => {
    return (typeof emitFlag != 'undefined' ? !!emitFlag : !!content?.trim?.()) ? `## ${header}\n${content}\n\n` : '';
  };

  const code = (code: string, lang?: string) => `\`\`\`${lang ?? ''}\n${code}\n\`\`\``;

  return text`
  # ${name}
  ${badges?.length ? badges.join('\n') + '\n' : ''}
  ${description}
  ${section('Background', background)}
  ${section('Installation', code(install, 'bash'), !!install)}
  ${section('Features', features?.map((f) => `- [x] ${f}`).join('\n'), features?.length)}
  ${section('Usage', usage)}
  ${section('Diagram', diagram)}
  ${section(
    'Documentation',
    text`
    ${quickStartUrl && `- [⚡️ Quick Start](${quickStartUrl})`}
    ${guideUrl && `- [📖 Developer Guide](${guideUrl})`}
    ${apiReferenceUrl && `- [📚 API Reference](${apiReferenceUrl})`}
    ${dependencyDiagramUrl && `- [🧩 Dependency Diagram](${dependencyDiagramUrl})`}
    ${codeCoverageUrl && `- [👖 Code coverage report](${codeCoverageUrl})`}`,
    quickStartUrl || guideUrl || apiReferenceUrl || dependencyDiagramUrl || codeCoverageUrl
  )}
  ${section('Storybooks', storybooks?.join('\n\n') + '\n', !!storybooks?.length)}
  ## DXOS Resources
  - [Website](https://dxos.org)
  - [Developer Documentation](https://docs.dxos.org)
  ${blogUrl && `- [Blog](${blogUrl})`}
  ${roadmapUrl && `- [Roadmap](${roadmapUrl})`}
  ${eventsUrl && `- [Events calendar](${eventsUrl})`}
  ${discordUrl && `- Hang out with the community on [Discord](${discordUrl})`}
  ${stackOverflowTag && `- Tag [questions on Stack Overflow](https://stackoverflow.com/questions/tagged/${stackOverflowTag}) with \`#${stackOverflowTag}\``}
  ${twitter && `- Tag us on twitter [\`@${twitter}\`](https://twitter.com/${twitter})`}

  ## Contributions
  Your ideas, issues, and code are most welcome. Please take a look at our [community code of conduct](${conductUrl}), the [issue guide](${issuesUrl}), and the [PR contribution guide](${prGuideUrl}). If you would like to contribute to the design and implementation of DXOS, please [start with the contributor's guide](${contributionGuideUrl}).

  License: [MIT](./LICENSE.md) Copyright 2022 © DXOS
  `;
};

export default template;
