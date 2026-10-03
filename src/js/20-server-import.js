      function setIconData(data) {
        dom.serverIconPreview.src = data || "";
        dom.serverIconPreview.style.display = data ? "block" : "none";
        dom.serverIconPlaceholder.style.display = data ? "none" : "grid";
        if (data) localStorage.setItem(STORAGE_KEYS.motdIconImage, data);
        else localStorage.removeItem(STORAGE_KEYS.motdIconImage);
      }

      /* =========================
         Server status API
         The only code that talks to api.mcstatus.io. Everything else gets either a payload whose
         shape the renderers rely on, or a ServerStatusError with a stable `kind`.
      ========================== */
      const SERVER_STATUS_ENDPOINT = "https://api.mcstatus.io/v2/status/java/";
      const SERVER_STATUS_TIMEOUT_MS = 10000;

      class ServerStatusError extends Error {
        constructor(kind, detail = "") {
          super(detail ? `${kind}: ${detail}` : kind);
          this.name = "ServerStatusError";
          this.kind = kind; // "timeout" | "network" | "http" | "shape"
        }
      }

      async function fetchServerStatus(address, { timeoutMs = SERVER_STATUS_TIMEOUT_MS, fetchImpl = (...args) => fetch(...args) } = {}) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const isAbort = (error) => error?.name === "AbortError";
        try {
          let response;
          try {
            response = await fetchImpl(SERVER_STATUS_ENDPOINT + encodeURIComponent(address), { signal: controller.signal });
          } catch (error) {
            throw new ServerStatusError(isAbort(error) ? "timeout" : "network");
          }
          if (!response.ok) throw new ServerStatusError("http", String(response.status));
          let data;
          try {
            data = await response.json();
          } catch (error) {
            throw new ServerStatusError(isAbort(error) ? "timeout" : "shape", "invalid JSON");
          }
          if (!data || typeof data !== "object" || typeof data.online !== "boolean") throw new ServerStatusError("shape", "missing online flag");
          return data;
        } finally {
          clearTimeout(timer);
        }
      }

      async function importMotdFromServer() {
        if (dom.importBtn?.disabled) return;
        // Chấp nhận cả dạng dán nguyên URL: bỏ giao thức, đường dẫn và khoảng trắng.
        const address = dom.importAddress.value.trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").replace(/[\/?#].*$/, "");
        dom.importAddress.value = address;
        if (!address) {
          setImportStatus("error", t("labels.serverAddressRequired"));
          showToast(t("labels.serverAddressRequired"));
          dom.importAddress.focus();
          return;
        }
        setImportLoading(true);
        setImportStatus("loading", t("labels.pinging"));
        try {
          const data = await fetchServerStatus(address);
          lastPingData = data;
          try {
            localStorage.setItem(STORAGE_KEYS.lastPingData, JSON.stringify(data));
          } catch (storageError) {
            console.warn("Failed to persist ping snapshot:", storageError);
          }
          if (!data.online) {
            renderMotd();
            updateImportBadge();
            setImportStatus("offline", t("labels.serverOffline"));
            showToast(t("labels.serverOffline"));
            return;
          }
          dom.motdRaw.value = normalizeLinebreaks(String(data.motd?.raw ?? ""));
          if (typeof data.icon === "string" && data.icon.startsWith("data:image")) setIconData(data.icon);
          renderMotd();
          updateImportBadge();
          motdHistory.push();
          scheduleSave();
          const players = data.players || {};
          const versionName = data.version?.name_clean || data.version?.name_raw || data.version?.name;
          const summary = [t("labels.pingImported"), `${players.online ?? "—"}/${players.max ?? "—"} ${t("labels.playersCount")}`, versionName].filter(Boolean).join(" · ");
          setImportStatus("success", summary);
          showToast(t("labels.pingImported"));
        } catch (error) {
          console.warn("Failed to import MOTD:", error);
          const message = t(error instanceof ServerStatusError && error.kind === "timeout" ? "labels.pingTimeout" : "labels.pingFailed");
          setImportStatus("error", message);
          showToast(message);
        } finally {
          setImportLoading(false);
        }
      }

      function handleIconUpload(file) {
        if (!file) return;
        if (file.type !== "image/png") { showToast(t("labels.onlyPng")); dom.iconUpload.value = ""; return; }
        if (file.size > 2 * 1024 * 1024) { showToast(t("labels.iconTooLarge")); dom.iconUpload.value = ""; return; }
        const image = new Image();
        const url = URL.createObjectURL(file);
        image.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = 64; canvas.height = 64;
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, 64, 64);
            ctx.drawImage(image, 0, 0, 64, 64);
            setIconData(canvas.toDataURL("image/png"));
            scheduleSave();
            showToast(t("labels.iconLoaded"));
          } catch (error) {
            console.warn("Failed to process server icon:", error);
            showToast(t("labels.iconProcessFailed"));
          } finally {
            URL.revokeObjectURL(url);
          }
        };
        image.onerror = () => { URL.revokeObjectURL(url); dom.iconUpload.value = ""; showToast(t("labels.iconReadFailed")); };
        image.src = url;
      }

      /* =========================
         Rendering / events
      ========================== */
