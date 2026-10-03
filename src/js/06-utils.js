      function getSyntaxLabel() {
        const labels = language === "en"
          ? { legacy: "Legacy &", section: "Raw §", mini: "MiniMessage <>", iridium: "IridiumColorAPI", bukkit: "Bukkit &x" }
          : { legacy: "Legacy &", section: "Raw §", mini: "MiniMessage <>", iridium: "IridiumColorAPI", bukkit: "Bukkit &x" };
        return labels[getInsertionSyntax()] || "Legacy &";
      }

      function countVisibleText(raw) {
        const tokens = parseUniversal(normalizeLinebreaks(String(raw ?? "")));
        return countCodePoints(tokens.filter((token) => !token.linebreak).map((token) => token.text).join(""));
      }

      /* =========================
         Small utilities
      ========================== */
      function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, (char) => ({
          "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
        })[char]);
      }

      function escapeMini(value) {
        return String(value).replace(/\\/g, "\\\\").replace(/</g, "\\<");
      }

      function showToast(message) {
        dom.toast.textContent = message;
        dom.toast.classList.add("show");
        clearTimeout(showToast.timer);
        showToast.timer = setTimeout(() => dom.toast.classList.remove("show"), 1600);
      }

      async function copyText(value) {
        try {
          await navigator.clipboard.writeText(String(value));
        } catch {
          const textarea = document.createElement("textarea");
          textarea.value = String(value);
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.append(textarea);
          textarea.select();
          document.execCommand("copy");
          textarea.remove();
        }
        showToast(t("labels.copied", { value: `${String(value).slice(0, 80)}${String(value).length > 80 ? "…" : ""}` }));
      }

      function cleanHex(value) {
        const match = String(value).trim().match(/^#?([0-9a-f]{6})$/i);
        return match ? `#${match[1].toUpperCase()}` : "#FFFFFF";
      }

      function hexBody(hex) { return cleanHex(hex).slice(1); }
      function ampX(hex) { return "&x" + hexBody(hex).split("").map((char) => `&${char}`).join(""); }
      function miniColor(hex) { return `<#${hexBody(hex)}>`; }
      // IridiumColorAPI's documented solid-color syntax is <SOLID:RRGGBB>.
      function iridiumColor(hex) { return `<SOLID:${hexBody(hex)}>`; }
      function ampXToSection(hex) {
        return "§x" + hexBody(hex).split("").map((char) => `§${char}`).join("");
      }
      function sectionColorCode(hex) {
        const target = cleanHex(hex).toUpperCase();
        const vanilla = colors.find((color) => color.category === "Vanilla" && color.legacy && cleanHex(color.hex).toUpperCase() === target);
        return vanilla ? `§${vanilla.legacy.slice(1)}` : ampXToSection(target);
      }
      function rgb(hex) {
        const value = hexBody(hex);
        return [
          parseInt(value.slice(0, 2), 16),
          parseInt(value.slice(2, 4), 16),
          parseInt(value.slice(4, 6), 16)
        ];
      }
      function contrastText(hex) {
        const [r, g, b] = rgb(hex);
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? "#11141a" : "#f5f7fb";
      }

      function nearestLegacy(hex) {
        const target = cleanHex(hex).toUpperCase();
        let best = "&f";
        let bestDistance = Number.POSITIVE_INFINITY;
        const [r1, g1, b1] = rgb(target);
        colors.filter((color) => color.category === "Vanilla" && color.legacy).forEach((color) => {
          const [r2, g2, b2] = rgb(color.hex);
          const distance = (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2;
          if (distance < bestDistance) {
            bestDistance = distance;
            best = color.legacy;
          }
        });
        return best;
      }

      /* =========================
         History
      ========================== */
      class History {
        constructor({ capture, restore, equals, onChange }) {
          this.capture = capture;
          this.restore = restore;
          this.equals = equals;
          this.onChange = onChange;
          this.items = [];
          this.index = -1;
          this.restoring = false;
        }

        push() {
          if (this.restoring) return;
          const snapshot = this.capture();
          const current = this.items[this.index];
          if (current && this.equals(snapshot, current)) {
            this.onChange(this);
            return;
          }
          this.items = this.items.slice(0, this.index + 1);
          this.items.push(snapshot);
          if (this.items.length > HISTORY_LIMIT) this.items.shift();
          this.index = this.items.length - 1;
          this.onChange(this);
        }

        reset() {
          this.items = [];
          this.index = -1;
          this.push();
        }

        apply(index) {
          const snapshot = this.items[index];
          if (!snapshot) return;
          this.restoring = true;
          this.index = index;
          this.restore(snapshot);
          this.onChange(this);
          requestAnimationFrame(() => {
            this.restoring = false;
          });
        }

        undo() { if (this.index > 0) this.apply(this.index - 1); }
        redo() { if (this.index < this.items.length - 1) this.apply(this.index + 1); }
        canUndo() { return this.index > 0; }
        canRedo() { return this.index >= 0 && this.index < this.items.length - 1; }
      }

      let textAlignment = localStorage.getItem(STORAGE_KEYS.textAlignment) || "left";
      if (!["left", "center", "right"].includes(textAlignment)) textAlignment = "left";
      let motdAlignment = localStorage.getItem(STORAGE_KEYS.motdAlignment) || (localStorage.getItem("2c2t_motdCenter") === "true" ? "center" : "left");
      if (!["left", "center", "right"].includes(motdAlignment)) motdAlignment = "left";

