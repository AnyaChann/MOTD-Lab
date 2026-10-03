      function normalizeOutputNewlines(raw) {
        return normalizeLinebreaks(raw);
      }

      // Exact 16-colour match only (no nearest-colour rounding); used where RGB is allowed but classic codes are preferred.
      function exactLegacyCode(hex) {
        const target = cleanHex(hex).toUpperCase();
        const match = colors.find((color) => color.category === "Vanilla" && color.legacy && color.hex.toUpperCase() === target);
        return match ? match.legacy : null;
      }

      function serializeTokensToLegacy(tokens, mode = "legacy") {
        tokens = expandGradientTokens(tokens);
        const output = [];
        let currentColor = null;
        let currentStyles = { obfuscated: false, bold: false, strikethrough: false, underline: false, italic: false };
        const prefix = mode === "section" ? "§" : "&";
        const getColor = (token) => mode === "bukkit" ? ampX(token.color)
          : mode === "slp" ? (exactLegacyCode(token.color) || ampX(token.color))
          : mode === "slp-hash" ? (exactLegacyCode(token.color) || `&#${hexBody(token.color)}`)
          : mode === "section" ? sectionColorCode(token.color) : nearestLegacy(token.color);
        const styleKeys = ["obfuscated", "bold", "strikethrough", "underline", "italic"];
        for (const token of tokens) {
          if (token.linebreak) { output.push("\n"); currentColor = null; currentStyles = { obfuscated: false, bold: false, strikethrough: false, underline: false, italic: false }; continue; }
          const color = getColor(token);
          const desired = Object.fromEntries(styleKeys.map((key) => [key, Boolean(token[key])]));
          const colorChanged = color !== currentColor;
          const disablingStyle = styleKeys.some((key) => currentStyles[key] && !desired[key]);
          if (colorChanged || disablingStyle) {
            if (!colorChanged && disablingStyle) output.push(`${prefix}r`);
            output.push(color);
            currentColor = color;
            currentStyles = Object.fromEntries(styleKeys.map((key) => [key, false]));
          }
          for (const key of styleKeys) {
            if (desired[key] && !currentStyles[key]) {
              const code = { obfuscated: "k", bold: "l", strikethrough: "m", underline: "n", italic: "o" }[key];
              output.push(`${prefix}${code}`);
              currentStyles[key] = true;
            }
          }
          output.push(String(token.text ?? ""));
        }
        return output.join("");
      }

      /* ---- Gradient-aware serializers ----
         Gradient / rainbow tokens carry `grad`. Tag targets (MiniMessage, Iridium) emit the
         native tag when they can express it; otherwise (and for every legacy / § / &x target)
         the gradient is expanded into one colour per character instead of a flat average. */
      const STYLE_KEYS = ["obfuscated", "bold", "strikethrough", "underline", "italic"];
      const MINI_STYLE_TAGS = { obfuscated: "obf", bold: "b", strikethrough: "st", underline: "u", italic: "i" };
      const LEGACY_STYLE_CODES = { obfuscated: "k", bold: "l", strikethrough: "m", underline: "n", italic: "o" };
      const sameStyle = (a, b) => STYLE_KEYS.every((key) => Boolean(a[key]) === Boolean(b[key]));

      function expandGradientTokens(tokens) {
        const out = [];
        for (const token of tokens) {
          if (!token.grad || token.linebreak) { out.push(token); continue; }
          Array.from(token.text || "").forEach((char, k) => {
            const { grad, gradId, ...rest } = token;
            out.push({ ...rest, text: char, color: gradientColorAt(token, k) });
          });
        }
        return out;
      }

      function splitGradientRuns(tokens) {
        const runs = [];
        for (const token of tokens) {
          const last = runs[runs.length - 1];
          if (token.grad && last && last.gradId === token.gradId) { last.tokens.push(token); continue; }
          if (!token.grad && token.linebreak && last && last.gradId != null && token.gradId === last.gradId) { last.tokens.push(token); continue; }
          if (!token.grad && last && last.gradId == null) { last.tokens.push(token); continue; }
          runs.push({ gradId: token.grad ? token.gradId : null, grad: token.grad || null, tokens: [token] });
        }
        return runs;
      }

      function miniSegment(tokens, withColor) {
        const out = [];
        let previousColor = null;
        let run = null;
        const flush = () => {
          if (!run) return;
          if (withColor && run.color !== previousColor) out.push(miniColor(run.color));
          const on = STYLE_KEYS.filter((key) => run[key]);
          out.push(`${on.map((key) => `<${MINI_STYLE_TAGS[key]}>`).join("")}${escapeMini(run.text)}${on.slice().reverse().map((key) => `</${MINI_STYLE_TAGS[key]}>`).join("")}`);
          previousColor = run.color;
          run = null;
        };
        for (const token of tokens) {
          if (token.linebreak) { flush(); out.push("<newline>"); previousColor = null; continue; }
          if (run && run.color === token.color && sameStyle(run, token)) run.text += String(token.text ?? "");
          else { flush(); run = { ...token, text: String(token.text ?? "") }; }
        }
        flush();
        return out.join("");
      }

      const isPlainRainbow = (g) => g.type === "rainbow" && (g.saturation ?? 1) === 1 && (g.value ?? 1) === 1;

      function serializeTokensToMini(tokens) {
        return splitGradientRuns(tokens).map((run) => {
          const g = run.grad;
          if (!g) return miniSegment(run.tokens, true);
          if (g.type === "gradient" && g.stops.length >= 2) return `<gradient:${g.stops.join(":")}>${miniSegment(run.tokens, false)}</gradient>`;
          if (isPlainRainbow(g) && !(g.phase && g.reverse)) {
            const arg = g.reverse ? ":!" : g.phase ? `:${g.phase}` : "";
            return `<rainbow${arg}>${miniSegment(run.tokens, false)}</rainbow>`;
          }
          return miniSegment(expandGradientTokens(run.tokens), true);
        }).join("");
      }

      const iridiumSolidCode = (hex, style) => (style === "hash" ? `#{${hexBody(hex)}}` : iridiumColor(hex));

      function iridiumSegment(tokens, withColor, solidStyle = "tag") {
        let out = "";
        let previousColor = null;
        let active = {};
        for (const token of tokens) {
          if (token.linebreak) { out += "\n"; previousColor = null; active = {}; continue; }
          const colorChanged = withColor && token.color !== previousColor;
          const disabling = STYLE_KEYS.some((key) => active[key] && !token[key]);
          if (colorChanged || disabling) {
            // A colour code resets formatting in-game, so re-emitting the colour is enough to switch a style off.
            if (withColor) { out += iridiumSolidCode(token.color, solidStyle); previousColor = token.color; }
            active = {};
          }
          for (const key of STYLE_KEYS) {
            if (token[key] && !active[key]) { out += `&${LEGACY_STYLE_CODES[key]}`; active[key] = true; }
          }
          out += String(token.text ?? "");
        }
        return out;
      }

      function serializeTokensToIridium(tokens, solidStyle = "tag") {
        return splitGradientRuns(tokens).map((run) => {
          const g = run.grad;
          if (!g) return iridiumSegment(run.tokens, true, solidStyle);
          const visible = run.tokens.filter((token) => !token.linebreak);
          const uniformStyle = visible.every((token) => sameStyle(token, visible[0]));
          if (uniformStyle && g.type === "gradient" && g.stops.length === 2) {
            const body = iridiumSegment(run.tokens.map((token) => ({ ...token, color: "#FFFFFF" })), false);
            return `<GRADIENT:${g.stops[0].slice(1)}>${body}</GRADIENT:${g.stops[1].slice(1)}>`;
          }
          if (uniformStyle && isPlainRainbow(g) && !g.phase && !g.reverse) {
            return `<RAINBOW1>${iridiumSegment(run.tokens, false)}</RAINBOW>`;
          }
          return iridiumSegment(expandGradientTokens(run.tokens), true, solidStyle);
        }).join("");
      }

      /* Output colour-code styles for targets that accept more than one spelling.
         slpRgb:       "x" -> &x&r&r&g&g&b&b   | "hash" -> &#rrggbb      (ServerListPlus, documented in its wiki)
         iridiumSolid: "tag" -> <SOLID:RRGGBB> | "hash" -> #{RRGGBB}     (IridiumColorAPI) */
      const OUTPUT_COLOR_STYLES = {
        slp: { key: "slpRgb", fallback: "x", choices: [["x", "&x&r&g&b"], ["hash", "&#rrggbb"]] },
        iridium: { key: "iridiumSolid", fallback: "tag", choices: [["tag", "<SOLID:>"], ["hash", "#{rrggbb}"]] }
      };
      let outputColorFormats = { slpRgb: "x", iridiumSolid: "tag" };
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.outputColorFormats) || "null");
        Object.values(OUTPUT_COLOR_STYLES).forEach(({ key, choices }) => {
          if (saved && choices.some(([value]) => value === saved[key])) outputColorFormats[key] = saved[key];
        });
      } catch (error) { /* corrupted value: keep defaults */ }

      function setOutputColorStyle(group, value) {
        const style = OUTPUT_COLOR_STYLES[group];
        if (!style || !style.choices.some(([choice]) => choice === value)) return false;
        outputColorFormats = { ...outputColorFormats, [style.key]: value };
        try { localStorage.setItem(STORAGE_KEYS.outputColorFormats, JSON.stringify(outputColorFormats)); } catch (error) { /* storage unavailable */ }
        return true;
      }

      function serializeForTarget(raw, tokens, target, opts = outputColorFormats) {
        const source = detectSourceSyntax(raw);
        const normalized = normalizeOutputNewlines(raw);
        if (target === "iridium" && source === "iridium") {
          return opts.iridiumSolid === "hash" ? normalized.replace(/<SOLID:([0-9a-f]{6})>/gi, (match, hex) => `#{${hex}}`) : normalized;
        }
        if ((target === "mini" && source === "mini") ||
            (target === "section" && source === "section") || (target === "legacy" && source === "legacy") ||
            (target === "bukkit" && source === "bukkit")) {
          return normalized;
        }
        // Text with no colour/format at all stays plain instead of gaining an explicit white colour code.
        if (source === "plain" && tokens.every((token) => token.linebreak || (token.color === "#FFFFFF" && !token.grad && STYLE_KEYS.every((key) => !token[key])))) {
          return target === "mini" ? escapeMini(normalized).replace(/\n/g, "<newline>") : normalized;
        }
        // ServerListPlus (v3.5.0+) understands &c codes and RGB as &x&r&r&g&g&b&b / &#rrggbb:
        // keep classic codes where the colour is exact and RGB (gradients included) everywhere else.
        if (target === "slp") {
          const hash = opts.slpRgb === "hash";
          return source === "legacy" || (source === "bukkit" && !hash) ? normalized : serializeTokensToLegacy(tokens, hash ? "slp-hash" : "slp");
        }
        if (target === "mini") return serializeTokensToMini(tokens);
        if (target === "iridium") return serializeTokensToIridium(tokens, opts.iridiumSolid === "hash" ? "hash" : "tag");
        if (target === "section") return serializeTokensToLegacy(tokens, "section");
        if (target === "bukkit") return serializeTokensToLegacy(tokens, "bukkit");
        return serializeTokensToLegacy(tokens, "legacy");
      }

      function conversionNote(raw, target) {
        const source = detectSourceSyntax(raw);
        if (source === target) return t("labels.nativeInput");
        if (target === "legacy" || target === "section") return t("labels.legacyConversion");
        if (target === "iridium" || target === "mini") return t("labels.tagConversion");
        if (target === "bukkit") return t("labels.bukkitNote");
        return t("labels.conversionUniversal");
      }

