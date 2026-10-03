      const APP_REPO = "AnyaChann/MOTD-Lab";
      const APP_VERSION = "v1.0.0";
      const APP_RELEASE_DATE = "2026-10-02";
      // APP_VERSION / APP_RELEASE_DATE describe THIS file. They are the single source of truth:
      // the release workflow refuses to publish a tag that differs from APP_VERSION.
      // `latest` is only the newest GitHub release, used to tell the user an update exists.
      const releaseInfo = { state: "fallback", latest: null, url: `https://github.com/${APP_REPO}/releases`, loading: false, lastTry: 0 };

      function parseSemver(value) {
        const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/.exec(String(value || "").trim());
        return m ? { nums: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] || "" } : null;
      }

      // -1: a < b, 0: equal, 1: a > b, null: not comparable. A pre-release sorts below its release.
      function compareVersions(a, b) {
        const x = parseSemver(a), y = parseSemver(b);
        if (!x || !y) return null;
        for (let i = 0; i < 3; i++) if (x.nums[i] !== y.nums[i]) return x.nums[i] < y.nums[i] ? -1 : 1;
        if (x.pre === y.pre) return 0;
        if (!x.pre) return 1;
        if (!y.pre) return -1;
        return x.pre < y.pre ? -1 : 1;
      }

      function formatReleaseDate(value) {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return "";
        return d.toLocaleDateString(language === "en" ? "en-US" : "vi-VN", { year: "numeric", month: "2-digit", day: "2-digit" });
      }

      function renderReleaseInfo() {
        const version = document.getElementById("aboutVersion");
        if (!version) return;
        version.textContent = APP_VERSION;
        document.getElementById("aboutReleaseDate").textContent = formatReleaseDate(APP_RELEASE_DATE);
        document.getElementById("aboutChangelog").href = releaseInfo.url;
        const pill = document.getElementById("aboutReleaseStatus");
        const cmp = releaseInfo.state === "live" ? compareVersions(releaseInfo.latest, APP_VERSION) : null;
        let dataState = "offline", key = "relFallback";
        if (releaseInfo.state === "loading") { dataState = "loading"; key = "relLoading"; }
        else if (releaseInfo.state === "none") key = "relNone";
        else if (releaseInfo.state === "live") {
          if (cmp === 1) { dataState = "error"; key = "relUpdate"; }
          else if (cmp === 0) { dataState = "success"; key = "relCurrent"; }
          else if (cmp === -1) { dataState = "offline"; key = "relAhead"; }
          else { dataState = "offline"; key = "relUnknown"; }
        }
        pill.dataset.state = dataState;
        pill.textContent = I18N[language].about[key].replace("{version}", releaseInfo.latest || "");
      }

      async function loadReleaseInfo() {
        if (releaseInfo.loading || releaseInfo.state === "live") return;
        if (Date.now() - releaseInfo.lastTry < 30000) return;
        releaseInfo.loading = true;
        releaseInfo.lastTry = Date.now();
        releaseInfo.state = "loading";
        renderReleaseInfo();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        try {
          const res = await fetch(`https://api.github.com/repos/${APP_REPO}/releases/latest`, {
            headers: { Accept: "application/vnd.github+json" }, signal: controller.signal
          });
          if (res.status === 404) {
            releaseInfo.state = "none";
          } else if (!res.ok) {
            throw new Error(`GitHub ${res.status}`);
          } else {
            const data = await res.json();
            if (!data.tag_name) throw new Error("No tag_name");
            releaseInfo.latest = String(data.tag_name).slice(0, 40);
            const prefix = `https://github.com/${APP_REPO}/`;
            releaseInfo.url = typeof data.html_url === "string" && data.html_url.startsWith(prefix) ? data.html_url : `https://github.com/${APP_REPO}/releases`;
            releaseInfo.state = "live";
          }
        } catch (error) {
          releaseInfo.state = "fallback";
        } finally {
          clearTimeout(timer);
          releaseInfo.loading = false;
          renderReleaseInfo();
        }
      }

