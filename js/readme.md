# Web Desktop Simulator

A browser-based desktop environment simulation built with vanilla JavaScript, CSS, and HTML. Features a boot sequence, draggable windows, start menu, and interactive update flow.

![Demo](https://img.shields.io/badge/demo-available-purple)

## 🎯 Features

- **Boot Sequence** – Animated startup screen with logo and loading indicator
- **Desktop Environment** – Full-screen virtual desktop with icons
- **Window Management** – Create, drag, minimize, maximize, and close windows
- **Start Menu** – Pop-up application launcher with pinned items
- **Update Simulation** – Interactive Windows Update flow that gates content access
- **Persistent Documents** – LocalStorage-backed text file that unlocks after "updates"
- **System Tray** – Live clock and date display

## 🚀 Quick Start

### Deploy to GitHub Pages (Recommended)

1. Create a new repository on GitHub
2. Upload all files from this project
3. Go to **Settings → Pages**
4. Select branch: `main`, folder: `/ (root)`
5. Click **Save**
6. Your site will be live at: `https://<username>.github.io/<repo-name>/`

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/web-desktop-simulator.git
cd web-desktop-simulator

# Serve locally (any of these will work)
python3 -m http.server 8000
# OR
npx serve .
# OR just open index.html in browser (some features may be limited)