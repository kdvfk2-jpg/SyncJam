---
name: YouTube IFrame lifecycle
description: A lifecycle constraint for safely controlling the official YouTube IFrame player.
---

The YouTube IFrame API can expose a player object before every control and read method is callable. Treat player methods as temporarily unavailable until the API reports readiness, and guard polling, duration reads, playback, pause, and seek calls.

**Why:** The local preview reached the polling loop while `getCurrentTime` was not yet available, which caused a runtime overlay even though the TypeScript interface described the eventual player shape.

**How to apply:** Keep player polling and control methods defensive around API initialization and teardown; skip a read or command until the method exists instead of assuming the object is fully initialized.