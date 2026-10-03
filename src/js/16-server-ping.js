      function countCodePoints(text) { return Array.from(String(text ?? "")).length; }

      function renderCharacterSummary(element, raw, tokens) {
        if (!element) return;
        const visibleCount = countCodePoints(tokens.filter((token) => !token.linebreak).map((token) => token.text).join(""));
        element.textContent = t("labels.characters", { count: visibleCount });
        element.classList.remove("warn", "danger");
        element.removeAttribute("title");
      }

      function renderMotdLineCounter() {
        const raw = normalizeLinebreaks(String(dom.motdRaw.value).replace(/\r\n?/g, "\n"));
        const lines = splitTokenLines(parseUniversal(raw));
        const w1 = tokenPixelWidth(lines[0] || []);
        const w2 = tokenPixelWidth(lines[1] || []);
        const hidden = lines.slice(2).filter((line) => line.length).length;
        const widest = Math.max(w1, w2);

        let text = t("labels.lineCounter", { w1, w2, max: MC_MOTD_MAX_WIDTH });
        if (hidden) text += ` · ${t("labels.hiddenLines", { count: hidden })}`;
        dom.motdLineCounter.textContent = text;
        const over = widest > MC_MOTD_MAX_WIDTH;
        dom.motdLineCounter.classList.toggle("danger", over);
        dom.motdLineCounter.classList.toggle("warn", !over && (hidden > 0 || widest > MC_MOTD_MAX_WIDTH - MOTD_SPACE_WIDTH * 2));
        dom.motdLineCounter.title = t("labels.lineCounterTitle", { max: MC_MOTD_MAX_WIDTH });
      }

      const PING_SNAPSHOT_ICON = `<svg class="si-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>`;

      function renderPingTags(items) {
        if (!items?.length) return "";
        return `<div class="ping-list">${items.map((item) => `<span class="ping-chip">${escapeHtml(item)}</span>`).join("")}</div>`;
      }

      let lastPingData = null;

      function updateImportBadge() {
        const el = dom.importBadge;
        if (!el) return;
        if (!lastPingData) { el.textContent = "PING"; delete el.dataset.state; return; }
        const online = lastPingData.online === true;
        el.textContent = online ? "ONLINE" : "OFFLINE";
        el.dataset.state = online ? "online" : "offline";
      }

      function setImportStatus(state, text = "") {
        const el = dom.importStatus;
        if (!el) return;
        if (!state) { el.hidden = true; el.textContent = ""; delete el.dataset.state; return; }
        el.hidden = false;
        el.dataset.state = state;
        el.textContent = text;
      }

      function setImportLoading(loading) {
        const btn = dom.importBtn;
        if (!btn) return;
        btn.classList.toggle("is-loading", loading);
        btn.disabled = loading;
        btn.setAttribute("aria-busy", String(loading));
      }

      function renderServerPingDetails() {
        updateImportBadge();
        const data = lastPingData;
        if (!data) {
          dom.serverPingDetails.innerHTML = `<details class="compact-details server-import ping-snap" data-persist-key="pingDetailsOpen"><summary>${PING_SNAPSHOT_ICON}<span>${escapeHtml(t("labels.snapshot"))}</span><span class="details-count">—</span></summary><div class="compact-details-body server-ping-body"><p class="ping-meta-note">${escapeHtml(t("labels.noSnapshot"))}</p></div></details>`;
          return;
        }

        const online = data.online === true;
        const players = data.players || {};
        const version = data.version || {};
        const srv = data.srv_record || data.srv || {};
        const plugins = Array.isArray(data.plugins) ? data.plugins.map((x) => typeof x === "string" ? x : [x?.name, x?.version].filter(Boolean).join(" ")).filter(Boolean) : [];
        const mods = Array.isArray(data.mods) ? data.mods.map((x) => typeof x === "string" ? x : [x?.name, x?.version].filter(Boolean).join(" ")).filter(Boolean) : [];
        const samples = Array.isArray(players.list || players.sample) ? (players.list || players.sample).map((x) => typeof x === "string" ? x : x?.name_clean || x?.name_raw || x?.name).filter(Boolean) : [];
        const motdClean = data.motd?.clean || data.motd?.raw || "—";
        const toDate = (value) => {
          if (!Number.isFinite(Number(value))) return "—";
          const n = Number(value);
          // mcstatus.io timestamps are Unix milliseconds. Keep a fallback for
          // older snapshots that may have been stored as seconds.
          const ms = n > 1e12 ? n : n * 1000;
          return new Date(ms).toLocaleString(language === "en" ? "en-US" : "vi-VN");
        };

        const fields = [
          [t("labels.status"), online ? t("labels.online") : t("labels.offline")],
          [t("labels.host"), `${data.host || data.hostname || "—"}${data.port ? `:${data.port}` : ""}`],
          [t("labels.ip"), data.ip_address || "—"],
          [t("labels.srv"), srv.host ? `${srv.host}:${srv.port ?? "—"}` : "—"],
          [t("labels.version"), version.name_clean || version.name_raw || version.name || "—"],
          [t("labels.protocol"), version.protocol ?? "—"],
          [t("labels.players"), `${players.online ?? "—"} / ${players.max ?? "—"}`],
          [t("labels.software"), data.software || "—"],
          [t("labels.plugins"), Array.isArray(data.plugins) ? String(data.plugins.length) : "—"],
          [t("labels.mods"), Array.isArray(data.mods) ? String(data.mods.length) : "—"],
          [t("labels.secureChat"), data.enforces_secure_chat == null ? "—" : (data.enforces_secure_chat ? t("labels.enforced") : t("labels.notEnforced"))],
          [t("labels.eulaBlocked"), data.eula_blocked == null ? "—" : String(data.eula_blocked)],
          [t("labels.retrieved"), toDate(data.retrieved_at)],
          [t("labels.expires"), toDate(data.expires_at)]
        ];

        const rawJson = JSON.stringify(data, null, 2);
        const statusCell = `<span class="import-status" data-state="${online ? "success" : "error"}">${escapeHtml(online ? t("labels.online") : t("labels.offline"))}</span>`;
        const cell = ([label, value], index) => index === 0
          ? `<div class="ping-item"><span class="ping-label">${escapeHtml(label)}</span>${statusCell}</div>`
          : `<div class="ping-item"><span class="ping-label">${escapeHtml(label)}</span><span class="ping-value">${escapeHtml(value)}</span></div>`;
        const wideCell = (label, items) => `<div class="ping-item wide"><span class="ping-label">${escapeHtml(label)}</span>${renderPingTags(items)}</div>`;
        dom.serverPingDetails.innerHTML = `
          <details class="compact-details server-import ping-snap" data-persist-key="pingDetailsOpen">
            <summary>${PING_SNAPSHOT_ICON}<span>${escapeHtml(t("labels.snapshot"))}</span><span class="details-count" data-state="${online ? "online" : "offline"}">${online ? "ONLINE" : "OFFLINE"}</span></summary>
            <div class="compact-details-body server-ping-body">
              <div class="ping-grid">
                ${fields.map(cell).join("")}
                ${plugins.length ? wideCell(t("labels.pluginCount", { count: plugins.length }), plugins) : ""}
                ${mods.length ? wideCell(t("labels.modCount", { count: mods.length }), mods) : ""}
                ${samples.length ? wideCell(t("labels.samplePlayers", { count: samples.length }), samples) : ""}
              </div>
              <p class="ping-meta-note">${escapeHtml(t("labels.snapshotNote"))}</p>
              <details class="compact-details ping-raw" data-persist-key="pingRawOpen"><summary><span>${escapeHtml(t("labels.rawApi"))}</span></summary><div class="compact-details-body"><pre class="ping-raw-pre">${escapeHtml(rawJson)}</pre></div></details>
            </div>
          </details>`;
      }

