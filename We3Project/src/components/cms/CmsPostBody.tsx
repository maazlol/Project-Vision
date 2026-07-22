/**
 * Renders plain-text CMS content safely (no HTML / no dangerouslySetInnerHTML).
 * Paragraphs are split on blank lines; single newlines become <br />.
 */
interface CmsPostBodyProps {
  content: string;
  className?: string;
}

export default function CmsPostBody({ content, className = 'article-content' }: CmsPostBodyProps) {
  const blocks = content
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return <div className={className}><p>No content.</p></div>;
  }

  return (
    <div className={className}>
      {blocks.map((block, i) => {
        const lines = block.split('\n');
        return (
          <p key={i}>
            {lines.map((line, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {line}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
