      function renderAll() {
        renderFilters();
        renderPalette();
        updateSyntaxLabel();
        renderTextOutput();
        renderMotd();
        updateHistoryButtons();
      }

      function handleClear(editor) {
        if (editor === dom.motdRaw) {
          if (!editor.value.trim() && !localStorage.getItem(STORAGE_KEYS.motdIconImage)) { showToast(t("labels.noContent")); return; }
          editor.value = "";
          motdAlignment = "left";
          setIconData("");
          updateAlignmentToolbar();
          motdHistory.push();
          scheduleMotdRender();
          scheduleSave();
          showToast(t("labels.motdCleared"));
          return;
        }
        if (!editor.value.trim()) { showToast(t("labels.noContent")); return; }
        editor.value = "";
        textHistory.push();
        scheduleTextRender();
        scheduleSave();
        showToast(t("labels.contentCleared"));
      }

      function applyTextPreset(value) {
        dom.textRaw.value = (language === "en" && TEXT_PRESETS_EN[value]) || TEXT_PRESETS[value] || "";
        textAlignment = "left";
        localStorage.setItem(STORAGE_KEYS.textAlignment, textAlignment);
        updateAlignmentToolbar();
        textHistory.push();
        scheduleTextRender();
        scheduleSave();
      }

      function applyMotdPreset(value) {
        dom.motdRaw.value = MOTD_PRESETS[value] ?? "";
        motdAlignment = "left";
        updateAlignmentToolbar();
        motdHistory.push();
        scheduleMotdRender();
        scheduleSave();
      }

      function syncPresetMenu(targetId) {
        const select = document.getElementById(targetId);
        if (!select) return;
        const menu = select.parentElement;
        if (!menu) return;
        menu.querySelectorAll(`[data-preset-target="${targetId}"]`).forEach((item) => {
          item.classList.toggle("selected", item.dataset.presetValue === select.value);
        });
      }

      function closeNearestDropdown(element) {
        const details = element?.closest("details.inline-more, details.top-more");
        if (details) details.open = false;
      }

      function handleShortcut(event) {
        const target = event.target;
        const isEditor = target === dom.textRaw || target === dom.motdRaw;
        if (!isEditor) return;
        const undo = event.ctrlKey && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "z";
        const redo = event.ctrlKey && !event.altKey && (event.key.toLowerCase() === "y" || (event.shiftKey && event.key.toLowerCase() === "z"));
        if (undo || redo) {
          event.preventDefault();
          const history = target === dom.textRaw ? textHistory : motdHistory;
          redo ? history.redo() : history.undo();
          return;
        }
      }

