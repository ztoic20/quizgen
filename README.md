# QuizGen – Progressive Web App

A quiz application that loads questions from CSV files or uses built-in questions.

## Features

- One question at a time (paged)
- No scrolling (fixed viewport) to prevent shaking
- Randomizes question order each load
- Answer checking is case-insensitive and space-insensitive (also ignores most punctuation)
- Wrong answers: must type correct answer to proceed OR Skip (counts wrong)
- Offline-ready (PWA with service worker)
- Installable as a standalone app

## Setup

Open `index.html` in any modern browser.

For PWA functionality:
- The app can be installed on supported devices
- Works offline after first load
- Icons need to be added: `icon-192.png` and `icon-512.png` in the root directory

## PWA Conversion

This app has been converted to a Progressive Web App with:
- Web App Manifest (`manifest.json`)
- Service Worker (`sw.js`) for offline caching
- Updated HTML with manifest link
- Service worker registration in JavaScript
