      function styleCodes(segment, prefix = "&") {
        return `${segment.obfuscated ? `${prefix}k` : ""}${segment.bold ? `${prefix}l` : ""}${segment.strikethrough ? `${prefix}m` : ""}${segment.underline ? `${prefix}n` : ""}${segment.italic ? `${prefix}o` : ""}`;
      }

      // Native decoration, only for continuous text runs (Input Preview source map).
      function cssDecoration(format) {
        return [format.underline ? "underline" : "", format.strikethrough ? "line-through" : ""].filter(Boolean).join(" ") || "none";
      }

      // Underline / strikethrough are drawn by CSS pseudo-elements that span the whole
      // fixed-width glyph box. Native text-decoration only covers the glyph's own ink,
      // so with per-character boxes it looked dashed.
      function decorationClasses(format) {
        return `${format.underline ? " mc-u" : ""}${format.strikethrough ? " mc-s" : ""}`;
      }

      function randomizeText(text) {
        return String(text).replace(/\S/g, () => OBFUSCATED_CHARSET[Math.floor(Math.random() * OBFUSCATED_CHARSET.length)]);
      }

      // Single token -> glyph HTML path, shared by the editor preview and the server-list
      // preview. `baseClass` only selects the sizing rules in CSS (editor-glyph / motd-glyph);
      // colour (including per-character gradient), weight, decoration, width and obfuscation
      // are all decided here, so a fix to any of them applies to both previews at once.
      function glyphHtml(char, token, index, baseClass) {
        const style = `color:${gradientColorAt(token, index)};font-weight:${token.bold ? 800 : 400};font-style:${token.italic ? "italic" : "normal"};text-decoration:none;--mc-width:${charPixelWidth(char, token.bold)}`;
        const cls = `${baseClass}${token.obfuscated ? " obf-text" : ""}${decorationClasses(token)}`;
        if (token.obfuscated) return `<span class="${cls}" style="${style}" data-original="${escapeHtml(char)}">${escapeHtml(randomizeText(char))}</span>`;
        return `<span class="${cls}" style="${style}">${escapeHtml(char)}</span>`;
      }

      function renderGlyphRun(token, baseClass) {
        return Array.from(token.text || "").map((char, index) => glyphHtml(char, token, index, baseClass)).join("");
      }

      function renderStyledSpan(token) { return renderGlyphRun(token, "editor-glyph"); }

