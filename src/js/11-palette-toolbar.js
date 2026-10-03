      function miniFormat(text, format) {
        const tags = [["obfuscated", "obf"], ["bold", "b"], ["strikethrough", "st"], ["underline", "u"], ["italic", "i"]];
        const opens = tags.filter(([key]) => format[key]).map(([, tag]) => `<${tag}>`).join("");
        const closes = tags.filter(([key]) => format[key]).reverse().map(([, tag]) => `</${tag}>`).join("");
        return `${opens}${escapeMini(text)}${closes}`;
      }

      /* =========================
         Palette
      ========================== */
      let activeCategory = localStorage.getItem(STORAGE_KEYS.paletteCategory) || "Vanilla";
      let collapsedCategories = new Set();
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.paletteSections) || "[]");
        if (Array.isArray(stored)) collapsedCategories = new Set(stored);
      } catch { /* ignore malformed UI preference */ }

      function renderFilters() {
        const counts = colors.reduce((map, color) => map.set(color.category, (map.get(color.category) || 0) + 1), new Map());
        const options = [["all", I18N[language].categories.all, colors.length], ...PALETTE_CATEGORY_ORDER.map((cat) => [cat, I18N[language].categories[cat] || cat, counts.get(cat) || 0])];
        dom.categoryChips.innerHTML = `
          <select id="paletteCategorySelect" class="select" aria-label="Nhóm màu">
            ${options.map(([value, label, count]) => `<option value="${escapeHtml(value)}" ${value === activeCategory ? "selected" : ""}>${escapeHtml(label)} · ${count}</option>`).join("")}
          </select>`;
      }

      function renderPalette() {
        const query = dom.search.value.trim().toLowerCase();
        const filtered = colors.filter((color) => {
          const blob = `${color.category} ${color.role} ${color.hex} ${color.name} ${color.legacy || ""} ${color.usage || ""}`.toLowerCase();
          return (activeCategory === "all" || color.category === activeCategory) && (!query || blob.includes(query));
        });
        if (!filtered.length) {
          dom.paletteList.innerHTML = `<p class="hint">${escapeHtml(t("labels.paletteNone"))}</p>`;
          return;
        }
        const sections = PALETTE_CATEGORY_ORDER.map((category) => ({ category, items: filtered.filter((color) => color.category === category) })).filter((section) => section.items.length);
        dom.paletteList.innerHTML = sections.map(renderPaletteSection).join("");
      }

      function renderPaletteSection({ category, items }) {
        const collapsed = collapsedCategories.has(category);
        const body = category === "Vanilla" ? renderSwatchGrid(items) : renderColorRows(items);
        return `
          <section class="palette-section">
            <button class="palette-section-head" type="button" data-toggle-category="${escapeHtml(category)}" aria-expanded="${!collapsed}">
              <span class="palette-section-chevron">${collapsed ? "▸" : "▾"}</span>
              <span class="palette-section-title">${escapeHtml(I18N[language].categories[category] || category)}</span>
              <span class="palette-section-count">${items.length}</span>
            </button>
            ${collapsed ? "" : `<div class="palette-section-body">${body}</div>`}
          </section>
        `;
      }

      const USAGE_EN = {
        "Veteran": "Veteran", "Member": "Member", "Default": "Default",
        "Thành công": "Success", "Thông tin": "Info", "Cảnh báo": "Warning",
        "Lỗi thông thường": "Regular error", "Ban, đổi pass, lỗi nghiêm trọng": "Ban, password change, critical error",
        "Tên lệnh, keyword": "Command names, keywords", "Mô tả nội dung": "Content description", "Đường kẻ phân cách": "Divider lines"
      };
      function colorUsage(color) {
        return language === "en" ? (USAGE_EN[color.usage] || color.usage) : color.usage;
      }
      // Only claim an exact &-code when the hex really is that vanilla colour.
      function legacyLabel(color) {
        if (!color.legacy) return "";
        const exact = colors.some((c) => c.category === "Vanilla" && c.legacy === color.legacy && cleanHex(c.hex) === cleanHex(color.hex));
        return exact ? color.legacy : `≈${color.legacy}`;
      }

      function renderSwatchGrid(items) {
        return `<div class="swatch-grid">${items.map((color) => `
          <div class="swatch-slot color-card" tabindex="0" role="button" data-hex="${escapeHtml(color.hex)}" style="--swatch:${color.hex};background:${color.hex};color:${contrastText(color.hex)}" title="${escapeHtml(color.role)} · ${escapeHtml(color.hex)}${color.legacy ? ` · ${escapeHtml(legacyLabel(color))}` : ""}">
            <span class="swatch-code">${escapeHtml((color.legacy || "?").slice(1))}</span>
            <button class="swatch-copy" type="button" data-copy="${escapeHtml(color.hex)}" title="${escapeHtml(t("labels.copyHex"))}">⧉</button>
          </div>`).join("")}</div>`;
      }

      function renderColorRows(items) {
        return `<div class="color-rows">${items.map((color) => `
          <article class="color-row color-card" tabindex="0" role="button" data-hex="${escapeHtml(color.hex)}" title="${escapeHtml(colorUsage(color) || color.role)}">
            <span class="swatch-mini" style="background:${color.hex}"></span>
            <span><span class="color-name">${escapeHtml(color.role)}</span><span class="color-meta">${escapeHtml(color.hex)} ${color.legacy ? `· ${escapeHtml(legacyLabel(color))}` : ""}</span></span>
            <button class="copy-icon" type="button" data-copy="${escapeHtml(color.hex)}" title="${escapeHtml(t("labels.copyHex"))}">⧉</button>
          </article>`).join("")}</div>`;
      }

      const VALID_INSERTION_SYNTAXES = new Set(["legacy", "section", "mini", "iridium", "bukkit"]);
      function getInsertionSyntax() {
        const value = dom.sharedSyntaxSelect?.value;
        return VALID_INSERTION_SYNTAXES.has(value) ? value : "legacy";
      }

      function colorCodeForSyntax(hex, syntax) {
        const normalized = cleanHex(hex);
        switch (syntax) {
          case "bukkit": return ampX(normalized);
          case "section": return sectionColorCode(normalized);
          case "mini": return miniColor(normalized);
          case "iridium": return iridiumColor(normalized);
          default: return nearestLegacy(normalized);
        }
      }

      function motdColorCodeForSyntax(hex, syntax) {
        const normalized = cleanHex(hex);
        if (syntax === "bukkit") return ampX(normalized);
        if (syntax === "section") return sectionColorCode(normalized);
        if (syntax === "mini") return miniColor(normalized);
        if (syntax === "iridium") return `<SOLID:${hexBody(normalized)}>`;
        return nearestLegacy(normalized);
      }

      function formatCodeForSyntax(format, syntax) {
        const legacyMap = { bold: "&l", italic: "&o", underline: "&n", strikethrough: "&m", obfuscated: "&k", reset: "&r", linebreak: "\\n" };
        const miniMap = { bold: "<bold>", italic: "<italic>", underline: "<underlined>", strikethrough: "<strikethrough>", obfuscated: "<obfuscated>", reset: "<reset>", linebreak: "<newline>" };
        if (syntax === "mini") return miniMap[format] || "";
        if (syntax === "section") return (legacyMap[format] || "").replace("&", "§");
        return legacyMap[format] || "";
      }

      function renderSharedToolbar() {
        dom.sharedColorToolbar.innerHTML = colors.filter((c) => c.category === "Vanilla").map((color) => {
          const glyph = (color.legacy || "&?").slice(1);
          return `<button class="code-btn" type="button" data-shared-color="${color.hex}" title="${escapeHtml(color.role)} · ${escapeHtml(color.hex)} (${escapeHtml(color.legacy || "")})" style="--code-color:${color.hex}">${escapeHtml(glyph)}</button>`;
        }).join("");
        dom.sharedFormatToolbar.innerHTML = FORMAT_BUTTONS.map((btn) => `
          <button class="code-btn ${btn.className}" type="button" data-shared-format="${btn.format}" title="${escapeHtml(I18N[language].formatTitles[btn.format] || btn.title)}">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="${btn.strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${btn.icon}</svg>
          </button>`).join("");
        dom.sharedAlignmentToolbar.innerHTML = ALIGNMENT_BUTTONS.map((btn) => {
          const titleMap = { left: I18N[language].labels.alignLeft, center: I18N[language].labels.alignCenter, right: I18N[language].labels.alignRight };
          return `<button class="code-btn" type="button" data-motd-align="${btn.value}" title="${escapeHtml(titleMap[btn.value] || btn.title)}" aria-label="${escapeHtml(titleMap[btn.value] || btn.title)}" aria-pressed="false">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${btn.icon}</svg>
          </button>`;
        }).join("");
        dom.sharedAlignmentToolbar.querySelectorAll("[data-motd-align]").forEach((button) => {
          button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            setMotdAlignment(button.dataset.motdAlign);
          });
        });
        updateSyntaxLabel();
        updateAlignmentToolbar();
      }

      function updateSyntaxLabel() {
        if (dom.sharedSyntaxSelect) dom.sharedSyntaxSelect.value = getInsertionSyntax();
        if (dom.paletteSyntaxLabel) dom.paletteSyntaxLabel.textContent = getSyntaxLabel();
      }

      function insertAtCursor(textarea, code) {
        const start = textarea.selectionStart ?? textarea.value.length;
        const end = textarea.selectionEnd ?? textarea.value.length;
        textarea.value = `${textarea.value.slice(0, start)}${code}${textarea.value.slice(end)}`;
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + code.length;
      }

      function insertSharedCode(type, value) {
        const editor = activeEditor();
        const code = type === "color"
          ? (activeViewId() === "motdView" ? motdColorCodeForSyntax(value, getInsertionSyntax()) : colorCodeForSyntax(value, getInsertionSyntax()))
          : formatCodeForSyntax(value, getInsertionSyntax());
        insertAtCursor(editor, code);
        if (editor === dom.textRaw) { textHistory.push(); renderTextOutput(); }
        else { motdHistory.push(); renderMotd(); }
        scheduleSave();
      }

      /* =========================
         Target-aware output conversion
      ========================== */
