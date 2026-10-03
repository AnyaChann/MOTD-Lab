      function charPixelWidth(char, bold) {
        let width;
        if (char in MC_CHAR_WIDTHS) width = MC_CHAR_WIDTHS[char];
        else if ((char.charCodeAt(0) || 0) <= 0xFF) width = MC_DEFAULT_CHAR_WIDTH;
        else width = MC_FALLBACK_CHAR_WIDTH;
        return bold ? width + MC_BOLD_EXTRA_WIDTH : width;
      }

      function splitTokenLines(tokens) {
        const lines = [[]];
        for (const token of tokens) {
          if (token.linebreak) lines.push([]);
          else lines[lines.length - 1].push(token);
        }
        return lines;
      }

      function tokenLineText(tokens) {
        return tokens.map((token) => token.text).join("");
      }

      function renderMotdToken(token) { return renderGlyphRun(token, "motd-glyph"); }

      function renderTokenLine(element, tokens, alignment = "left") {
        element.style.textAlign = "left";
        const tooWide = tokenPixelWidth(tokens) > MC_MOTD_MAX_WIDTH;
        element.classList.toggle("over-limit", tooWide);
        element.title = tooWide ? t("labels.lineTooWide", { max: MC_MOTD_MAX_WIDTH }) : "";
        if (!tokens.length) {
          element.innerHTML = `<span class="placeholder">&nbsp;</span>`;
          return;
        }
        element.innerHTML = tokens.map(renderMotdToken).join("");
      }

      function getMotdTokens() {
        return parseUniversal(normalizeLinebreaks(dom.motdRaw.value));
      }

