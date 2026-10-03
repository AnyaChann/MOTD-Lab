      function setPaletteCollapsed(collapsed, persist = true) {
        dom.palette.classList.toggle("collapsed", collapsed);
        dom.paletteScrim.classList.toggle("open", !collapsed);
        document.body.classList.toggle("palette-open", !collapsed);
        dom.togglePalette.setAttribute("aria-expanded", String(!collapsed));
        dom.togglePalette.setAttribute("aria-label", t("labels.paletteClose"));
        dom.togglePalette.title = `${t("labels.paletteClose")} (Esc)`;
        dom.paletteToggleIcon.innerHTML = `<path d="M6 6l12 12M18 6 6 18"/>`;
        if (persist) {
          localStorage.setItem(STORAGE_KEYS.paletteCollapsed, String(collapsed));
          persistUiState();
        }
        if (!collapsed && document.readyState !== "loading") requestAnimationFrame(() => dom.search.focus());
      }

      /* Toolbar scroll hints: show ‹ › only while the rail overflows, and only on the side that has more. */
      function updateRailScrollHints() {
        const wrap = $("#editorRailWrap");
        const rail = wrap?.querySelector(".editor-rail");
        if (!wrap || !rail) return;
        const max = rail.scrollWidth - rail.clientWidth;
        wrap.classList.toggle("can-scroll-left", max > 1 && rail.scrollLeft > 1);
        wrap.classList.toggle("can-scroll-right", max > 1 && rail.scrollLeft < max - 1);
      }

      function initRailScrollHints() {
        const wrap = $("#editorRailWrap");
        const rail = wrap?.querySelector(".editor-rail");
        if (!wrap || !rail) return;
        const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
        const scrollByPage = (direction) => rail.scrollBy({
          left: direction * Math.max(120, Math.round(rail.clientWidth * 0.7)),
          behavior: reduceMotion?.matches ? "auto" : "smooth"
        });
        $("#railScrollLeft")?.addEventListener("click", () => scrollByPage(-1));
        $("#railScrollRight")?.addEventListener("click", () => scrollByPage(1));
        rail.addEventListener("scroll", updateRailScrollHints, { passive: true });
        window.addEventListener("resize", updateRailScrollHints);
        if ("ResizeObserver" in window) {
          const observer = new ResizeObserver(updateRailScrollHints);
          const watch = () => { observer.disconnect(); observer.observe(rail); Array.from(rail.children).forEach((child) => observer.observe(child)); };
          watch();
          // The colour / format / alignment groups are re-rendered with innerHTML (and language changes relabel them).
          new MutationObserver(() => { watch(); updateRailScrollHints(); }).observe(rail, { childList: true, subtree: true });
        }
        updateRailScrollHints();
      }

      function activateTab(viewId, persist = true) {
        $$(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === viewId));
        $$(".view-menu-item").forEach((item) => item.classList.toggle("active", item.dataset.view === viewId));
        $$(".view").forEach((view) => view.classList.toggle("active", view.id === viewId));
        updateAlignmentToolbar();
        requestAnimationFrame(handleViewportChange);
        const rail = $(".editor-rail");
        const railHidden = viewId === "formatView" || viewId === "aboutView";
        if (rail) rail.classList.toggle("is-hidden", railHidden);
        $("#editorRailWrap")?.classList.toggle("is-hidden", railHidden);
        requestAnimationFrame(updateRailScrollHints);
        if (viewId === "aboutView") loadReleaseInfo();
        if (persist) {
          localStorage.setItem(STORAGE_KEYS.activeTab, viewId);
          persistUiState();
        }
      }

      /* =========================
         Icon handling / import
      ========================== */
