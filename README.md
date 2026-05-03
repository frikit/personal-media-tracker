# Watchlist Tracker

A self-contained watchlist tracker for top-rated TV shows, movies, anime films, and anime TV from 2010–2026 (IMDb 8.1+).

## The model

There is no backend, no database, no auth. **Your watchlist is just three JSON files in a Git repo, and you persist changes by committing them.**

The intended workflow:

1. **Fork this repo** — the fork *is* your watchlist. Your data lives there.
2. **Run it locally** (or open it from a Pages preview) — the page reads the JSON files and renders the UI.
3. **Make changes** — tick things as watched, skip what you don't want, etc.
4. **Click "Save changes"** — the page downloads the three updated JSON files to your machine.
5. **Replace the files in your local clone of the fork and commit & push.** That commit *is* the save.

> **GitHub Pages does not save your changes.** Pages serves static files. Clicking "Save changes" on a hosted Pages site only downloads JSON files to your computer — nothing reaches the server. To persist anything you have to commit those downloaded files back to your fork. Treat Pages as a read-only viewer of whatever is currently committed.

For that reason, the most ergonomic setup is to work locally against your clone, not against the Pages URL.

## The three files

| File            | Purpose                                              |
| --------------- | ---------------------------------------------------- |
| `to-watch.json` | Entries you haven't watched yet (the master list)    |
| `watched.json`  | Entries you've marked as watched                     |
| `skipped.json`  | Entries you've skipped / aren't interested in        |

`index.html` fetches all three on load and renders the UI from them.

## Setup

1. Fork the repo.
2. Clone your fork locally.
3. Run the bundled server (Node 18+ required, no dependencies):
   ```bash
   node server.js
   ```
   It serves the directory *and* accepts `PUT` for the three JSON files, so the page can save state directly to disk. If the server isn't running, **Save changes** falls back to downloading the JSON files.
4. Open `http://localhost:8000`.
5. Make changes → **Save changes** → the three JSON files in your clone are overwritten in place. Works in any browser (Safari, Firefox, Chrome, Edge).
6. Commit and push: `./push.sh "watched Chernobyl"` (or `git add . && git commit -m "..." && git push`).

You can optionally enable GitHub Pages on your fork (**Settings → Pages → Source → main**) to get a hosted read-only view of your latest committed state. It is *not* a save target.

## Features

- 190 entries across 4 categories: TV shows (69), movies (60), anime films (15), anime TV (46)
- Poster preview on hover (images bundled in `posters/`, no runtime API calls)
- Filter by category (TV / Movies / Anime Films / Anime TV)
- View modes: All / Unwatched / Watched / Skipped
- Search across all entries
- Skip entries you're not interested in (moves to `skipped.json`)
- Unsaved-changes warning before closing the tab
- Fully offline — fonts, posters, CSS, and JS all live in the repo

## Adding new entries

Edit `to-watch.json` and add entries in this format:

```json
{
  "id": "t070",
  "title": "Your Show Here",
  "rating": 8.5,
  "year": 2025,
  "meta": "Network, Genre",
  "category": "tv"
}
```

Categories: `tv`, `movie`, `anime-movie`, `anime-tv`

## Data

All ratings are from IMDb. Only entries rated above 8.0 are included. Entries span 2010–2026.
