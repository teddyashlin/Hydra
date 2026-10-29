# Hydra — desktop water reminder

A small Windows tray app. When it's time to drink, an animated character walks onto the bottom-right
of your desktop, on top of other windows. He waves, holds up a water bottle, and asks
**"Time to drink some water! 💧"** with two buttons: **Yes, I drank** and **Remind me later**.

The character is original vector art (spiky dark hair, beige open hoodie, white tee, backpack straps,
beige trousers, cream sneakers) drawn with SVG and CSS. It doesn't use any assets from the Reel.

## Run it

Requires [Node.js](https://nodejs.org) 18+.

```powershell
cd C:\Users\tashlind\hydra-water-reminder
npm install          # once
npm start            # opens the settings window + tray icon
npm run preview      # same, and immediately shows a reminder
```

On a corporate network that intercepts HTTPS, `npm install` may fail with `SELF_SIGNED_CERT_IN_CHAIN`.
Run `$env:NODE_OPTIONS='--use-system-ca'` first so Node trusts the Windows certificate store.

### Build a double-click app (optional)

```powershell
npm run dist         # creates dist\Hydra Setup 1.0.0.exe (installer) and dist\Hydra 1.0.0.exe (portable)
```

## Using it

- Closing the settings window keeps Hydra running in the **system tray** (💧 icon near the clock).
  Right-click the tray icon for *Show reminder now*, *I just drank water*, *Pause/Resume*,
  *Start with Windows*, and *Quit*.
- **Every interval** mode reminds you every N minutes between *Start of day* and *Wind down*.
  **Specific times** mode reminds you at exact 24-hour times such as `09:00, 11:30, 14:00`.
  Pick **1 minute (for testing)** to see it working quickly.
- **Yes, I drank** logs a glass and restarts the interval. **Remind me later** comes back after the
  snooze time (5–30 min). **✕** or `Esc` dismisses until the next regular reminder.
- If you ignore a reminder for 90 seconds, he walks away and comes back after the snooze time.
- **Wait while I'm away**: if the PC has been idle for 5+ minutes or is locked, the reminder waits until you're back.
- After sleep or hibernate, a missed reminder is shown once when you return, not repeatedly.

## Why it doesn't lag

- The scheduler runs in Electron's main process using real clock timestamps. It doesn't count down, so
  timers can't drift, and it re-checks after sleep/resume, unlock, and clock changes.
- The overlay window is created once and kept hidden, so showing a reminder is instant. It never takes
  keyboard focus, so it won't interrupt your typing.
- All animation uses GPU-composited `transform`s. Nothing animates while the character is off screen.
- The transparent parts of the overlay are click-through. Only the bubble and the character catch the mouse.
- Windows' *reduce motion* setting is honoured: no walking, the character just appears.

## Files

| File | Purpose |
| --- | --- |
| `main.js` | Tray, scheduler, persistence, overlay and settings windows |
| `preload.js` | Safe bridge between windows and the main process |
| `src/character.js`, `src/character.css` | The SVG character and its animations (idle, walk, wave, cheers, blink) |
| `src/overlay.html`, `src/overlay.js` | The desktop pop-up: walk-in, speech bubble, buttons, chime |
| `src/settings.html`, `src/settings.js` | Settings and today's progress |
| `src/drop-icon.js`, `scripts/make-icon.js` | Generates the water-drop tray/app icon |

Settings and history are stored in `%APPDATA%\Hydra\hydra-store.json`.
