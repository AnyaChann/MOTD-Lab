      let language = localStorage.getItem(LANGUAGE_STORAGE_KEY) === "en" ? "en" : "vi";
      const t = (key, vars = {}) => {
        const parts = key.split(".");
        let value = I18N[language];
        for (const part of parts) value = value?.[part];
        if (typeof value !== "string") return key;
        return value.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? `{${name}}`);
      };
      const langT = (vi, en) => language === "en" ? en : vi;

      /* =========================
         Data
      ========================== */
      const colors = [
        { category: "Ranks", role: "Veteran rank", hex: "#F5C242", name: "Gold", legacy: "&6", usage: "Veteran" },
        { category: "Ranks", role: "Member rank", hex: "#FFFFFF", name: "White", legacy: "&f", usage: "Member" },
        { category: "Ranks", role: "Default rank", hex: "#AAAAAA", name: "Gray", legacy: "&7", usage: "Default" },
        { category: "Semantic", role: "Success", hex: "#55FF55", name: "Green", legacy: "&a", usage: "Thành công" },
        { category: "Semantic", role: "Info", hex: "#5DADE2", name: "Info Blue", legacy: "&9", usage: "Thông tin" },
        { category: "Semantic", role: "Warning", hex: "#FFAA00", name: "Gold", legacy: "&6", usage: "Cảnh báo" },
        { category: "Semantic", role: "Error", hex: "#FF5555", name: "Red", legacy: "&c", usage: "Lỗi thông thường" },
        { category: "Semantic", role: "Critical / Danger", hex: "#DC143C", name: "Crimson", usage: "Ban, đổi pass, lỗi nghiêm trọng" },
        { category: "Content", role: "Command / Keyword", hex: "#FFFFFF", name: "White", legacy: "&f", usage: "Tên lệnh, keyword" },
        { category: "Content", role: "Description", hex: "#AAAAAA", name: "Gray", legacy: "&7", usage: "Mô tả nội dung" },
        { category: "Content", role: "Separator", hex: "#555555", name: "Dark Gray", legacy: "&8", usage: "Đường kẻ phân cách" },
        { category: "Vanilla", role: "Black", hex: "#000000", name: "Black", legacy: "&0", mini: "black" },
        { category: "Vanilla", role: "Dark Blue", hex: "#0000AA", name: "Dark Blue", legacy: "&1", mini: "dark_blue" },
        { category: "Vanilla", role: "Dark Green", hex: "#00AA00", name: "Dark Green", legacy: "&2", mini: "dark_green" },
        { category: "Vanilla", role: "Dark Aqua", hex: "#00AAAA", name: "Dark Aqua", legacy: "&3", mini: "dark_aqua" },
        { category: "Vanilla", role: "Dark Red", hex: "#AA0000", name: "Dark Red", legacy: "&4", mini: "dark_red" },
        { category: "Vanilla", role: "Dark Purple", hex: "#AA00AA", name: "Dark Purple", legacy: "&5", mini: "dark_purple" },
        { category: "Vanilla", role: "Gold", hex: "#FFAA00", name: "Gold", legacy: "&6", mini: "gold" },
        { category: "Vanilla", role: "Gray", hex: "#AAAAAA", name: "Gray", legacy: "&7", mini: "gray" },
        { category: "Vanilla", role: "Dark Gray", hex: "#555555", name: "Dark Gray", legacy: "&8", mini: "dark_gray" },
        { category: "Vanilla", role: "Blue", hex: "#5555FF", name: "Blue", legacy: "&9", mini: "blue" },
        { category: "Vanilla", role: "Green", hex: "#55FF55", name: "Green", legacy: "&a", mini: "green" },
        { category: "Vanilla", role: "Aqua", hex: "#55FFFF", name: "Aqua", legacy: "&b", mini: "aqua" },
        { category: "Vanilla", role: "Red", hex: "#FF5555", name: "Red", legacy: "&c", mini: "red" },
        { category: "Vanilla", role: "Light Purple", hex: "#FF55FF", name: "Light Purple", legacy: "&d", mini: "light_purple" },
        { category: "Vanilla", role: "Yellow", hex: "#FFFF55", name: "Yellow", legacy: "&e", mini: "yellow" },
        { category: "Vanilla", role: "White", hex: "#FFFFFF", name: "White", legacy: "&f", mini: "white" }
      ];

      // Mỗi preset giới thiệu một color format: dòng 1 là tên format, dòng 2 là ví dụ màu + style.
      // Gradient/rainbow trong preview chỉ được mô phỏng bằng một màu trung bình.
      const FORMAT_PRESETS = {
        fmtLegacy: "&b&lLegacy Color Codes\n&aGreen &eYellow &cRed &7· &lBold &r&nUnderline",
        fmtSection: "§6§lRaw Section Codes\n§aGreen §eYellow §cRed §7· §lBold §r§nUnderline",
        fmtBukkit: "&x&4&2&D&4&F&5&lBukkit Hex Colors\n&x&F&F&4&D&6&BRed &x&5&5&F&F&9&AGreen &x&4&2&D&4&F&5Cyan &x&F&F&D&1&6&6&nGold",
        fmtMini: "<#42D4F5><b>MiniMessage</b> Tags</#42D4F5>\n<green>Green</green> <yellow><i>Italic</i></yellow> <red><st>Strike</st></red> <u>Under</u>",
        fmtGradient: "<gradient:#42D4F5:#FF4D6B><b>MiniMessage Gradient</b></gradient>\n<gradient:#55FF9A:#42D4F5:#FF4D6B>Three color stops</gradient>",
        fmtIridium: "<SOLID:42D4F5>&lIridiumColorAPI\n&r<GRADIENT:42D4F5>Gradient</GRADIENT:FF4D6B> <RAINBOW1>Rainbow</RAINBOW>"
      };

      const TEXT_PRESETS = {
        ...FORMAT_PRESETS,
        empty: "",
        starter: "&b&lWelcome &7to your server",
        help: "&b/list &8(/who) &7— &dXem ai đang online",
        whisper: "<light_purple><player_name> thì thầm: <message>",
        status: "&a&l✔ Saved &6&l⚠ Check config &c&l✖ Error"
      };

      const TEXT_PRESETS_EN = {
        help: "&b/list &8(/who) &7— &dSee who is online",
        whisper: "<light_purple><player_name> whispers: <message>"
      };

      const MOTD_PRESETS = {
        ...FORMAT_PRESETS,
        empty: "",
        starter: "&b&lWelcome &7to your server\n&aSurvival &8· &6Online",
        plain: "A Minecraft Server\n&7A clean second line"
      };

      const ALIGNMENT_BUTTONS = [
        { value: "left", title: "Align left", icon: `<path d="M5 6h14M5 12h10M5 18h14"/>` },
        { value: "center", title: "Align center", icon: `<path d="M7 6h10M5 12h14M7 18h10"/>` },
        { value: "right", title: "Align right", icon: `<path d="M5 6h14M9 12h10M5 18h14"/>` }
      ];

      const FORMAT_BUTTONS = [
        { format: "bold", className: "code-bold", strokeWidth: 2.5, title: "Bold (&l / <bold>)", icon: `<path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>` },
        { format: "strikethrough", className: "code-strikethrough", strokeWidth: 2.5, title: "Strikethrough (&m / <strikethrough>)", icon: `<path d="M18 7a4 4 0 0 0-4-3h-4a4 4 0 0 0-4 4 4 4 0 0 0 4 4h4a4 4 0 0 1 4 4 4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4"/><line x1="2" y1="12" x2="22" y2="12"/>` },
        { format: "underline", className: "code-underline", strokeWidth: 2.5, title: "Underline (&n / <underlined>)", icon: `<path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" y1="20" x2="20" y2="20"/>` },
        { format: "italic", className: "code-italic", strokeWidth: 2.5, title: "Italic (&o / <italic>)", icon: `<line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/>` },
        { format: "obfuscated", className: "code-obfuscated", strokeWidth: 2, title: "Obfuscated (&k / <obfuscated>)", icon: `<polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/>` },
        { format: "reset", className: "", strokeWidth: 2, title: "Reset (&r / <reset>)", icon: `<path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>` },
        { format: "linebreak", className: "", strokeWidth: 2, title: "Xuống dòng (\\n / <newline>)", icon: `<path d="M9 10l-5 5 5 5M20 4v7a4 4 0 0 1-4 4H4"/>` }
      ];

