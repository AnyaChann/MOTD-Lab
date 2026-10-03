      /* =========================
         Storage schema
         Bump STORAGE_SCHEMA_VERSION when a stored key changes meaning, and add a step below.
         Data written by a NEWER build is never rewritten or downgraded by an older one.
      ========================== */
      const STORAGE_SCHEMA_KEY = "2c2t_schemaVersion";
      const STORAGE_SCHEMA_VERSION = 1;

      const STORAGE_MIGRATIONS = {
        // 0 -> 1: the old boolean "2c2t_motdCenter" became motdAlignment; customHex is folded into customColor.
        1() {
          if (localStorage.getItem(STORAGE_KEYS.motdAlignment) === null && localStorage.getItem("2c2t_motdCenter") === "true") {
            localStorage.setItem(STORAGE_KEYS.motdAlignment, "center");
          }
          localStorage.removeItem("2c2t_motdCenter");
          if (localStorage.getItem(STORAGE_KEYS.customColor) === null && localStorage.getItem(STORAGE_KEYS.customHex) !== null) {
            localStorage.setItem(STORAGE_KEYS.customColor, localStorage.getItem(STORAGE_KEYS.customHex));
          }
        }
      };

      function migrateStorage() {
        try {
          const stored = Number.parseInt(localStorage.getItem(STORAGE_SCHEMA_KEY) || "0", 10);
          const from = Number.isInteger(stored) && stored >= 0 ? stored : 0;
          if (from > STORAGE_SCHEMA_VERSION) {
            console.warn(`Saved data uses schema ${from}, newer than this build (${STORAGE_SCHEMA_VERSION}); leaving it untouched.`);
            return false;
          }
          for (let version = from + 1; version <= STORAGE_SCHEMA_VERSION; version++) STORAGE_MIGRATIONS[version]();
          if (from !== STORAGE_SCHEMA_VERSION) localStorage.setItem(STORAGE_SCHEMA_KEY, String(STORAGE_SCHEMA_VERSION));
          return true;
        } catch (error) {
          // Storage can be unavailable (private mode, quota); the app still works without persistence.
          console.warn("Storage migration skipped:", error);
          return false;
        }
      }

      let saveTimer = null;
      let fullRenderFrame = 0;
      let isDirty = false;

      let lastSavedTimestamp = null;
      function setSaveStatusState(state, timestamp = null) {
        const el = dom.saveStatus;
        el.classList.remove("unsaved", "saving", "saved");
        el.classList.add(state);
        if (state === "saved" && timestamp) {
          const time = new Date(timestamp).toLocaleTimeString(language === "en" ? "en-US" : "vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          const label = t("labels.saveTime", { time });
          el.title = label;
          el.setAttribute("aria-label", label);
          return;
        }
        const label = state === "saving" ? t("labels.saveSaving") : t("labels.saveUnchanged");
        el.title = label;
        el.setAttribute("aria-label", label);
      }

      function updateSaveStatus(timestamp = Date.now()) {
        lastSavedTimestamp = Number(timestamp);
        setSaveStatusState("saved", lastSavedTimestamp);
      }

      function markDirty() {
        isDirty = true;
        setSaveStatusState("saving");
      }

      function hasData() {
        return Boolean(dom.textRaw.value.trim() || dom.motdRaw.value.trim() || localStorage.getItem(STORAGE_KEYS.motdIconImage));
      }

      function persistUiState() {
        const state = {
          textSyntax: dom.sharedSyntaxSelect.value,
          textPreset: dom.textPreset.value,
          motdPreset: dom.motdPreset.value,
          customColor: dom.customColor.value,
          customHex: dom.customColor.value,
          textAlignment,
          motdAlignment,
          paletteCollapsed: dom.palette.classList.contains("collapsed"),
          paletteCategory: activeCategory,
          paletteSections: [...collapsedCategories],
          activeTab: activeViewId()
        };
        Object.entries(state).forEach(([key, value]) => localStorage.setItem(STORAGE_KEYS[key], typeof value === "string" ? value : JSON.stringify(value)));
      }

      function bindPersistedDetails(root = document) {
        $$('details[data-persist-key]', root).forEach((details) => {
          if (details.dataset.persistenceBound === "true") return;
          details.dataset.persistenceBound = "true";
          const key = details.dataset.persistKey;
          if (localStorage.getItem(STORAGE_KEYS[key]) === "true") details.open = true;
          if (localStorage.getItem(STORAGE_KEYS[key]) === "false") details.open = false;
          details.addEventListener("toggle", () => localStorage.setItem(STORAGE_KEYS[key], String(details.open)));
        });
      }

      function saveProgress({ silent = false } = {}) {
        persistUiState();
        if (!hasData()) {
          isDirty = false;
          setSaveStatusState("unsaved");
          if (!silent) showToast(t("labels.noDataSave"));
          return false;
        }
        setSaveStatusState("saving");
        try {
          const payload = {
            textRaw: dom.textRaw.value,
            textSyntax: dom.sharedSyntaxSelect.value,
            customColor: dom.customColor.value,
            customHex: dom.customColor.value,
            motdRaw: dom.motdRaw.value,
            textAlignment,
            motdAlignment,
            paletteCollapsed: dom.palette.classList.contains("collapsed"),
            paletteCategory: activeCategory,
            paletteSections: [...collapsedCategories],
            lastPingData: lastPingData ? JSON.stringify(lastPingData) : ""
          };
          Object.entries(payload).forEach(([key, value]) => localStorage.setItem(STORAGE_KEYS[key], typeof value === "string" ? value : JSON.stringify(value)));
          localStorage.removeItem("2c2t_motdCenter");
          const timestamp = Date.now();
          localStorage.setItem(STORAGE_KEYS.lastSaved, String(timestamp));
          updateSaveStatus(timestamp);
          isDirty = false;
          return true;
        } catch (error) {
          console.warn("Failed to save progress:", error);
          setSaveStatusState("saving");
          if (!silent) showToast(t("labels.saveFailed"));
          return false;
        }
      }

      function scheduleSave() {
        persistUiState();
        markDirty();
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => saveProgress({ silent: true }), 700);
      }

      function scheduleFullRender() {
        cancelAnimationFrame(fullRenderFrame);
        fullRenderFrame = requestAnimationFrame(() => {
          fullRenderFrame = 0;
          renderAll();
        });
      }

      function loadProgress({ silent = false } = {}) {
        const lastSaved = localStorage.getItem(STORAGE_KEYS.lastSaved);
        if (!lastSaved) {
          if (!silent) showToast(t("labels.noSaved"));
          return false;
        }
        try {
          dom.textRaw.value = localStorage.getItem(STORAGE_KEYS.textRaw) || "";
          dom.sharedSyntaxSelect.value = localStorage.getItem(STORAGE_KEYS.textSyntax) || "legacy";
          dom.textPreset.value = localStorage.getItem(STORAGE_KEYS.textPreset) || "empty";
          dom.motdPreset.value = localStorage.getItem(STORAGE_KEYS.motdPreset) || "empty";
          dom.customColor.value = cleanHex(localStorage.getItem(STORAGE_KEYS.customColor) || localStorage.getItem(STORAGE_KEYS.customHex) || "#42D4F5");
          dom.motdRaw.value = localStorage.getItem(STORAGE_KEYS.motdRaw) || "";
          const storedTextAlignment = localStorage.getItem(STORAGE_KEYS.textAlignment);
          textAlignment = ["left", "center", "right"].includes(storedTextAlignment) ? storedTextAlignment : "left";
          const storedAlignment = localStorage.getItem(STORAGE_KEYS.motdAlignment);
          motdAlignment = ["left", "center", "right"].includes(storedAlignment)
            ? storedAlignment
            : (localStorage.getItem("2c2t_motdCenter") === "true" ? "center" : "left");
          updateAlignmentToolbar();
          try {
            const storedPing = localStorage.getItem(STORAGE_KEYS.lastPingData);
            lastPingData = storedPing ? JSON.parse(storedPing) : null;
          } catch {
            lastPingData = null;
          }

          setPaletteCollapsed(localStorage.getItem(STORAGE_KEYS.paletteCollapsed) !== "false", false);

          activeCategory = localStorage.getItem(STORAGE_KEYS.paletteCategory) || "Vanilla";
          try {
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.paletteSections) || "[]");
            if (Array.isArray(stored)) collapsedCategories = new Set(stored);
          } catch { /* ignore */ }

          restoreSavedIcon();
          updateSyntaxLabel();
          updateSaveStatus(Number(lastSaved));
          isDirty = false;
          textHistory.reset();
          motdHistory.reset();
          scheduleFullRender();
          syncPresetMenu("textPreset");
          syncPresetMenu("motdPreset");
          return true;
        } catch (error) {
          console.warn("Failed to load progress:", error);
          if (!silent) showToast(t("labels.loadFailed"));
          return false;
        }
      }

      function clearProgress() {
        Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
        localStorage.removeItem("2c2t_motdCenter");
        clearTimeout(saveTimer);
        isDirty = false;
        dom.textRaw.value = "";
        dom.sharedSyntaxSelect.value = "legacy";
        dom.textPreset.value = "empty";
        dom.motdPreset.value = "empty";
        dom.customColor.value = "#42D4F5";
        dom.motdRaw.value = "";
        textAlignment = "left";
        motdAlignment = "left";
        localStorage.removeItem(STORAGE_KEYS.textAlignment);
        updateAlignmentToolbar();
        lastPingData = null;
        setImportStatus(null);
        updateImportBadge();
        activeCategory = "all";
        collapsedCategories = new Set();
        $$(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === "motdView"));
        $$(".view").forEach((view) => view.classList.toggle("active", view.id === "motdView"));
        setPaletteCollapsed(true, false);
        dom.serverIconPreview.src = "";
        dom.serverIconPreview.style.display = "none";
        dom.serverIconPlaceholder.style.display = "grid";
        if (dom.iconUpload) dom.iconUpload.value = "";
        $$('details[data-persist-key]').forEach((details) => { details.open = false; });
        textHistory.reset();
        motdHistory.reset();
        scheduleFullRender();
        syncPresetMenu("textPreset");
        syncPresetMenu("motdPreset");
        setSaveStatusState("unsaved");
        showToast(t("labels.resetDone"));
      }

      function restoreSavedIcon() {
        const savedIcon = localStorage.getItem(STORAGE_KEYS.motdIconImage);
        if (savedIcon && /^data:image\/(png|jpeg|jpg)(;base64)?,/.test(savedIcon)) {
          dom.serverIconPreview.src = savedIcon;
          dom.serverIconPreview.style.display = "block";
          dom.serverIconPlaceholder.style.display = "none";
        } else {
          dom.serverIconPreview.src = "";
          dom.serverIconPreview.style.display = "none";
          dom.serverIconPlaceholder.style.display = "grid";
        }
      }

      /* =========================
         Palette collapse / tabs
      ========================== */
