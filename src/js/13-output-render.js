      function buildSourceMapControlLookup(tokens) {
        const controls = tokens.controls || [];
        const byId = new Map(controls.map((control) => [control.id, control]));
        for (const control of controls) {
          const affected = tokens.filter((token) => !token.linebreak && token.controlIds?.includes(control.id));
          control.affectedText = affected.map((token) => token.text).join("");
          control.affectedTokenIndexes = tokens
            .map((token, index) => (!token.linebreak && token.controlIds?.includes(control.id)) ? index : -1)
            .filter((index) => index >= 0);
        }
        return byId;
      }

      function renderSourceAnnotated(raw, controls) {
        const markers = [];
        for (const control of controls) {
          markers.push({ start: control.start, end: control.openEnd, id: control.id, position: "open", label: control.label, kind: control.kind });
          if (control.closeStart != null && control.closeEnd != null) {
            markers.push({ start: control.closeStart, end: control.closeEnd, id: control.id, position: "close", label: `/${control.label.replace(/^</, "").replace(/>$/, "")}`, kind: control.kind });
          }
        }
        markers.sort((a, b) => a.start - b.start || b.end - a.end);

        let out = "";
        let cursor = 0;
        for (const marker of markers) {
          if (marker.start < cursor) continue;
          out += escapeHtml(raw.slice(cursor, marker.start));
          const escaped = escapeHtml(raw.slice(marker.start, marker.end));
          out += `<button type="button" class="map-tag ${marker.position === "close" ? "map-tag-close" : ""}" data-map-control="${marker.id}" title="${escapeHtml(marker.label)}">${escaped}</button>`;
          cursor = marker.end;
        }
        out += escapeHtml(raw.slice(cursor));
        return out.replace(/\n/g, '<span class="map-newline">↵</span>\n');
      }

      function renderMappedOutput(tokens) {
        return tokens.map((token, index) => {
          if (token.linebreak) return '<span class="map-render-newline">↵</span><br>';
          const ids = (token.controlIds || []).join(",");
          return `<span class="map-text" data-map-token="${index}" data-map-controls="${ids}" style="color:${token.color};font-weight:${token.bold ? 800 : 400};font-style:${token.italic ? "italic" : "normal"};text-decoration:${cssDecoration(token)}">${token.grad ? Array.from(token.text || "").map((char, k) => `<span style="color:${gradientColorAt(token, k)}">${escapeHtml(char)}</span>`).join("") : escapeHtml(token.text)}</span>`;
        }).join("");
      }

      function selectSourceMapControl(container, controlId) {
        if (!container) return;
        const id = Number(controlId);
        const tokens = container.__sourceMapTokens || [];
        container.__sourceMapSelectedId = id;
        const controls = container.__sourceMapControls || new Map();
        const control = controls.get(id);
        if (!control) return;

        $$("[data-map-control]", container).forEach((el) => el.classList.toggle("selected", Number(el.dataset.mapControl) === id));
        $$("[data-map-token]", container).forEach((el) => {
          const ids = (el.dataset.mapControls || "").split(",").filter(Boolean).map(Number);
          el.classList.toggle("affected", ids.includes(id));
        });

        const inspector = $(".map-inspector", container);
        if (inspector) {
          const visibleBefore = tokens
            .filter((token) => !token.linebreak && token.sourceEnd <= control.openEnd)
            .reduce((total, token) => total + Array.from(token.text || "").length, 0);
          const visibleAffected = Array.from(control.affectedText || "").length;
          const range = visibleAffected > 0
            ? t("labels.affectedRange", { start: visibleBefore + 1, end: visibleBefore + visibleAffected })
            : (language === "en" ? "no visible text" : "không có text hiển thị");
          const affected = control.affectedText || (language === "en" ? "(no visible text after tag)" : "(không có text hiển thị sau tag)");
          inspector.innerHTML = `\
            <div class="map-inspector-title"><span class="map-dot"></span>${escapeHtml(control.label)}</div>\
            <div class="map-inspector-detail"><strong>${escapeHtml(t("labels.affected"))}</strong> ${escapeHtml(range)}</div>\
            <div class="map-inspector-detail"><strong>${escapeHtml(t("labels.text"))}</strong> <span class="map-affected-text">${escapeHtml(affected.slice(0, 180))}${affected.length > 180 ? "…" : ""}</span></div>`;
        }
      }

      function renderInputPreview(container, raw) {
        if (!container) return;
        const normalized = normalizeLinebreaks(raw);
        if (!normalized) {
          container.innerHTML = `<div class="input-preview-empty">${escapeHtml(t("labels.inputMapEmpty"))}</div>`;
          container.__sourceMapTokens = [];
          container.__sourceMapControls = new Map();
          container.__sourceMapSelectedId = null;
          return;
        }
        const tokens = parseUniversal(normalized);
        container.__sourceMapTokens = tokens;
        const controls = tokens.controls || [];
        const previousSelectedId = container.__sourceMapSelectedId;
        const lookup = buildSourceMapControlLookup(tokens);
        container.__sourceMapControls = lookup;
        const knownTags = new Set();
        for (const control of controls) {
          knownTags.add(control.text);
          if (control.closeStart != null && control.closeEnd != null) knownTags.add(normalized.slice(control.closeStart, control.closeEnd));
        }
        const unknownCount = (normalized.match(/<[^>\n]+>/g) || []).filter((tag) => !knownTags.has(tag)).length;
        container.innerHTML = `\
          <div class="map-legend"><span><b>${escapeHtml(t("labels.source"))}</b> · ${escapeHtml(t("labels.mapSourceClick"))}</span><span><b>${escapeHtml(t("labels.rendered"))}</b> · ${escapeHtml(t("labels.mapRenderedClick"))}</span></div>\
          <div class="map-grid">\
            <div class="map-pane"><div class="map-pane-label">${escapeHtml(t("labels.source"))}</div><pre class="map-source">${renderSourceAnnotated(normalized, controls)}</pre></div>\
            <div class="map-pane"><div class="map-pane-label">${escapeHtml(t("labels.rendered"))}</div><div class="map-rendered">${renderMappedOutput(tokens)}</div></div>\
          </div>\
          <div class="map-inspector"><div class="map-inspector-title"><span class="map-dot"></span>${escapeHtml(t("labels.mapSelectTag"))}</div></div>\
          ${unknownCount ? `<div class="map-unknown">${unknownCount} ${escapeHtml(t("labels.unknownTags"))}</div>` : ""}`;
        if (controls.length) {
          const selected = previousSelectedId && lookup.has(previousSelectedId) ? previousSelectedId : controls[0].id;
          selectSourceMapControl(container, selected);
        }
      }

      function formatOutputNoteHtml(note) {
        const phrase = "Hex / gradient / rainbow";
        const escaped = escapeHtml(String(note ?? ""));
        const escapedPhrase = escapeHtml(phrase);
        return escaped.split(escapedPhrase).join(`<span class="format-note-highlight">${escapedPhrase}</span>`);
      }

      // Show the output exactly as it will be copied: keep leading alignment spaces
      // visible and mark real line breaks instead of letting HTML collapse them.
      function renderOutputCode(value) {
        return String(value ?? "").split("\n").map((line) => {
          const match = line.match(/^( +)([\s\S]*)$/);
          return match
            ? `<span class="pad-space">${match[1]}</span>${escapeHtml(match[2])}`
            : escapeHtml(line);
        }).join('<span class="nl-mark">↵</span>');
      }

      function renderColorStyleSwitch(group) {
        const style = OUTPUT_COLOR_STYLES[group];
        if (!style) return "";
        const active = outputColorFormats[style.key];
        return `<span class="color-style-switch" role="group" aria-label="${escapeHtml(t("labels.colorStyle"))}">${style.choices.map(([value, text]) =>
          `<button type="button" class="color-style-btn${value === active ? " active" : ""}" data-color-style="${group}" data-color-style-value="${value}" aria-pressed="${value === active}">${escapeHtml(text)}</button>`).join("")}</span>`;
      }

      function renderOutputLabel(label, note, styleGroup) {
        return `<span class="output-format-label"><span class="format-name">${escapeHtml(label)}</span><small>${formatOutputNoteHtml(note)}</small>${styleGroup ? renderColorStyleSwitch(styleGroup) : ""}</span>`;
      }

      function renderTextOutput() {
        const sourceRaw = String(dom.textRaw.value).replace(/\r\n?/g, "\n");
        const raw = normalizeOutputNewlines(sourceRaw);
        const tokens = parseUniversal(raw);
        renderCharacterSummary(dom.textCharCounter, sourceRaw, tokens);
        renderInputPreview(dom.textInputPreview, sourceRaw);
        updateAlignmentToolbar();
        if (!tokens.length) {
          dom.textPreview.innerHTML = `<span class="hint">${escapeHtml(t("labels.emptyContent"))}</span>`;
          applyPreviewAlignment();
          dom.textOutputs.innerHTML = "";
          return;
        }
        dom.textPreview.innerHTML = tokens.map((token) => token.linebreak ? "<br>" : renderStyledSpan(token)).join("");
        applyPreviewAlignment();

        const outputs = [
          ["Legacy &", serializeForTarget(raw, tokens, "legacy"), conversionNote(raw, "legacy")],
          ["Raw §", serializeForTarget(raw, tokens, "section"), conversionNote(raw, "section")],
          ["Bukkit &x", serializeForTarget(raw, tokens, "bukkit"), conversionNote(raw, "bukkit")],
          ["MiniMessage", serializeForTarget(raw, tokens, "mini"), conversionNote(raw, "mini")],
          ["IridiumColorAPI", serializeForTarget(raw, tokens, "iridium"), conversionNote(raw, "iridium"), "iridium"]
        ];
        dom.textOutputs.innerHTML = `
          <details class="export-details" data-persist-key="textOutputsOpen">
            <summary><span>${escapeHtml(t("labels.outputTargets"))}</span><span class="details-count">${outputs.length}</span></summary>
            <div class="export-list">
              ${outputs.map(([label, value, note, styleGroup]) => `
                <div class="output-row">
                  <strong>${renderOutputLabel(label, note, styleGroup)}</strong>
                  <code class="output-code" title="${escapeHtml(value)}">${renderOutputCode(value)}</code>
                  <button class="btn small" type="button" data-copy="${escapeHtml(value)}" aria-label="${escapeHtml(t("labels.copy"))} ${escapeHtml(label)}">${escapeHtml(t("labels.copy"))}</button>
                </div>`).join("")}
            </div>
          </details>`;
        bindPersistedDetails(dom.textOutputs);
      }

      /* =========================
         MOTD generator / preview
      ========================== */
      const MC_CHAR_WIDTHS = {
        " ": 4, "!": 2, '"': 5, "#": 6, "$": 6, "%": 6, "&": 6, "'": 3, "(": 5, ")": 5, "*": 5, "+": 6, ",": 2, "-": 6, ".": 2, "/": 6,
        "0": 6, "1": 6, "2": 6, "3": 6, "4": 6, "5": 6, "6": 6, "7": 6, "8": 6, "9": 6, ":": 2, ";": 2, "<": 5, "=": 6, ">": 5, "?": 6, "@": 7,
        A: 6, B: 6, C: 6, D: 6, E: 6, F: 6, G: 6, H: 6, I: 4, J: 6, K: 6, L: 6, M: 6, N: 6, O: 6, P: 6, Q: 6, R: 6, S: 6, T: 6, U: 6, V: 6, W: 6, X: 6, Y: 6, Z: 6,
        "[": 4, "\\": 6, "]": 4, "^": 6, "_": 6, "`": 3,
        a: 6, b: 6, c: 6, d: 6, e: 6, f: 5, g: 6, h: 6, i: 2, j: 6, k: 5, l: 3, m: 6, n: 6, o: 6, p: 6, q: 6, r: 6, s: 6, t: 4, u: 6, v: 6, w: 6, x: 6, y: 6, z: 6,
        "{": 5, "|": 2, "}": 5, "~": 7
      };
      const MC_DEFAULT_CHAR_WIDTH = 6;
      const MC_FALLBACK_CHAR_WIDTH = 8;
      const MC_BOLD_EXTRA_WIDTH = 1;

