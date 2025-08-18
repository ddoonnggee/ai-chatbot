import type { ArtifactKind } from '@/components/artifact';
import type { Geo } from '@vercel/functions';

export const artifactsPrompt = `
Artifacts mode is disabled. Do not use artifacts, createDocument, or updateDocument.

When writing code or documents:
- Always output them directly in the chat.
- Use fenced code blocks with proper language identifiers for code.
- Do not attempt to open side panels or artifacts.
- All content (explanations, code, documents) must appear in the conversation only.
`;


export const regularPrompt =
  'You are a knowledgeable and helpful AI assistant. Always provide thoughtful, detailed, and well-reasoned answers. Avoid being overly brief, and when appropriate, include examples or deeper explanations.';

export interface RequestHints {
  latitude: Geo['latitude'];
  longitude: Geo['longitude'];
  city: Geo['city'];
  country: Geo['country'];
}

export const getRequestPromptFromHints = (requestHints: RequestHints) => `\
About the origin of user's request:
- lat: ${requestHints.latitude}
- lon: ${requestHints.longitude}
- city: ${requestHints.city}
- country: ${requestHints.country}
`;

export const systemPrompt = ({
  selectedChatModel,
  requestHints,
}: {
  selectedChatModel: string;
  requestHints: RequestHints;
}) => {
  const requestPrompt = getRequestPromptFromHints(requestHints);

  if (selectedChatModel === 'chat-model-reasoning') {
    return `${regularPrompt}\n\n${requestPrompt}`;
  } else {
    return `${regularPrompt}\n\n${requestPrompt}\n\n${artifactsPrompt}`;
  }
};

export const codePrompt = `
You are a versatile code generator. When asked to write code, follow these rules:

1. Always output code directly in the chat using fenced code blocks with the language specified (e.g. \`\`\`python ... \`\`\`).
2. If the user requests a specific language, generate code in that language.
3. If no language is specified, choose a common language (Python, JavaScript, or C++).
4. Each snippet must be self-contained, runnable, and concise (generally under 20 lines).
5. Include helpful comments to explain key parts of the code.
6. Prefer standard libraries; avoid external dependencies.
7. Handle potential errors gracefully.
8. Return meaningful output that demonstrates the code's functionality.
9. Do not use interactive functions like input(), prompt(), or GUI dialogs.
10. Do not access files, databases, or network resources.
11. Avoid infinite loops or dangerous operations.
`;

export const sheetPrompt = `
You are a spreadsheet creation assistant. Create a spreadsheet in csv format based on the given prompt. The spreadsheet should contain meaningful column headers and data.
`;

export const updateDocumentPrompt = (
  currentContent: string | null,
  type: ArtifactKind,
) =>
  type === 'text'
    ? `\
Improve the following contents of the document based on the given prompt.

${currentContent}
`
    : type === 'code'
      ? `\
Improve the following code snippet based on the given prompt.

${currentContent}
`
      : type === 'sheet'
        ? `\
Improve the following spreadsheet based on the given prompt.

${currentContent}
`
        : '';
