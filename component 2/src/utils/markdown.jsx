import { sanitizeAssistantContent } from './ai';

export function renderInlineMarkdown(text) {
  return text
    .split(/(`[^`]+`|\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`'))
        return <code key={i}>{part.slice(1, -1)}</code>;
      if (part.startsWith('**') && part.endsWith('**'))
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      return part;
    });
}

export function renderMessage(content) {
  const lines = sanitizeAssistantContent(content).split('\n');
  const blocks = [];
  let codeLines = [];
  let listItems = [];
  let numberedItems = [];
  let inCodeBlock = false;

  const flushList = () => {
    if (listItems.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`}>
          {listItems.map((item, i) => (
            <li key={i}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
    if (numberedItems.length) {
      blocks.push(
        <ol key={`ol-${blocks.length}`}>
          {numberedItems.map((item, i) => (
            <li key={i}>{renderInlineMarkdown(item)}</li>
          ))}
        </ol>
      );
      numberedItems = [];
    }
  };

  const flushCode = () => {
    if (codeLines.length) {
      blocks.push(
        <pre key={`code-${blocks.length}`}>
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      codeLines = [];
    }
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      flushList();
      if (inCodeBlock) {
        flushCode();
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }
    if (!trimmed) {
      flushList();
      return;
    }
    if (/^#{1,3} /.test(trimmed)) {
      flushList();
      blocks.push(
        <h4 key={`h-${blocks.length}`}>
          {renderInlineMarkdown(trimmed.replace(/^#+\s/, ''))}
        </h4>
      );
      return;
    }
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      numberedItems = [];
      listItems.push(trimmed.slice(2));
      return;
    }
    const num = trimmed.match(/^\d+\.\s+(.+)$/);
    if (num) {
      listItems = [];
      numberedItems.push(num[1]);
      return;
    }
    flushList();
    blocks.push(<p key={`p-${blocks.length}`}>{renderInlineMarkdown(trimmed)}</p>);
  });

  flushList();
  flushCode();
  return blocks;
}
