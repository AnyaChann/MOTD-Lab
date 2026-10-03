      function setElementTextNode(element, text) {
        if (!element) return;
        const textNode = Array.from(element.childNodes).find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
        if (textNode) textNode.textContent = ` ${text}`;
        else element.append(document.createTextNode(text));
      }

      function setAttr(selector, name, value) {
        const element = $(selector);
        if (element) element.setAttribute(name, String(value ?? ""));
      }

      function applyI18n() {
        document.documentElement.lang = language;
        document.title = "MOTD Lab";
        if (dom.languageToggle) {
          dom.languageToggle.textContent = t("language");
          dom.languageToggle.setAttribute("aria-label", language === "vi" ? "Chuyển sang English" : "Switch to Vietnamese");
          dom.languageToggle.title = language === "vi" ? "Switch to English" : "Chuyển sang tiếng Việt";
        }

        // Keep icons and nested badges intact while replacing only visible text nodes.
        setElementTextNode($(".toolbar-label"), t("labels.color"));
        const previewTitle = $("#motdView .preview-title");
        if (previewTitle) setElementTextNode(previewTitle, t("labels.previewServerList"));

        setTextNode(dom.palette?.querySelector(".palette-title"), t("labels.palette"));
        const paletteSubtitle = dom.palette?.querySelector(".palette-subtitle");
        if (paletteSubtitle) {
          paletteSubtitle.innerHTML = `${escapeHtml(language === "en" ? "Click a color to insert · current: " : "Click màu để chèn · hiện tại: ")}<span id="paletteSyntaxLabel">${escapeHtml(getSyntaxLabel())}</span>`;
          dom.paletteSyntaxLabel = $("#paletteSyntaxLabel");
        }

        if (dom.saveStatus) {
          if (dom.saveStatus.classList.contains("saved") && lastSavedTimestamp) setSaveStatusState("saved", lastSavedTimestamp);
          else if (dom.saveStatus.classList.contains("saving")) setSaveStatusState("saving");
          else setSaveStatusState("unsaved");
        }
        setAttr("#saveProgress", "title", t("labels.saveNow")); setAttr("#saveProgress", "aria-label", t("labels.saveNow"));
        setAttr("#loadProgress", "title", t("labels.loadLocal")); setAttr("#loadProgress", "aria-label", t("labels.loadLocal"));
        setAttr("#clearProgress", "title", t("labels.clearAll")); setAttr("#clearProgress", "aria-label", t("labels.clearAll"));
        setAttr(".top-more > summary", "title", t("labels.more")); setAttr(".top-more > summary", "aria-label", t("labels.more"));
        setAttr("#palette", "aria-label", t("labels.palette"));
        setAttr("#togglePalette", "aria-label", t("labels.paletteClose"));
        setAttr("#togglePalette", "title", `${t("labels.paletteClose")} (Esc)`);
        setAttr("#sharedSyntaxSelect", "aria-label", t("labels.insertionSyntax")); setAttr("#sharedSyntaxSelect", "title", t("labels.insertionSyntax"));
        setAttr("#search", "placeholder", t("labels.searchColors")); setAttr("#search", "aria-label", t("labels.searchAria"));
        setAttr("#categoryChips", "aria-label", t("labels.filterGroups"));
        setAttr(".tabs", "aria-label", t("labels.tools"));
        setAttr("#railScrollLeft", "aria-label", t("labels.scrollLeft")); setAttr("#railScrollLeft", "title", t("labels.scrollLeft"));
        setAttr("#railScrollRight", "aria-label", t("labels.scrollRight")); setAttr("#railScrollRight", "title", t("labels.scrollRight"));
        setAttr("#toolbarCustomColor", "aria-label", t("labels.colorPicker"));
        setAttr(".toolbar-custom-color", "title", t("labels.colorPicker"));
        setAttr("#insertCustomColor", "title", t("labels.insertColor")); setAttr("#insertCustomColor", "aria-label", t("labels.insertColor"));
        setAttr("#sharedColorToolbar", "aria-label", t("labels.colorToolbar")); setAttr("#sharedFormatToolbar", "aria-label", t("labels.formatToolbar")); setAttr("#sharedAlignmentToolbar", "aria-label", t("labels.alignmentToolbar"));
        setAttr("#textPreset", "aria-label", t("labels.presetUniversal")); setAttr("#motdPreset", "aria-label", t("labels.presetMotd"));
        setAttr("#motdImportAddress", "aria-label", t("labels.importAddress"));
        setTextNode($("#motdImportHint"), t("labels.importHint"));
        setAttr("#textRaw", "placeholder", t("labels.enterEditor"));
        setAttr("#motdRaw", "placeholder", `${t("labels.enterMotd")}\n${t("labels.enterMotdExample")}`);
        setAttr("#serverIconWrapper", "title", t("labels.serverIconPick"));
        setTextNode($("#saveProgressLabel"), t("labels.saveNow"));
        setTextNode($("#loadProgressLabel"), t("labels.loadLocal"));
        setTextNode($("#clearProgressLabel"), t("labels.clearAll"));
        setTextNode($("#openPaletteMenuLabel"), t("labels.palette"));
        setTextNode($("#motdImportLabel"), t("labels.getFromServer"));
        setTextNode($("#motdOptionsLabel"), t("labels.options"));
        setTextNode($('[data-persist-key="motdOptionsOpen"] .details-count'), t("labels.optionalBadge"));
        setTextNode($(".format-notes-menu-label"), t("labels.notes"));
        setTextNode($(".about-menu-label"), t("labels.about"));
        setTextNode($("#aboutTitle"), t("labels.about"));
        $$("[data-about]").forEach((el) => { el.textContent = I18N[language].about[el.dataset.about] || ""; });
        renderReleaseInfo();

        setTextNode($("#motdView .panel-head .panel-title"), t("labels.generator"));
        setElementTextNode($("#motdView .preview-title"), t("labels.previewServerList"));
        setTextNode($("#textView .panel-head .panel-title"), t("labels.editor"));
        setTextNode($("#textView .panel:nth-child(2) .panel-title"), t("labels.liveOutput"));
        setTextNode($("#formatView .panel-title"), t("labels.notes"));

        const paletteFooter = $(".palette-footer .hint");
        if (paletteFooter) paletteFooter.textContent = language === "en"
          ? "Copy on a swatch only copies its hex. Search and groups filter the palette; they do not change insertion syntax."
          : "Nút copy trên ô chỉ sao chép hex. Tìm kiếm + nhóm màu chỉ là bộ lọc, không thay đổi format đang chèn.";
        $$(".format-presets-label").forEach((el) => { el.textContent = t("labels.formatShowcase"); });
        setTextNode($("#motdPresetMenuTrigger"), t("labels.preset"));
        setTextNode($("#textPresetMenuTrigger"), t("labels.preset"));
        $$("#motdPresetMenuTrigger,#textPresetMenuTrigger").forEach((el) => { el.title = t("labels.preset"); el.setAttribute("aria-label", t("labels.preset")); });
        const presetButtonLabels = {
          "#motdPresetEmpty": t("labels.noPreset"), "#motdPresetStarter": t("labels.starterPreset"), "#motdPresetPlain": t("labels.examplePreset"),
          "#textPresetEmpty": t("labels.noPreset"), "#textPresetStarter": t("labels.starterPreset"), "#textPresetHelp": t("labels.helpPreset"), "#textPresetWhisper": t("labels.whisperPreset"), "#textPresetStatus": t("labels.statusPreset")
        };
        Object.entries(presetButtonLabels).forEach(([sel, text]) => setTextNode($(sel), text));
        setTextNode($("#motdImportBtnLabel"), t("labels.pingImport"));
        setTextNode($("#plainMotd"), t("labels.examplePreset"));
        setTextNode($("#copyMotdLegacy"), t("labels.copy"));
        setTextNode($("#copyMotdVanilla"), t("labels.copyProperties"));
        const iconLabel = $("#motdIconUpload")?.closest("label");
        if (iconLabel) { const spans = iconLabel.querySelectorAll("span"); if (spans[0]) spans[0].textContent = t("labels.serverIcon"); if (spans[1]) spans[1].textContent = "(64×64 PNG)"; }

        setTextNode($("#motdView .input-preview-details summary span:first-child"), t("labels.inputMapping"));
        setTextNode($("#textView .input-preview-details summary span:first-child"), t("labels.inputMapping"));
        const motdContextNotes = $$("#motdView .context-note");
        if (motdContextNotes[0]) motdContextNotes[0].innerHTML = `${escapeHtml(language === "en" ? "Enter, " : "Enter, ")}<code>\\n</code>${language === "en" ? ", /n (after a space or colour code, not before a lowercase letter) or " : ", /n (sau khoảng trắng hoặc mã màu, không trước chữ thường) hoặc "}<code>&lt;newline&gt;</code>${language === "en" ? " create a line break. The tool does not truncate input, but the server list shows only 2 lines, each up to 271px." : " đều là xuống dòng. Tool không tự cắt input, nhưng server list chỉ hiển thị 2 dòng, mỗi dòng tối đa 271px."}`;
        if (motdContextNotes[1]) motdContextNotes[1].innerHTML = escapeHtml(t("labels.previewHint"));
        const textContext = $("#textView .context-note");
        if (textContext) textContext.innerHTML = `${language === "en" ? "Enter, " : "Enter, "}<code>\\n</code>${language === "en" ? ", /n (after a space or colour code, not before a lowercase letter) and " : ", /n (sau khoảng trắng hoặc mã màu, không trước chữ thường) và "}<code>&lt;newline&gt;</code>${language === "en" ? " are treated as line breaks in the tool. Alignment follows the width of the preview." : " đều được hiểu là xuống dòng trong tool. Căn dòng theo độ rộng của khung preview."}`;

        setTextNode($("#footerAuto"), t("labels.footerAuto"));
        setTextNode($("#footerTools"), t("labels.footerTools"));
        $$("[data-credit]").forEach((el) => { el.textContent = t(el.dataset.credit === "pre" ? "labels.creditPre" : "labels.creditBy"); });

        const optionLabels = {
          "#textPreset [value=empty]": t("labels.noPreset"), "#textPreset [value=starter]": t("labels.starterPreset"), "#textPreset [value=help]": t("labels.helpPreset"), "#textPreset [value=whisper]": t("labels.whisperPreset"), "#textPreset [value=status]": t("labels.statusPreset"),
          "#motdPreset [value=empty]": t("labels.noPreset"), "#motdPreset [value=starter]": t("labels.starterPreset"), "#motdPreset [value=plain]": t("labels.examplePreset")
        };
        Object.entries(optionLabels).forEach(([sel, text]) => { const el = $(sel); if (el) el.textContent = text; });
        $$("#undoMotd,#undoText").forEach((el) => { el.title = t("labels.undo"); el.setAttribute("aria-label", t("labels.undo")); });
        $$("[data-motd-align]").forEach((el) => {
          const key = el.dataset.motdAlign === "left" ? "alignLeft" : el.dataset.motdAlign === "center" ? "alignCenter" : "alignRight";
          el.title = t(`labels.${key}`);
          el.setAttribute("aria-label", t(`labels.${key}`));
        });
        $$("#redoMotd,#redoText").forEach((el) => { el.title = t("labels.redo"); el.setAttribute("aria-label", t("labels.redo")); });
        $$("#clearMotdRaw,#clearTextRaw").forEach((el) => { el.title = t("labels.clearContent"); el.setAttribute("aria-label", t("labels.clearContent")); });


        setTextNode($("#formatView .panel-head .panel-title"), t("labels.notes"));
        $$(".format-note").forEach((el) => { const key = el.dataset.formatNote; el.textContent = I18N[language].formatNotes[key] || ""; });
        const footerNotes = $("#formatNotesFooter"); if (footerNotes) footerNotes.textContent = I18N[language].formatNotes.footer;
        return language;
      }

      function setTextNode(element, text) {
        if (!element) return;
        element.textContent = text;
      }

      function setLanguage(next) {
        language = next === "en" ? "en" : "vi";
        localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
        applyI18n();
        renderFilters();
        renderPalette();
        renderSharedToolbar();
        renderTextOutput();
        renderMotd();
        if (lastSavedTimestamp) updateSaveStatus(lastSavedTimestamp);
        if (isDirty) markDirty();
      }

