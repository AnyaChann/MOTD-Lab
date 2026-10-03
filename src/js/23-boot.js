      function refreshObfuscatedText() {
        $$(".obf-text").forEach((el) => { el.textContent = randomizeText(el.dataset.original); });
      }

      /* =========================
         Boot
      ========================== */
      migrateStorage();
      applyI18n();
      const storedPaletteState = localStorage.getItem(STORAGE_KEYS.paletteCollapsed);
      setPaletteCollapsed(storedPaletteState !== "false", false);

      const storedTab = localStorage.getItem(STORAGE_KEYS.activeTab);
      const validTabs = new Set(["motdView", "textView", "formatView", "aboutView"]);
      activateTab(validTabs.has(storedTab) ? storedTab : "motdView", false);
      const savedSyntax = localStorage.getItem(STORAGE_KEYS.textSyntax);
      if (savedSyntax) dom.sharedSyntaxSelect.value = savedSyntax;
      const savedTextPreset = localStorage.getItem(STORAGE_KEYS.textPreset);
      const savedMotdPreset = localStorage.getItem(STORAGE_KEYS.motdPreset);
      if (savedTextPreset) dom.textPreset.value = savedTextPreset;
      if (savedMotdPreset) dom.motdPreset.value = savedMotdPreset;
      syncPresetMenu("textPreset");
      syncPresetMenu("motdPreset");
      restoreSavedIcon();
      wireEvents();
      bindPersistedDetails();
      renderSharedToolbar();
      initRailScrollHints();
      updateAlignmentToolbar();

      if (localStorage.getItem(STORAGE_KEYS.lastSaved)) {
        loadProgress({ silent: true });
      } else {
        textHistory.reset();
        motdHistory.reset();
        renderAll();
      }

      applyI18n();
      renderFilters();
      renderPalette();
      renderSharedToolbar();
      updateAlignmentToolbar();
      updateHistoryButtons();
      bindPersistedDetails();
      dom.paletteSyntaxLabel.textContent = dom.sharedSyntaxSelect.options[dom.sharedSyntaxSelect.selectedIndex]?.text || dom.sharedSyntaxSelect.value;

      installResponsiveObservers();
      setInterval(refreshObfuscatedText, 80);
