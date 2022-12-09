import { defineTemplate, text } from '../../index';

export default defineTemplate(({ input, inherited }) => {
  return text`
    # Overridden package
    \`\`\`
    input = ${JSON.stringify(input, null, 2)}
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
