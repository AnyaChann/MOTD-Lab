      function outputLineCount(value, representation) {
        const text = String(value ?? "");
        if (representation === "escaped\n") return (text.match(/\\n/g) || []).length + 1;
        if (representation === "minitag") return (text.match(/<newline>/gi) || []).length + 1;
        return text.split("\n").length;
      }

      function outputNewlineInfo(value, representation) {
        const lines = outputLineCount(value, representation);
        const label = representation === "escaped\n"
          ? "encoded \\n"
          : representation === "minitag"
            ? "<newline>"
            : "literal newline";
        return language === "en" ? `${lines} lines · ${label}` : `${lines} dòng · ${label}`;
      }

      function serializeMotdOutputs(raw) {
        const normalized = normalizeLinebreaks(raw);
        const tokens = parseUniversal(normalized);
        const legacy = serializeForTarget(normalized, tokens, "legacy");
        const section = serializeForTarget(normalized, tokens, "section");
        const bukkit = serializeForTarget(normalized, tokens, "bukkit");
        const mini = serializeForTarget(normalized, tokens, "mini");
        const iridium = serializeForTarget(normalized, tokens, "iridium", outputColorFormats);
        const serverProperties = `motd=${legacyToServerProperties(tokens)}`;
        const velocity = `motd = "${tomlQuoted(mini)}"`;
        const bungee = `motd: "${yamlDoubleQuoted(legacy)}"`;
        const slpText = serializeForTarget(normalized, tokens, "slp", outputColorFormats);
        const serverListPlus = buildServerListPlusOutput(slpText);
        const slpInputLines = slpText.split("\n").length;
        const slpKeptLines = Math.min(slpInputLines, SLP_MAX_DESCRIPTION_LINES);
        const slpLineInfo = slpInputLines > SLP_MAX_DESCRIPTION_LINES
          ? langT(`${slpKeptLines} dòng MOTD (cắt từ ${slpInputLines}) · literal newline`, `${slpKeptLines} MOTD lines (trimmed from ${slpInputLines}) · literal newline`)
          : langT(`${slpKeptLines} dòng MOTD · literal newline`, `${slpKeptLines} MOTD ${slpKeptLines === 1 ? "line" : "lines"} · literal newline`);
        return [
          ["server.properties", serverProperties, `Vanilla / Paper · ${outputNewlineInfo(serverProperties, "escaped\n")}`],
          ["velocity.toml", velocity, `Velocity · ${outputNewlineInfo(velocity, "escaped\n")}`],
          ["BungeeCord / Waterfall", bungee, `${langT("Cấu hình proxy", "Proxy config")} · ${outputNewlineInfo(bungee, "escaped\n")}`],
          ["ServerListPlus", serverListPlus, `${langT("YAML riêng của plugin", "Plugin-specific YAML")} · ${slpLineInfo}`, "slp"],
          ["Raw §", section, `${langT("Biểu diễn section-code", "Section-code representation")} · ${outputNewlineInfo(section, "literal")}`],
          ["Bukkit &x", bukkit, `${langT("Quy ước của plugin", "Plugin convention")} · ${outputNewlineInfo(bukkit, "literal")}`],
          ["MiniMessage", mini, `Adventure / Paper / Velocity · ${outputNewlineInfo(mini, /<newline>/i.test(mini) ? "minitag" : "literal")}`],
          ["IridiumColorAPI", iridium, `${langT("Parser tag riêng của plugin", "Plugin-specific tag parser")} · ${outputNewlineInfo(iridium, "literal")}`, "iridium"]
        ];
      }

      function renderMotd() {
        const raw = normalizeLinebreaks(dom.motdRaw.value);
        const tokens = parseUniversal(raw);
        renderInputPreview(dom.motdInputPreview, raw);
        applyPreviewAlignment();
        const lines = splitTokenLines(tokens);
        renderTokenLine(dom.motdPreviewLine1, lines[0] || [], motdAlignment);
        renderTokenLine(dom.motdPreviewLine2, lines[1] || [], motdAlignment);
        updateAlignmentToolbar();

        const data = lastPingData;
        const players = data?.players || {};
        const onlineText = data ? `${players.online ?? "—"} / ${players.max ?? "—"} ${t("labels.playersCount")}` : t("labels.playerCountUnavailable");
        dom.motdPreviewPlayers.textContent = onlineText;

        const outputs = serializeMotdOutputs(raw);
        dom.motdOutputs.innerHTML = `
          <details class="export-details" data-persist-key="motdOutputsOpen">
            <summary><span>${escapeHtml(t("labels.deployTargets"))}</span><span class="details-count">${outputs.length}</span></summary>
            <div class="export-list">
              ${outputs.map(([label, value, note, styleGroup], index) => `
                <section class="config-output">
                  <div class="config-output-head">${renderOutputLabel(label, note, styleGroup)}<button class="btn small" type="button" data-copy-index="${index}">${escapeHtml(t("labels.copy"))}</button></div>
                  <pre>${escapeHtml(value)}</pre>
                </section>`).join("")}
            </div>
          </details>`;
        window.__motdCopies = outputs.map(([, value]) => value);
        dom.copyMotdLegacy = serializeForTarget(raw, tokens, "legacy");
        dom.copyMotdVanilla = `motd=${legacyToServerProperties(tokens)}`;
        renderMotdLineCounter();
        renderServerPingDetails();
        bindPersistedDetails(dom.motdOutputs);
        bindPersistedDetails(dom.serverPingDetails);
      }

      /* =========================
         Persistence
      ========================== */
