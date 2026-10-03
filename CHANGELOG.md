# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/). Versioning: [SemVer](https://semver.org/).
The version of record is `APP_VERSION` in `src/js/03-release.js`; a tag that differs from it will not be published.

## [1.0.0] - 2026-10-02

First release.

### Added
- MOTD Generator: edit a two-line server-list MOTD with a live preview at Minecraft's 271px width, with an over-limit indicator.
- Universal editor: free-form text with live output.
- Input map: click a tag in the source to see which text it affects.
- Input syntaxes: legacy `&` / `§`, Bukkit `&x` hex, `&#rrggbb`, MiniMessage, IridiumColorAPI, gradient and rainbow (per-character preview).
- Output targets: server.properties, velocity.toml, BungeeCord / Waterfall, ServerListPlus, Raw §, Bukkit `&x`, MiniMessage, IridiumColorAPI. Approximate conversions are labelled.
- Left / center / right alignment using Minecraft glyph widths.
- Get MOTD from server: ping an address through api.mcstatus.io and load the MOTD, icon, version and player count, with a ping snapshot. Gives up after 10 seconds with its own message.
- Format Notes and About pages; Vietnamese and English UI.
- Autosave to localStorage, undo / redo, presets. Saved data carries a schema version so later releases can migrate it safely.
- About shows this build's version and tells you when a newer GitHub release exists.

### Notes
- Colour handling follows Minecraft: a colour code clears bold/italic/underline/strikethrough/obfuscated. This includes Iridium `<SOLID>`, `<GRADIENT>` and `<RAINBOW>` tags, which compile to colour codes. MiniMessage colour tags keep decorations, as Adventure does.
- Converting to legacy `&` codes is approximate for hex colours, gradients and rainbow, because legacy has only 16 colours.
