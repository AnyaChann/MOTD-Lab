      function detectSourceSyntax(raw) {
        const text = String(raw ?? "");
        const hasSectionHex = /§[xX](?:§[0-9a-fA-F]){6}/.test(text);
        const hasBukkitHex = /&[xX](?:&[0-9a-fA-F]){6}/.test(text);
        // A literal §x§R§R§G§G§B§B sequence is Raw §, never Bukkit &x.
        // Prefer Raw § even if a mixed source also happens to contain &x.
        if (hasSectionHex) return "section";
        if (hasBukkitHex) return "bukkit";
        // Iridium: <SOLID:RRGGBB>, <GRADIENT:RRGGBB>…</GRADIENT:RRGGBB>, <RAINBOWn>.
        // A bare <rainbow> / <rainbow:phase> (no digits) is MiniMessage, not Iridium.
        if (/<solid:[0-9a-f]{6}>/i.test(text) || /<gradient:[0-9a-f]{6}(?::[0-9a-f]{6})*>/i.test(text) || /<\/gradient:[0-9a-f]{6}>/i.test(text) || /<rainbow\d+>/i.test(text)) return "iridium";
        // &#RRGGBB and #{RRGGBB} are accepted on input but are not one of the export targets.
        if (/&#[0-9a-f]{6}/i.test(text) || /#\{[0-9a-f]{6}\}/i.test(text)) return "hash";
        if (/<(?:#[0-9a-f]{6}|(?:color|colour|c):|gradient:|rainbow|bold\b|italic\b|underlined?\b|strikethrough\b|obfuscated\b|newline\b|reset\b)/i.test(text)) return "mini";
        if (text.includes("§")) return "section";
        if (/(?:^|[^&])&[0-9a-fk-or]/i.test(text)) return "legacy";
        return "plain";
      }

      function defaultStyle() {
        return { color: "#FFFFFF", bold: false, italic: false, underline: false, strikethrough: false, obfuscated: false };
      }

      function averageHex(hexList) {
        if (!hexList.length) return "#FFFFFF";
        const sum = hexList.reduce((acc, hex) => {
          const [r, g, b] = rgb(hex);
          acc[0] += r; acc[1] += g; acc[2] += b;
          return acc;
        }, [0, 0, 0]);
        return "#" + sum.map((v) => Math.round(v / hexList.length).toString(16).padStart(2, "0")).join("");
      }

      // Gradient / rainbow: tokens keep a flat average colour (used by the exporters),
      // and also carry `grad` so the preview can colour each character separately.
      function parseGradientStops(parts, allowNames = false) {
        return parts.map((part) => {
          const value = String(part).trim();
          const named = allowNames ? MINI_COLOR_NAMES[value.toLowerCase()] : null;
          if (named) return named.toUpperCase();
          const hex = value.replace(/^#/, "");
          return /^[0-9a-fA-F]{6}$/.test(hex) ? `#${hex.toUpperCase()}` : null;
        }).filter(Boolean);
      }

      function hsvToHex(h, s, v) {
        const c = v * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = v - c;
        const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
        return "#" + [r, g, b].map((n) => Math.round((n + m) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
      }

      function gradientColorAt(token, index) {
        const grad = token.grad;
        if (!grad) return token.color;
        const position = grad.offset + index;
        if (grad.type === "rainbow") {
          let fraction = grad.total > 1 ? position / grad.total : 0;
          if (grad.reverse) fraction = 1 - fraction;
          fraction = (((fraction + (grad.phase || 0)) % 1) + 1) % 1;
          return hsvToHex(fraction * 360, grad.saturation ?? 1, grad.value ?? 1);
        }
        const stops = grad.stops;
        if (!stops || stops.length < 2) return stops?.[0] || token.color;
        if (grad.algo === "iridium") {
          // IridiumColorAPI truncates the per-channel step to an integer, so the last
          // character stops slightly short of the end colour; mirror that for accuracy.
          const step = Math.max(grad.total, 2);
          const from = rgb(stops[0]);
          const to = rgb(stops[1]);
          return "#" + from.map((a, k) => (a + Math.trunc(Math.abs(a - to[k]) / (step - 1)) * position * (a < to[k] ? 1 : -1)).toString(16).padStart(2, "0")).join("").toUpperCase();
        }
        const t = grad.total > 1 ? position / (grad.total - 1) : 0;
        const scaled = Math.min(Math.max(t, 0), 1) * (stops.length - 1);
        const i = Math.min(Math.floor(scaled), stops.length - 2);
        const local = scaled - i;
        const a = rgb(stops[i]);
        const b = rgb(stops[i + 1]);
        return "#" + a.map((from, k) => Math.round(from + (b[k] - from) * local).toString(16).padStart(2, "0")).join("").toUpperCase();
      }

      function parseUniversal(raw) {
        const text = String(raw);
        const tokens = [];
        const controls = [];
        let nextControlId = 1;
        let style = defaultStyle();
        const stack = [];
        const persistent = new Set();
        let buffer = "";
        let bufferStart = 0;

        const currentControlIds = () => [
          ...persistent,
          ...stack.map((item) => item.controlId).filter(Boolean)
        ];

        const addControl = (label, kind, start, end, paired = false) => {
          const control = {
            id: nextControlId++,
            label,
            kind,
            start,
            openEnd: end,
            end: text.length,
            closeStart: null,
            closeEnd: null,
            paired,
            text: ""
          };
          controls.push(control);
          return control;
        };

        const closePersistent = (end) => {
          for (const id of [...persistent]) {
            const control = controls.find((item) => item.id === id);
            if (control) control.end = Math.max(control.openEnd, end);
            persistent.delete(id);
          }
        };

        const closeStackAt = (index, start, end, explicit = false) => {
          const item = stack[index];
          if (!item) return;
          const control = controls.find((entry) => entry.id === item.controlId);
          if (control) {
            control.end = end;
            if (explicit) {
              control.closeStart = Math.max(control.openEnd, start);
              control.closeEnd = end;
            }
          }
          stack.splice(index, 1);
        };

        const closeAll = (end) => {
          closePersistent(end);
          while (stack.length) closeStackAt(stack.length - 1, end, end, false);
        };

        const flush = (endPos) => {
          if (buffer) {
            tokens.push({
              text: buffer,
              ...style,
              sourceStart: bufferStart,
              sourceEnd: endPos,
              controlIds: currentControlIds()
            });
          }
          buffer = "";
          bufferStart = endPos;
        };

        const pushLinebreak = (start, end) => {
          flush(start);
          tokens.push({
            text: "\n",
            ...style,
            linebreak: true,
            sourceStart: start,
            sourceEnd: end,
            controlIds: currentControlIds()
          });
          bufferStart = end;
        };

        const beginPersistent = (label, kind, start, end, nextStyle) => {
          flush(start);
          closePersistent(start);
          const control = addControl(label, kind, start, end, false);
          persistent.add(control.id);
          style = nextStyle;
          bufferStart = end;
        };

        const beginPaired = (label, kind, start, end, tag, nextStyle) => {
          flush(start);
          const control = addControl(label, kind, start, end, true);
          stack.push({ tag, controlId: control.id, prevStyle: style });
          style = nextStyle;
          bufferStart = end;
        };

        for (let i = 0; i < text.length;) {
          const char = text[i];
          if (char === "\n") {
            pushLinebreak(i, i + 1);
            i += 1;
            continue;
          }
          if ((char === "\\" || isSlashNBreak(text, i)) && text[i + 1] === "n") {
            pushLinebreak(i, i + 2);
            i += 2;
            continue;
          }

          if (char === "&" || char === "§") {
            const prefix = char;
            const hexMatch = text.slice(i).match(new RegExp(`^${prefix}[xX](?:${prefix}[0-9a-fA-F]){6}`));
            if (hexMatch) {
              const rawCode = hexMatch[0];
              const digits = rawCode.slice(2).match(new RegExp(`${prefix}[0-9a-fA-F]`, "g")).map((part) => part[1]).join("");
              beginPersistent(rawCode, "legacy-hex", i, i + rawCode.length, { ...defaultStyle(), color: `#${digits.toUpperCase()}` });
              i += rawCode.length;
              continue;
            }
            if (prefix === "&") {
              const hashMatch = text.slice(i).match(/^&#([0-9a-fA-F]{6})/);
              if (hashMatch) {
                beginPersistent(hashMatch[0], "legacy-hex", i, i + 8, { ...defaultStyle(), color: `#${hashMatch[1].toUpperCase()}` });
                i += 8;
                continue;
              }
            }
            const code = (text[i + 1] || "").toLowerCase();
            if (LEGACY_COLOR_MAP[code]) {
              beginPersistent(`${prefix}${code}`, "legacy-color", i, i + 2, { ...defaultStyle(), color: LEGACY_COLOR_MAP[code] });
              i += 2;
              continue;
            }
            if (code === "r") {
              flush(i);
              closeAll(i + 2);
              style = defaultStyle();
              bufferStart = i + 2;
              i += 2;
              continue;
            }
            if (LEGACY_FORMAT_MAP[code]) {
              flush(i);
              const control = addControl(`${prefix}${code}`, `legacy-${LEGACY_FORMAT_MAP[code]}`, i, i + 2, false);
              persistent.add(control.id);
              style = { ...style, [LEGACY_FORMAT_MAP[code]]: true };
              bufferStart = i + 2;
              i += 2;
              continue;
            }
          }

          if (char === "#" && text[i + 1] === "{") {
            const end = text.indexOf("}", i + 2);
            if (end !== -1) {
              const hex = text.slice(i + 2, end);
              if (/^[0-9a-fA-F]{6}$/.test(hex)) {
                beginPersistent(`#{${hex.toUpperCase()}}`, "iridium-solid", i, end + 1, { ...defaultStyle(), color: `#${hex.toUpperCase()}` });
                i = end + 1;
                continue;
              }
            }
          }

          if (char === "<") {
            const end = text.indexOf(">", i + 1);
            if (end !== -1) {
              const rawTag = text.slice(i, end + 1);
              const inner = text.slice(i + 1, end);
              const closing = inner.startsWith("/");
              const body = closing ? inner.slice(1) : inner;
              const name = body.split(":")[0].toLowerCase().trim();

              // Iridium compiles <SOLID>/<GRADIENT>/<RAINBOW> to §x§r§r§g§g§b§b, and a colour code clears
              // bold/italic/etc. (as the #{hex} form above already does), so none of them inherit formatting.
              if (!closing && name === "solid") {
                const hex = body.split(":")[1] || "";
                if (/^[0-9a-fA-F]{6}$/.test(hex)) {
                  beginPersistent(rawTag, "iridium-solid", i, end + 1, { ...defaultStyle(), color: `#${hex.toUpperCase()}`, gradId: null });
                  i = end + 1;
                  continue;
                }
              }
              if (!closing && name === "gradient") {
                const stops = parseGradientStops(body.split(":").slice(1));
                if (stops.length) {
                  const avg = averageHex(stops).toUpperCase();
                  beginPaired(rawTag, "iridium-gradient", i, end + 1, "iridium-gradient", { ...defaultStyle(), color: avg, gradId: nextControlId });
                  controls[controls.length - 1].gradient = { type: "gradient", stops, avg };
                  i = end + 1;
                  continue;
                }
              }
              if (!closing && /^rainbow\d*$/i.test(name)) {
                // <RAINBOWn> (Iridium): n is used as both saturation and brightness.
                // <rainbow[:phase][:!]> (MiniMessage): full colour, optional phase / reverse.
                const level = parseInt(name.slice(7), 10);
                const rainbowArgs = body.split(":").slice(1);
                const phase = parseFloat(rainbowArgs.find((part) => /^-?\d*\.?\d+$/.test(part)));
                const strength = Number.isFinite(level) ? Math.min(Math.max(level, 0), 1) : 1;
                beginPaired(rawTag, "iridium-rainbow", i, end + 1, "iridium-rainbow", { ...defaultStyle(), color: "#FF55FF", gradId: nextControlId });
                controls[controls.length - 1].gradient = { type: "rainbow", saturation: strength, value: strength, phase: Number.isFinite(phase) ? phase : 0, reverse: rainbowArgs.includes("!"), avg: "#FF55FF" };
                i = end + 1;
                continue;
              }

              if (closing && (name === "gradient" || /^rainbow\d*$/i.test(name))) {
                const target = name === "gradient" ? "iridium-gradient" : "iridium-rainbow";
                for (let j = stack.length - 1; j >= 0; j -= 1) {
                  if (stack[j].tag === target) {
                    const prevStyle = stack[j].prevStyle;
                    const gradControl = controls.find((entry) => entry.id === stack[j].controlId);
                    if (gradControl?.gradient?.type === "gradient" && gradControl.gradient.stops.length === 1) {
                      gradControl.gradient.stops.push(...parseGradientStops([body.split(":")[1] || ""]));
                      if (gradControl.gradient.stops.length === 2) gradControl.gradient.algo = "iridium";
                    }
                    flush(i);
                    closeStackAt(j, i, end + 1, true);
                    style = prevStyle || defaultStyle();
                    bufferStart = end + 1;
                    i = end + 1;
                    break;
                  }
                }
                if (i === end + 1) continue;
              }

              if (closing) {
                if (name === "reset" || name === "r") {
                  flush(i);
                  closeAll(end + 1);
                  style = defaultStyle();
                  bufferStart = end + 1;
                  i = end + 1;
                  continue;
                }
                let index = -1;
                for (let j = stack.length - 1; j >= 0; j -= 1) {
                  if (stack[j].tag === name) { index = j; break; }
                }
                if (index !== -1) {
                  const prevStyle = stack[index].prevStyle;
                  flush(i);
                  closeStackAt(index, i, end + 1, true);
                  style = prevStyle;
                  bufferStart = end + 1;
                  i = end + 1;
                  continue;
                }
              } else {
                if (name === "newline" || name === "br") {
                  pushLinebreak(i, end + 1);
                  i = end + 1;
                  continue;
                }
                if (name === "reset" || name === "r") {
                  flush(i);
                  closeAll(end + 1);
                  style = defaultStyle();
                  bufferStart = end + 1;
                  i = end + 1;
                  continue;
                }
                if (name === "color" || name === "colour" || name === "c") {
                  const value = (body.split(":")[1] || "").trim().toLowerCase();
                  const resolved = /^#[0-9a-f]{6}$/.test(value) ? value.toUpperCase() : MINI_COLOR_NAMES[value];
                  if (resolved) {
                    beginPaired(rawTag, "mini-color", i, end + 1, name, { ...style, color: resolved, gradId: null });
                    i = end + 1;
                    continue;
                  }
                }
                if (/^#[0-9a-f]{6}$/.test(name)) {
                  beginPaired(rawTag, "mini-color", i, end + 1, name, { ...style, color: name.toUpperCase(), gradId: null });
                  i = end + 1;
                  continue;
                }
                if (MINI_COLOR_NAMES[name]) {
                  beginPaired(rawTag, "mini-color", i, end + 1, name, { ...style, color: MINI_COLOR_NAMES[name], gradId: null });
                  i = end + 1;
                  continue;
                }
                if (MINI_FORMAT_TAGS[name]) {
                  beginPaired(rawTag, `mini-${MINI_FORMAT_TAGS[name]}`, i, end + 1, name, { ...style, [MINI_FORMAT_TAGS[name]]: true });
                  i = end + 1;
                  continue;
                }
                if (name === "gradient" || name === "rainbow") {
                  let nextColor = style.color;
                  let gradient = null;
                  if (name === "gradient") {
                    const stops = parseGradientStops(body.split(":").slice(1), true);
                    if (stops.length) {
                      nextColor = averageHex(stops).toUpperCase();
                      gradient = { type: "gradient", stops, avg: nextColor };
                    }
                  } else {
                    nextColor = "#FF55FF";
                    const args = body.split(":").slice(1);
                    const phase = parseFloat(args.find((part) => /^-?\d*\.?\d+$/.test(part)));
                    gradient = { type: "rainbow", saturation: 1, phase: Number.isFinite(phase) ? phase : 0, reverse: args.includes("!"), avg: nextColor };
                  }
                  beginPaired(rawTag, `mini-${name}`, i, end + 1, name, { ...style, color: nextColor, gradId: gradient ? nextControlId : style.gradId });
                  if (gradient) controls[controls.length - 1].gradient = gradient;
                  i = end + 1;
                  continue;
                }
              }
            }
          }

          buffer += char;
          i += 1;
        }
        flush(text.length);
        for (const control of controls) {
          const source = text.slice(control.start, control.openEnd);
          control.text = source;
          if (control.closeStart == null && control.end === text.length) control.end = text.length;
        }
        for (const control of controls) {
          if (!control.gradient) continue;
          const inside = tokens.filter((token) => !token.linebreak && (token.controlIds || []).includes(control.id));
          const total = inside.reduce((sum, token) => sum + Array.from(token.text || "").length, 0);
          let offset = 0;
          for (const token of inside) {
            if (token.gradId === control.id) token.grad = { ...control.gradient, offset, total };
            offset += Array.from(token.text || "").length;
          }
        }
        Object.defineProperty(tokens, "controls", { value: controls, enumerable: false });
        return tokens;
      }

