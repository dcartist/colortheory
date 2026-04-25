# Color Theory Studio

An interactive color harmony explorer with real-time 3D sphere previews, built with Next.js 14 and React 18.

## Features

- **Color Wheel** — drag the hue ring to pick any color
- **HSL Sliders** — precise hue, saturation, and lightness control
- **6 Harmony Types** — complementary, analogous, triadic, split-comp, monochromatic, tetradic
- **3 Display Modes** — three balls, segmented single ball, lit-surface 3D shading
- **Light/Dark Mode** — smooth theme transition, WCAG AA contrast compliant
- **Section 508 Accessible** — focus rings, ARIA labels, semantic landmarks, live regions

## Getting Started

```bash
# Install dependencies
npm install

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deploy to Vercel

### Option A — Vercel CLI

```bash
npm i -g vercel
vercel
```

### Option B — GitHub + Vercel Dashboard

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import the repository
4. Vercel auto-detects Next.js — click **Deploy**

No environment variables required.

## Project Structure

```
src/
  app/
    layout.jsx      # Root layout with metadata + Google Fonts
    page.jsx        # Entry point
    globals.css     # CSS reset
  components/
    ColorTheoryApp.jsx  # Full app (color wheel, sliders, spheres)
```

## Tech Stack

- [Next.js 14](https://nextjs.org/) (App Router)
- React 18
- Canvas API for sphere rendering
- No external UI libraries
