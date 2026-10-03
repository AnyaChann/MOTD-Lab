      // Test hook: only filled when a test harness creates window.__MOTD_LAB_TEST__ before the page loads.
      // In normal use the object does not exist, so this does nothing and exposes nothing.
      if (window.__MOTD_LAB_TEST__) {
        Object.assign(window.__MOTD_LAB_TEST__, {
          parseUniversal, detectSourceSyntax, gradientColorAt, charPixelWidth, tokenPixelWidth, splitTokenLines,
          alignLineString, serializeForTarget, legacyToServerProperties, buildServerListPlusOutput,
          compareVersions, parseSemver, cleanHex, nearestLegacy, countVisibleText, normalizeLinebreaks,
          fetchServerStatus, ServerStatusError, migrateStorage, I18N, STORAGE_KEYS, STORAGE_SCHEMA_KEY, STORAGE_SCHEMA_VERSION
        });
      }
    })();
