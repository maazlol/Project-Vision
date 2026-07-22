/**
 * Prepares legacy static HTML fragments for React injection.
 * Still used by About page; Blog/News/Article no longer use static HTML.
 */
export function prepareHtml(raw: string): string {
  let html = raw;

  // Strip everything up to and including the opening <body> tag
  html = html.replace(/^[\s\S]*?<body[^>]*>/i, '');
  // Strip from the closing </body> tag to the end
  html = html.replace(/<\/body>[\s\S]*$/i, '');
  // Remove empty nav/footer placeholder divs (React renders the real Navbar/Footer)
  html = html.replace(/<div id="(?:nav|footer)-placeholder"[^>]*>\s*<\/div>/gi, '');
  // Remove the standalone <footer> (React renders the shared Footer)
  html = html.replace(/<footer[\s\S]*?<\/footer>/gi, '');
  // Remove script tags (Bootstrap JS is loaded globally via index.html)
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  // Rewrite legacy internal page links to React routes
  html = html.replace(/href\s*=\s*["']blog\.html["']/gi, 'href="/blog"');
  html = html.replace(/href\s*=\s*["']news\.html["']/gi, 'href="/news"');
  html = html.replace(/href\s*=\s*["']article(\d)\.html["']/gi, 'href="/blog/article$1"');

  return html;
}
