# MOTD Lab

MOTD Lab is a comprehensive Minecraft MOTD (Message of the Day) designer: write, preview exactly how it looks in the server list, then copy it in the format your server needs.

## Features

- **Faithful Preview**: The preview uses the real 271px, two-line text area of Minecraft's server list, with a per-character width counter to ensure your MOTD fits perfectly.
- **Multiple Output Formats**: Convert between Legacy &, Raw §, Bukkit &x, MiniMessage, and IridiumColorAPI. Conversions that are only approximate are clearly noted.
- **Get MOTD from Server**: Enter a server address to ping it and load its MOTD, icon, version, and player count directly into the editor.
- **Fast to Write**: Integrated color codes, alignment tools, undo/redo, presets, and an Input Preview that shows exactly which text each tag affects.

## Getting Started

Since this is a client-side web application, you can run it simply by opening `index.html` in any modern web browser.

## Privacy

Your data is handled with a local-first approach:
- **Local Storage**: Everything you write is stored only in your browser's `localStorage`; no account is required.
- **External Requests**: 
  - **Ping & Import**: Sends the server address you enter to `api.mcstatus.io`.
  - **About Page**: Requests the latest release information from `api.github.com`.
- **No Data Uploads**: None of the content you write or design is ever sent to any server.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
