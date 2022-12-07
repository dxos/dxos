import { defineTemplate, text } from '@dxos/plate';

export default defineTemplate(({ input, inherited }) => {
  return text`
    # Overridden package
    \`\`\`
    ${JSON.stringify(input, null, 2)}
    \`\`\`

    inherited output follows
    ---
    ${inherited?.map((f) => {
      return text`
      ## ${f.shortDescription()}
      ${f.content}
      `
    })}
  `;
});
