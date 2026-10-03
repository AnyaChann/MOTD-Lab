      function activeViewId() { return $(".view.active")?.id || "motdView"; }
      function activeEditor() { return activeViewId() === "textView" ? dom.textRaw : dom.motdRaw; }

      function updateHistoryButtons() {
        const textUndo = $("#undoText");
        const textRedo = $("#redoText");
        const motdUndo = $("#undoMotd");
        const motdRedo = $("#redoMotd");
        if (textUndo) textUndo.disabled = !textHistory.canUndo();
        if (textRedo) textRedo.disabled = !textHistory.canRedo();
        if (motdUndo) motdUndo.disabled = !motdHistory.canUndo();
        if (motdRedo) motdRedo.disabled = !motdHistory.canRedo();
      }

      let textRenderFrame = 0;
      let motdRenderFrame = 0;

      function scheduleTextRender() {
        cancelAnimationFrame(textRenderFrame);
        textRenderFrame = requestAnimationFrame(() => {
          textRenderFrame = 0;
          renderTextOutput();
        });
      }

      function scheduleMotdRender() {
        cancelAnimationFrame(motdRenderFrame);
        motdRenderFrame = requestAnimationFrame(() => {
          motdRenderFrame = 0;
          renderMotd();
        });
      }

      /* =========================
         Formatting / parser
      ========================== */
      const LEGACY_COLOR_MAP = Object.fromEntries(colors.filter((c) => c.category === "Vanilla" && c.legacy).map((c) => [c.legacy.slice(1).toLowerCase(), c.hex]));
      const MINI_COLOR_NAMES = Object.fromEntries(colors.filter((c) => c.category === "Vanilla" && c.mini).map((c) => [c.mini, c.hex]));
      const LEGACY_FORMAT_MAP = { k: "obfuscated", l: "bold", m: "strikethrough", n: "underline", o: "italic" };
      const MINI_FORMAT_TAGS = { bold: "bold", b: "bold", italic: "italic", i: "italic", underlined: "underline", underline: "underline", u: "underline", strikethrough: "strikethrough", st: "strikethrough", obfuscated: "obfuscated", obf: "obfuscated" };

      function normalizeLinebreaks(raw) {
        return String(raw ?? "")
          .replace(/\r\n?/g, "\n")
          .replace(/\\n/g, "\n")
          .replace(/\/n(?![a-z])/g, (match, offset, whole) => (isSlashNBreak(whole, offset) ? "\n" : match));
      }

      // "/n" is a line break only when it follows whitespace, a colour code, a closing tag,
      // another line break, or the start of the text - and is not directly followed by a
      // lowercase letter. Commands and URL paths ("&a/nick", "play.com/news", "Line1/nLine2")
      // therefore stay as text. Use "\n", <newline> or Enter for every other case.
      function isSlashNBreak(text, index) {
        if (text[index] !== "/" || text[index + 1] !== "n") return false;
        if (/[a-z]/.test(text[index + 2] || "")) return false;
        const before = text.slice(0, index);
        if (before === "") return true;
        if (/(?:\s|\\n|<[^<>\n]*>|#\{[0-9a-f]{6}\}|&#[0-9a-f]{6}|[&§][0-9a-fk-or])$/i.test(before)) return true;
        return before.endsWith("/n") && isSlashNBreak(text, index - 2);
      }

