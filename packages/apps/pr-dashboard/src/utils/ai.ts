export const generateAISummary = async (
  anthropicApiKey: string,
  prTitle: string,
  prDescription: string,
  comments: string[],
): Promise<string> => {
  if (!anthropicApiKey) {
    return 'No API key configured';
  }

  const prompt = `Summarize this GitHub PR in a haiku (5-7-5 syllables). Be creative and capture the essence of the changes.

PR Title: ${prTitle}

PR Description:
${prDescription || 'No description provided'}

Comments:
${comments.slice(0, 10).join('\n---\n') || 'No comments'}

Respond with ONLY the haiku, no explanation.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('AI summary error:', error);
      return 'Failed to generate summary';
    }

    const data = await response.json();
    return data.content[0]?.text || 'No summary generated';
  } catch (error) {
    console.error('AI summary error:', error);
    return 'Error generating summary';
  }
};
