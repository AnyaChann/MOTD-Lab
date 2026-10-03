      const STORAGE_KEYS = {
        paletteCollapsed: "2c2t_paletteCollapsed",
        paletteCategory: "2c2t_paletteCategory",
        paletteSections: "2c2t_paletteSections",
        textRaw: "2c2t_textRaw",
        textSyntax: "2c2t_textSyntax",
        textPreset: "2c2t_textPreset",
        motdPreset: "2c2t_motdPreset",
        customColor: "2c2t_customColor",
        customHex: "2c2t_customHex",
        motdRaw: "2c2t_motdRaw",
        motdIconImage: "2c2t_motdIconImage",
        textAlignment: "2c2t_textAlignment",
        motdAlignment: "2c2t_motdAlignment",
        activeTab: "2c2t_activeTab",
        inputPreviewMotdOpen: "2c2t_inputPreviewMotdOpen",
        inputPreviewTextOpen: "2c2t_inputPreviewTextOpen",
        textOutputsOpen: "2c2t_textOutputsOpen",
        motdOutputsOpen: "2c2t_motdOutputsOpen",
        pingDetailsOpen: "2c2t_pingDetailsOpen",
        pingRawOpen: "2c2t_pingRawOpen",
        motdImportOpen: "2c2t_motdImportOpen",
        motdOptionsOpen: "2c2t_motdOptionsOpen",
        lastPingData: "2c2t_lastPingData",
        lastSaved: "2c2t_lastSaved",
        outputColorFormats: "2c2t_outputColorFormats"
      };

      const HISTORY_LIMIT = 80;
      const MC_MOTD_LINE_WIDTH = 130;
      const OBFUSCATED_CHARSET = "!@#$%^&*()_+-=[]{}|;:,.<>?/~ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      const PALETTE_CATEGORY_ORDER = ["Ranks", "Semantic", "Content", "Vanilla"];
      const PALETTE_CATEGORY_LABELS = {
        Vanilla: "Vanilla · 16 màu gốc",
        Ranks: "Rank colors",
        Semantic: "Semantic / trạng thái",
        Content: "Content / chat"
      };

      /* =========================
         DOM
      ========================== */
      const $ = (selector, root = document) => root.querySelector(selector);
      const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

      const dom = {
        palette: $("#palette"),
        paletteScrim: $("#paletteScrim"),
        togglePalette: $("#togglePalette"),
        paletteToggleIcon: $("#paletteToggleIcon"),
        paletteSyntaxLabel: $("#paletteSyntaxLabel"),
        search: $("#search"),
        categoryChips: $("#categoryChips"),
        paletteList: $("#paletteList"),
        sharedSyntaxSelect: $("#sharedSyntaxSelect"),
        sharedColorToolbar: $("#sharedColorToolbar"),
        sharedFormatToolbar: $("#sharedFormatToolbar"),
        sharedAlignmentToolbar: $("#sharedAlignmentToolbar"),
        customColor: $("#toolbarCustomColor"),
        textRaw: $("#textRaw"),
        textCharCounter: $("#textCharCounter"),
        textPreview: $("#textPreview"),
        textOutputs: $("#textOutputs"),
        textPreset: $("#textPreset"),
        motdRaw: $("#motdRaw"),
        motdPreset: $("#motdPreset"),
        motdLineCounter: $("#motdLineCounter"),
        motdInputPreview: $("#motdInputPreview"),
        textInputPreview: $("#textInputPreview"),
        motdOutputs: $("#motdOutputs"),
        motdPreviewLine1: $("#motdPreviewLine1"),
        motdPreviewLine2: $("#motdPreviewLine2"),
        motdPreviewPlayers: $("#motdPreviewPlayers"),
        serverIconWrapper: $("#serverIconWrapper"),
        serverIconPreview: $("#serverIconPreview"),
        serverIconPlaceholder: $("#serverIconPlaceholder"),
        iconUpload: $("#motdIconUpload"),
        importAddress: $("#motdImportAddress"),
        importBtn: $("#motdImportBtn"),
        importStatus: $("#motdImportStatus"),
        importBadge: $("#motdImportBadge"),
        serverPingDetails: $("#serverPingDetails"),
        saveStatus: $("#saveStatus"),
        languageToggle: $("#languageToggle"),
        toast: $("#toast")
      };

