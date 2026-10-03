      function wireEvents() {
        dom.languageToggle?.addEventListener("click", () => setLanguage(language === "vi" ? "en" : "vi"));
        dom.togglePalette.addEventListener("click", () => setPaletteCollapsed(true));
        $("#openPaletteMenu")?.addEventListener("click", (event) => {
          setPaletteCollapsed(false);
          closeNearestDropdown(event.currentTarget);
        });
        dom.paletteScrim.addEventListener("click", () => setPaletteCollapsed(true));
        dom.importAddress?.addEventListener("keydown", (event) => {
          if (event.key === "Enter" && !event.isComposing) { event.preventDefault(); importMotdFromServer(); }
        });

        document.addEventListener("keydown", (event) => {
          if (event.key === "Escape" && !dom.palette.classList.contains("collapsed")) {
            setPaletteCollapsed(true);
          }
        });

        document.addEventListener("click", (event) => {
          const presetItem = event.target.closest("[data-preset-target][data-preset-value]");
          if (presetItem) {
            const targetId = presetItem.dataset.presetTarget;
            const select = document.getElementById(targetId);
            if (select) {
              select.value = presetItem.dataset.presetValue;
              persistUiState();
              if (targetId === "motdPreset") applyMotdPreset(select.value);
              else if (targetId === "textPreset") applyTextPreset(select.value);
              syncPresetMenu(targetId);
            }
            closeNearestDropdown(presetItem);
            return;
          }

          const tab = event.target.closest(".tab");
          if (tab) { activateTab(tab.dataset.view); return; }

          const viewMenuItem = event.target.closest(".view-menu-item");
          if (viewMenuItem) {
            activateTab(viewMenuItem.dataset.view);
            const menu = viewMenuItem.closest(".top-more");
            if (menu) menu.open = false;
            return;
          }

          const activeDropdown = event.target.closest("details.inline-more, details.top-more");
          $$('details.inline-more[open], details.top-more[open]').forEach((menu) => {
            if (!activeDropdown || menu !== activeDropdown) menu.open = false;
          });

          const copyButton = event.target.closest("[data-copy]");
          if (copyButton) { copyText(copyButton.dataset.copy); return; }

          const styleButton = event.target.closest("[data-color-style]");
          if (styleButton) {
            const group = styleButton.dataset.colorStyle;
            const value = styleButton.dataset.colorStyleValue;
            if (setOutputColorStyle(group, value)) {
              renderTextOutput(); renderMotd();
              document.querySelector(`[data-color-style="${group}"][data-color-style-value="${value}"]`)?.focus();
            }
            return;
          }

          const copyIndex = event.target.closest("[data-copy-index]");
          if (copyIndex) { copyText(window.__motdCopies?.[Number(copyIndex.dataset.copyIndex)] || ""); return; }

          const colorButton = event.target.closest("[data-shared-color]");
          if (colorButton) { insertSharedCode("color", colorButton.dataset.sharedColor); return; }

          const formatButton = event.target.closest("[data-shared-format]");
          if (formatButton) { insertSharedCode("format", formatButton.dataset.sharedFormat); return; }

          const alignmentButton = event.target.closest("[data-motd-align]");
          if (alignmentButton) { setMotdAlignment(alignmentButton.dataset.motdAlign); return; }

          const mapTag = event.target.closest("[data-map-control]");
          if (mapTag) {
            const container = mapTag.closest(".input-preview");
            selectSourceMapControl(container, mapTag.dataset.mapControl);
            return;
          }

          const mapText = event.target.closest("[data-map-token]");
          if (mapText) {
            const ids = (mapText.dataset.mapControls || "").split(",").filter(Boolean);
            const container = mapText.closest(".input-preview");
            if (ids.length) selectSourceMapControl(container, ids[ids.length - 1]);
            return;
          }

          if (event.target.id === "paletteCategorySelect") {
            activeCategory = event.target.value || "all";
            localStorage.setItem(STORAGE_KEYS.paletteCategory, activeCategory);
            persistUiState();
            renderFilters(); renderPalette(); return;
          }

          const toggleCategory = event.target.closest("[data-toggle-category]");
          if (toggleCategory) {
            const category = toggleCategory.dataset.toggleCategory;
            collapsedCategories.has(category) ? collapsedCategories.delete(category) : collapsedCategories.add(category);
            localStorage.setItem(STORAGE_KEYS.paletteSections, JSON.stringify([...collapsedCategories]));
            persistUiState();
            renderPalette(); return;
          }

          const colorCard = event.target.closest(".color-card");
          if (colorCard && !event.target.closest("[data-copy]")) { insertSharedCode("color", colorCard.dataset.hex); return; }

          if (event.target.closest("#motdImportBtn")) { importMotdFromServer(); return; }
          if (event.target.id === "plainMotd") { applyMotdPreset("plain"); return; }
          if (event.target.id === "copyMotdLegacy") { copyText(dom.copyMotdLegacy || ""); return; }
          if (event.target.id === "copyMotdVanilla") { copyText(dom.copyMotdVanilla || ""); return; }
        });

        // Native <select> changes (keyboard/touch) don't reliably fire "click";
        // handle "change" so the palette group filter always applies.
        document.addEventListener("change", (event) => {
          if (event.target.id === "paletteCategorySelect") {
            activeCategory = event.target.value || "all";
            localStorage.setItem(STORAGE_KEYS.paletteCategory, activeCategory);
            persistUiState();
            renderFilters();
            renderPalette();
          }
        });

        document.addEventListener("wheel", (event) => {
          const line = event.target.closest(".motd-line");
          if (!line || line.scrollWidth <= line.clientWidth) return;
          if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) && !event.shiftKey) return;
          line.scrollLeft += event.deltaX + event.deltaY;
          event.preventDefault();
        }, { passive: false });

        document.addEventListener("keydown", (event) => {
          handleShortcut(event);
          if ((event.key === "Enter" || event.key === " ") && event.target.closest(".color-card")) {
            const card = event.target.closest(".color-card");
            if (!event.target.closest("[data-copy]")) { event.preventDefault(); insertSharedCode("color", card.dataset.hex); }
          }
        });

        dom.textRaw.addEventListener("input", () => { textHistory.push(); scheduleTextRender(); scheduleSave(); });
        dom.motdRaw.addEventListener("input", () => { motdHistory.push(); scheduleMotdRender(); scheduleSave(); });

        // Bind editing actions directly to the buttons so SVG/icon clicks never miss
        // because event.target is the nested <path>/<svg> rather than the button.
        const bindEditorAction = (id, action) => {
          const button = document.getElementById(id);
          if (button) button.addEventListener("click", action);
        };
        bindEditorAction("undoText", () => textHistory.undo());
        bindEditorAction("redoText", () => textHistory.redo());
        bindEditorAction("clearTextRaw", () => handleClear(dom.textRaw));
        bindEditorAction("undoMotd", () => motdHistory.undo());
        bindEditorAction("redoMotd", () => motdHistory.redo());
        bindEditorAction("clearMotdRaw", () => handleClear(dom.motdRaw));

        const bindMenuAction = (id, action) => {
          const button = document.getElementById(id);
          if (!button) return;
          button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            action(button);
          });
        };
        bindMenuAction("saveProgress", (button) => {
          clearTimeout(saveTimer);
          if (saveProgress()) showToast(t("labels.progressSaved"));
          closeNearestDropdown(button);
        });
        bindMenuAction("loadProgress", (button) => {
          loadProgress();
          closeNearestDropdown(button);
        });
        bindMenuAction("clearProgress", (button) => {
          clearProgress();
          closeNearestDropdown(button);
        });

        dom.sharedSyntaxSelect.addEventListener("change", () => { localStorage.setItem(STORAGE_KEYS.textSyntax, dom.sharedSyntaxSelect.value); updateSyntaxLabel(); dom.paletteSyntaxLabel.textContent = dom.sharedSyntaxSelect.options[dom.sharedSyntaxSelect.selectedIndex]?.text || dom.sharedSyntaxSelect.value;
          applyI18n(); renderTextOutput(); renderMotd(); scheduleSave(); });
        dom.customColor.addEventListener("input", () => { scheduleSave(); });
        dom.customColor.addEventListener("change", () => insertSharedCode("color", dom.customColor.value));
        $("#insertCustomColor")?.addEventListener("click", () => insertSharedCode("color", dom.customColor.value));
        dom.search.addEventListener("input", renderPalette);
        dom.textPreset.addEventListener("change", () => { persistUiState(); applyTextPreset(dom.textPreset.value); syncPresetMenu("textPreset"); });
        dom.motdPreset.addEventListener("change", () => { persistUiState(); applyMotdPreset(dom.motdPreset.value); syncPresetMenu("motdPreset"); });
        dom.iconUpload.addEventListener("change", () => handleIconUpload(dom.iconUpload.files?.[0]));
        dom.serverIconWrapper.addEventListener("click", () => dom.iconUpload.click());

        window.addEventListener("beforeunload", () => { if (isDirty) saveProgress({ silent: true }); });
      }

