# SyncJam — Replit Agent Build Specification

## Core Idea

Build a lightweight, mobile-first web app called **SyncJam**.

SyncJam is a Spotify-Jam-style shared music room where multiple phones become synchronized speaker nodes.

Users open the web app in a normal browser. No native Android/iOS app is required.

## Target Browsers

- Android: Brave and Firefox
- iOS: Brave and Firefox
- Also support Chrome/Safari where possible
- Do not require browser extensions.
- Do not require installing an app.
- The app must work as a normal HTTPS website.

## Important MVP Rule

Do **not** build a full Spotify clone.

Do **not** add:

- user accounts
- authentication
- payments
- recommendations
- social profiles
- playlists
- unnecessary database systems
- native mobile apps

The priority is proving that multiple physical phones can play the same YouTube video in synchronization.

---

## User Flow

### 1. Open SyncJam

Main screen:

- **Create Room**
- **Join Room**

### 2. Create Room

Generate:

- short room code, e.g. `A7K9Q`
- shareable room URL
- QR code

### 3. Join Room

Users enter or scan the room code/link.

Before audio playback, show:

> Enable Audio

because mobile browsers may block autoplay.

### 4. Every Phone Becomes a Node

Example:

```text
Room A7K9Q

🟢 You — +4 ms
🟢 Rahul — -8 ms
🟢 iPhone — +13 ms
```

### 5. Load a YouTube Video

The host enters a YouTube URL or video ID.

Every node loads the same YouTube video through the official YouTube IFrame Player API.

The YouTube video/audio is **not streamed through our server**.

Each phone gets its own playback directly from YouTube.

---

## Architecture

Use:

### Frontend

- React
- Vite
- TypeScript if practical
- Mobile-first responsive UI

### Backend

- Node.js
- WebSocket for real-time synchronization

The server should maintain:

- room
- host
- connected nodes
- current video ID
- playback state
- play/pause state
- timeline
- server clock

The server should **not** transmit decoded audio.

Architecture:

```text
                 YouTube
                    │
          ┌─────────┼─────────┐
          ↓         ↓         ↓
        Phone A   Phone B   Phone C
        Brave     Firefox   Brave
          🔊        🔊        🔊
             \      |      /
              \     |     /
               WebSocket
                   │
             SyncJam Server
```

---

## Synchronization

This is the **most important technical requirement**.

Do **not** simply send:

> PLAY NOW

to every phone.

Network latency differs between devices.

Instead implement a server-authoritative timeline.

Example:

```text
Server:

PLAY
videoId = X
startAt = serverTime + 2000 ms
```

Every client calculates when it should start based on its estimated server-clock offset.

Implement NTP-style timestamp synchronization:

- Client sends timestamp
- Server responds with timestamp
- Client estimates clock offset
- Client estimates round-trip time

Maintain:

- `serverTime`
- `clientTime`
- `clockOffset`
- `roundTripTime`
- `expectedPlaybackPosition`
- `actualPlaybackPosition`
- `syncError`

Display sync error during development.

Example:

```text
You: +4 ms
Phone B: -11 ms
Phone C: +17 ms
```

---

## Drift Correction

Phones have different audio clocks and will slowly drift.

Periodically calculate:

```text
syncError = expectedPosition - actualPosition
```

Do **not** constantly seek the YouTube player.

For small errors, use gradual correction where the YouTube player/browser allows it.

For larger errors, perform a controlled seek.

Avoid synchronization feedback loops.

The goal is stable synchronization rather than repeatedly jumping playback.

Do not claim "millisecond perfect" synchronization unless measurements on physical devices actually demonstrate it.

---

## Late Joining

If a new phone joins while the song is already playing:

1. Get current room state.
2. Calculate current server timeline position.
3. Load the YouTube video.
4. Seek to the appropriate position.
5. Join the existing timeline.

It should **not** restart the song from 0.

---

## Reconnecting

If a phone disconnects:

- Remove or mark the node appropriately.

If it reconnects:

- Recalculate clock offset.
- Get current room state.
- Resynchronize with the current playback position.

---

## YouTube

Use the official YouTube IFrame Player API / supported embedded player.

Do **not**:

- download YouTube videos
- extract YouTube audio
- proxy YouTube audio through the server
- redistribute YouTube audio
- bypass DRM or access controls

The app only coordinates playback of the embedded YouTube player.

Users provide YouTube video URLs/IDs.

---

## Browser Requirements

The application must run entirely as a normal web application.

Do **not** require:

- Android application
- iOS application
- browser extension
- native installation

Target:

### Android

- Brave
- Firefox
- Chrome

### iOS

- Brave
- Firefox
- Safari

Important:

iOS browsers use Apple's WebKit platform underneath, so do not assume Chromium-only APIs exist.

Use browser feature detection and graceful fallbacks.

Handle mobile autoplay restrictions by requiring explicit user interaction such as:

> **ENABLE AUDIO**

before attempting synchronized playback.

Do not depend on background-tab execution for the core MVP.

The first MVP assumes users keep the SyncJam page active.

---

## UI

Keep the UI extremely simple.

### Home

```text
SYNCJAM

Turn phones into a synchronized speaker system.

[ CREATE ROOM ]

[ JOIN ROOM ]
```

### Room

```text
SYNCJAM

Room: A7K9Q

[ QR CODE ]

YouTube URL:
[________________________]
[ LOAD ]

Now Playing:
Video title

[ ▶ PLAY ] [ ⏸ PAUSE ]

Connected Speakers:

🟢 You — +4 ms
🟢 Rahul — -8 ms
🟢 iPhone — +13 ms

Host:
You
```

---

## Debug Mode

Create a development/debug panel showing:

- server time
- local time
- clock offset
- round-trip time
- expected playback position
- actual playback position
- synchronization error
- current playback state
- correction events
- connection state

This is important because synchronization must be experimentally measured on real phones.

---

## Existing Open-Source Projects

Before writing a synchronization engine from scratch, inspect these projects:

### SyncTune

https://github.com/synctune/synctune

### Beatsync

https://github.com/freeman-jiang/beatsync

### MUSIXQUARE

https://github.com/hiefny/MUSIXQUARE

### SyncPlay

https://github.com/MatthewCarven/SyncPlay

Study their architecture and synchronization methods.

Check their licenses before reusing code.

Reuse/adapt code only when the license permits it.

If code is reused, preserve the required license/attribution.

Do not blindly copy entire projects.

The goal is to reuse proven synchronization concepts rather than reinventing everything.

---

## Development Milestones

Work incrementally.

### Milestone 1

Create/join room.

### Milestone 2

Two physical phones can connect to the same room.

### Milestone 3

Both phones load the same YouTube video.

### Milestone 4

Host play/pause/seek controls both phones.

### Milestone 5

Implement server-clock synchronization.

### Milestone 6

Schedule playback using a future server timestamp.

### Milestone 7

Measure synchronization error.

### Milestone 8

Implement drift correction.

### Milestone 9

Support late joining and reconnection.

### Milestone 10

Add QR sharing and polish the mobile UI.

Do **not** move to complicated features until the previous milestone works.

---

## Testing

The primary test is **not** the desktop browser.

Test on physical:

- Android + Brave
- Android + Firefox
- iPhone + Brave
- iPhone + Firefox

Start with two phones.

Then test:

```text
2 → 3 → 5+ devices
```

Measure actual synchronization rather than assuming it works.

For early testing, use a YouTube video with a clear rhythmic beat or sharp transient so timing differences are easier to hear/measure.

---

## Important Development Behavior

Do not overengineer.

Do not create unnecessary services.

Do not replace working synchronization code without a reason.

Do not build features that aren't required for the MVP.

Prioritize:

1. Two phones
2. Same YouTube video
3. Shared playback controls
4. Accurate shared timeline
5. Measurable synchronization
6. Drift correction

Only after that should the UI and additional features be expanded.

---

## First Task

Inspect the four referenced open-source projects and their licenses.

Explain briefly which synchronization approach is most suitable for this project.

Then implement **Milestone 1 and Milestone 2**.

Do not attempt to build the entire application in one giant step.
