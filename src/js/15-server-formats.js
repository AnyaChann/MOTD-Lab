      function legacyToServerProperties(tokens) {
        const section = serializeTokensToLegacy(tokens, "section");
        let out = "";
        for (let i = 0; i < section.length; ) {
          const cp = section.codePointAt(i);
          const char = String.fromCodePoint(cp);
          i += char.length;
          if (char === "\n") out += "\\n";
          else if (char === "\\") out += "\\\\";
          else if (char === "§") out += "\\u00A7";
          else if (char === "\r") continue;
          else if (cp > 0x7e) out += unicodeEscape(cp);
          else out += char;
        }
        return out;
      }

      // Code points above U+FFFF need a surrogate pair (\uD83D\uDE00), not \u1F600.
      function unicodeEscape(cp) {
        if (cp > 0xFFFF) {
          const offset = cp - 0x10000;
          return `\\u${(0xD800 + (offset >> 10)).toString(16).toUpperCase()}\\u${(0xDC00 + (offset & 0x3FF)).toString(16).toUpperCase()}`;
        }
        return `\\u${cp.toString(16).toUpperCase().padStart(4, "0")}`;
      }

      function yamlDoubleQuoted(value) {
        return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, "\\n");
      }

      function tomlQuoted(value) {
        return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, "\\n");
      }

      // The status ping shows at most two description lines, so extra input lines are never exported.
      const SLP_MAX_DESCRIPTION_LINES = 2;

      function buildServerListPlusOutput(raw) {
        const source = normalizeLinebreaks(raw);
        const lines = source.split("\n").slice(0, SLP_MAX_DESCRIPTION_LINES);
        while (lines.length < SLP_MAX_DESCRIPTION_LINES) lines.push("");
        // ServerListPlus.yml is a multi-document file; the status section is the document tagged
        // "--- !Status", whose top-level keys are Default / Personalized (there is no "Status:" key).
        // A list under Description means random rotation; one entry = one fixed MOTD.
        const head = ["--- !Status", "Default:", "  Description:"];
        // A YAML block scalar auto-detects indentation from its first line, so leading
        // alignment spaces would be swallowed. A quoted scalar keeps them intact.
        if (lines.some((line) => /^ /.test(line))) {
          return [...head, `  - "${yamlDoubleQuoted(lines.join("\n"))}"`].join("\n");
        }
        return [
          ...head,
          "  - |-",
          ...lines.map((line) => (line ? `    ${line}` : ""))
        ].join("\n");
      }

