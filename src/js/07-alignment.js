      function getActiveAlignment() {
        return activeViewId() === "textView" ? textAlignment : motdAlignment;
      }

      function updateAlignmentToolbar() {
        const alignment = getActiveAlignment();
        $$("[data-motd-align]").forEach((button) => {
          const active = button.dataset.motdAlign === alignment;
          button.classList.toggle("active", active);
          button.setAttribute("aria-pressed", String(active));
        });
      }

      // Minecraft MOTD has no native left/center/right alignment property, so
      // alignment is encoded as real leading spaces (4px each) in every source line.
      //  - Generator: bounded by the real server-list text area (MC_MOTD_MAX_WIDTH).
      //  - Editor:    bounded by the live width of its preview box, so it follows the screen.
      // 271px = 305px list row - 32px icon - 2px padding (vanilla ServerSelectionList).
      const MC_MOTD_MAX_WIDTH = 271;
      const MC_ICON_SIZE = 32;
      const MC_ICON_GAP = 3;
      const MOTD_SPACE_WIDTH = 4;
      const EDITOR_MC_SCALE = 2;
      let editorAlignedWidth = null;

      function splitMotdSourceLines(raw) {
        // Returns [line, separator, line, separator, ...]; a "/n" that is not a break stays inside its line.
        const text = String(raw ?? "");
        const parts = [];
        let last = 0;
        const re = /\r\n|\r|\n|\\n|\/n/g;
        let match;
        while ((match = re.exec(text))) {
          if (match[0] === "/n" && !isSlashNBreak(text, match.index)) continue;
          parts.push(text.slice(last, match.index), match[0]);
          last = match.index + match[0].length;
        }
        parts.push(text.slice(last));
        return parts;
      }

      function tokenPixelWidth(tokens) {
        let width = 0;
        for (const token of tokens) {
          if (token.linebreak) continue;
          for (const char of Array.from(String(token.text ?? ""))) width += charPixelWidth(char, Boolean(token.bold));
        }
        return width;
      }

      function getEditorAlignmentWidth() {
        const box = dom.textPreview;
        if (!box || !box.clientWidth) return null;
        const style = getComputedStyle(box);
        const inner = box.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0);
        const scale = parseFloat(style.getPropertyValue("--mc-ui-scale")) || EDITOR_MC_SCALE;
        return Math.max(0, Math.floor(inner / scale) - 1);
      }

      function getAlignmentWidth(isTextEditor) {
        return isTextEditor ? (getEditorAlignmentWidth() ?? MC_MOTD_MAX_WIDTH) : MC_MOTD_MAX_WIDTH;
      }

      // Formatting carries over line breaks, so the width of a line (and of the spaces
      // we insert before it) depends on the style left open by the lines above it.
      function alignLineString(line, alignment = "left", maxWidth = MC_MOTD_MAX_WIDTH, prefix = "") {
        const body = String(line ?? "").replace(/^ +/, "");
        if (alignment === "left" || !body.trim() || !maxWidth) return body;

        const trimmed = body.replace(/ +$/, "");
        const tokens = parseUniversal(normalizeLinebreaks(prefix ? `${prefix}\n${trimmed}` : trimmed));
        const lastBreak = tokens.map((token) => Boolean(token.linebreak)).lastIndexOf(true);
        const own = tokens.slice(lastBreak + 1);
        const carried = lastBreak > 0 ? tokens.slice(0, lastBreak).filter((token) => !token.linebreak).pop() : null;
        const unit = MOTD_SPACE_WIDTH + (carried?.bold ? 1 : 0);

        const free = maxWidth - tokenPixelWidth(own);
        const maxSpaces = Math.floor(free / unit);
        if (maxSpaces <= 0) return trimmed;

        const spaces = alignment === "center"
          ? Math.min(maxSpaces, Math.round(free / 2 / unit))
          : maxSpaces;
        return " ".repeat(spaces) + trimmed;
      }

      function applyMotdAlignmentToValue(raw, alignment = "left", maxWidth = MC_MOTD_MAX_WIDTH) {
        const parts = splitMotdSourceLines(raw);
        for (let i = 0; i < parts.length; i += 2) {
          const prefix = parts.slice(0, i).join("");
          parts[i] = alignLineString(parts[i], alignment, maxWidth, prefix);
        }
        return parts.join("");
      }

      // Editor: re-align when the preview width changes (window resize, rotate, tab switch).
      function realignEditorForViewport() {
        if (textAlignment === "left" || activeViewId() !== "textView") return;
        const width = getEditorAlignmentWidth();
        if (width == null || width === editorAlignedWidth) return;
        editorAlignedWidth = width;
        const next = applyMotdAlignmentToValue(dom.textRaw.value, textAlignment, width);
        if (next !== dom.textRaw.value) {
          dom.textRaw.value = next;
          scheduleTextRender();
          scheduleSave();
        }
      }

      // Generator: scale the whole server-list preview so the 271px text area always
      // fits the screen. Alignment stays tied to Minecraft's real limit.
      function fitMotdPreview() {
        const viewport = $(".preview-viewport");
        const preview = $(".motd-preview");
        if (!viewport || !preview || !viewport.clientWidth) return;
        const chrome = 30; // preview padding + border
        const rowWidth = MC_ICON_SIZE + MC_ICON_GAP + MC_MOTD_MAX_WIDTH;
        const scale = (viewport.clientWidth - chrome) / rowWidth;
        const clamped = Math.max(0.8, Math.min(2, Math.floor(scale * 100) / 100));
        preview.style.setProperty("--mc-ui-scale", String(clamped));
      }

      let responsiveFrame = 0;
      function handleViewportChange() {
        fitMotdPreview();
        realignEditorForViewport();
      }
      function installResponsiveObservers() {
        const schedule = () => {
          cancelAnimationFrame(responsiveFrame);
          responsiveFrame = requestAnimationFrame(handleViewportChange);
        };
        window.addEventListener("resize", schedule);
        if ("ResizeObserver" in window) {
          const observer = new ResizeObserver(schedule);
          [$(".preview-viewport"), dom.textPreview].forEach((el) => { if (el) observer.observe(el); });
        }
        schedule();
      }

      function applyPreviewAlignment() {
        // Alignment is encoded in the actual MOTD source now, so the preview
        // must always render the source naturally from the left edge.
        if (dom.textPreview) dom.textPreview.style.textAlign = "left";
        if (dom.motdPreviewLine1) dom.motdPreviewLine1.style.textAlign = "left";
        if (dom.motdPreviewLine2) dom.motdPreviewLine2.style.textAlign = "left";
      }

      function setMotdAlignment(value) {
        if (!["left", "center", "right"].includes(value)) return;
        const isTextEditor = activeViewId() === "textView";
        const editor = isTextEditor ? dom.textRaw : dom.motdRaw;
        const currentValue = editor.value;
        const alignWidth = getAlignmentWidth(isTextEditor);
        if (isTextEditor) editorAlignedWidth = alignWidth;
        const nextValue = applyMotdAlignmentToValue(currentValue, value, alignWidth);
        const changed = nextValue !== currentValue;

        if (isTextEditor) {
          textAlignment = value;
          localStorage.setItem(STORAGE_KEYS.textAlignment, value);
          if (changed) {
            editor.value = nextValue;
            textHistory.push();
          } else {
            updateHistoryButtons();
          }
          updateAlignmentToolbar();
          scheduleTextRender();
        } else {
          motdAlignment = value;
          localStorage.setItem(STORAGE_KEYS.motdAlignment, value);
          if (changed) {
            editor.value = nextValue;
            motdHistory.push();
          } else {
            updateHistoryButtons();
          }
          applyPreviewAlignment();
          updateAlignmentToolbar();
          scheduleMotdRender();
        }
        scheduleSave();
      }

      const textHistory = new History({
        capture: () => ({ value: dom.textRaw.value, alignment: textAlignment, selectionStart: dom.textRaw.selectionStart ?? dom.textRaw.value.length, selectionEnd: dom.textRaw.selectionEnd ?? dom.textRaw.value.length }),
        restore: (snapshot) => {
          dom.textRaw.value = snapshot.value;
          textAlignment = ["left", "center", "right"].includes(snapshot.alignment) ? snapshot.alignment : "left";
          localStorage.setItem(STORAGE_KEYS.textAlignment, textAlignment);
          updateAlignmentToolbar();
          scheduleTextRender();
          scheduleSave();
          requestAnimationFrame(() => {
            dom.textRaw.focus();
            dom.textRaw.selectionStart = Math.min(snapshot.selectionStart, dom.textRaw.value.length);
            dom.textRaw.selectionEnd = Math.min(snapshot.selectionEnd, dom.textRaw.value.length);
          });
        },
        equals: (a, b) => a.value === b.value && a.alignment === b.alignment,
        onChange: updateHistoryButtons
      });

      const motdHistory = new History({
        capture: () => ({ value: dom.motdRaw.value, alignment: motdAlignment, selectionStart: dom.motdRaw.selectionStart ?? dom.motdRaw.value.length, selectionEnd: dom.motdRaw.selectionEnd ?? dom.motdRaw.value.length }),
        restore: (snapshot) => {
          dom.motdRaw.value = snapshot.value;
          motdAlignment = ["left", "center", "right"].includes(snapshot.alignment) ? snapshot.alignment : "left";
          updateAlignmentToolbar();
          scheduleMotdRender();
          scheduleSave();
          requestAnimationFrame(() => {
            dom.motdRaw.focus();
            dom.motdRaw.selectionStart = Math.min(snapshot.selectionStart, dom.motdRaw.value.length);
            dom.motdRaw.selectionEnd = Math.min(snapshot.selectionEnd, dom.motdRaw.value.length);
          });
        },
        equals: (a, b) => a.value === b.value && a.alignment === b.alignment,
        onChange: updateHistoryButtons
      });

