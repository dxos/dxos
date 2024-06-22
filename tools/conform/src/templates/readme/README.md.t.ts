//
// Copyright 2022 DXOS.org
//

import { plate } from '@dxos/plate';
import template from './template.t';

export default template.define.text({
  content: ({ input }) => {
    // const docsReadmeExists = await fileExists(path.resolve(outputDirectory, 'docs/README.md'));
    // const defaultDepDiagramUrl = docsReadmeExists ? './docs/README.md' : '';
    const {
      name,
      description,
      banner,
      usage,
      install = `pnpm i ${input?.name}`,
      quickStartUrl,
      guideUrl,
      apiReferenceUrl,
      dependencyDiagramUrl,
      codeCoverageUrl,
      twitter, // = `dxos_org`,
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
      discordUrl = 'https://dxos.org/discord',
      demo,
      stackOverflowTag,
      repoGuideUrl,
    } = input;

    const section = (header: string, content: string, emitFlag?: any) => {
      return (typeof emitFlag != 'undefined' ? !!emitFlag : !!content?.trim?.()) ? `## ${header}\n${content}\n\n` : '';
    };

    const code = (code: string, lang?: string) => `\`\`\`${lang ?? ''}\n${code}\n\`\`\``;

    return plate`
  ${banner}
  # ${name}
  ${badges?.length ? badges.join('\n') + '\n' : ''}
  ${description}
  ${section('Background', background)}
  ${section('Installation', code(install, 'bash'), !!install)}
  ${section('Features', features?.map((f) => `- [x] ${f}`).join('\n'), features?.length)}
  ${section('Usage', usage)}
  ${section('Diagram', diagram)}
  ${section('Demo', demo)}
  ${section(
    'Documentation',
    [
      quickStartUrl && `- [⚡️ Quick Start](${quickStartUrl})`,
      guideUrl && `- [📖 Developer Guide](${guideUrl})`,
      apiReferenceUrl &&
        `- [📚 API Reference](${
          typeof apiReferenceUrl === 'boolean' ? `https://docs.dxos.org/api/${name}` : apiReferenceUrl
        })`,
      dependencyDiagramUrl && `- [🧩 Dependency Diagram](${dependencyDiagramUrl})`,
      codeCoverageUrl && `- [👖 Code coverage report](${codeCoverageUrl})`,
      repoGuideUrl && `- [🔧 Repository Guide](${repoGuideUrl})`,
    ]
      .filter(Boolean)
      .join('\n'),
    quickStartUrl || guideUrl || apiReferenceUrl || dependencyDiagramUrl || codeCoverageUrl || guideUrl,
  )}
  ${section('Storybooks', storybooks?.join('\n\n') + '\n', !!storybooks?.length)}
  ## DXOS Resources
  - [Website](https://dxos.org)
  - [Developer Documentation](https://docs.dxos.org)
  ${[
    blogUrl && `- [Blog](${blogUrl})`,
    roadmapUrl && `- [Roadmap](${roadmapUrl})`,
    eventsUrl && `- [Events calendar](${eventsUrl})`,
    discordUrl && `- Talk to us on [Discord](${discordUrl})`,
    stackOverflowTag &&
      `- Tag [questions on Stack Overflow](https://stackoverflow.com/questions/tagged/${stackOverflowTag}) with \`#${stackOverflowTag}\``,
    twitter && `- Tag us on twitter [\`@${twitter}\`](https://twitter.com/${twitter})`,
  ]
    .filter(Boolean)
    .join('\n')}
  
  ## Contributions
  Your ideas, issues, and code are most welcome. Please take a look at our [community code of conduct](${conductUrl}), the [issue guide](${issuesUrl}), and the [PR contribution guide](${prGuideUrl}).${
      repoGuideUrl
        ? ` To learn about how to set up for development and contribution to DXOS, see the [Repository Guide](${repoGuideUrl})`
        : ''
    }

  License: [MIT](./LICENSE) Copyright 2022 © DXOS
  `;
  },
});
