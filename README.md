# İklima İkbal Türköz — Portfolio

Personal portfolio of İklima İkbal Türköz, interaction and UI/UX designer in Milan.
Built with [Astro](https://astro.build) as a static site: plain HTML, CSS and a little JavaScript, no framework at runtime.

## Run it locally

You need [Node.js](https://nodejs.org) 22.12 or newer.

```bash
npm install      # once, after cloning
npm run dev      # starts http://localhost:4321 and reloads on every save
npm run build    # builds the site into dist/
npm run preview  # serves the built dist/ folder
npm run format   # tidies every file with Prettier
```

## Where things live

```
src/
  pages/                 one file per page, the file name is the URL
    index.astro          /            home gallery
    about.astro          /about
    contact.astro        /contact
    projects/*.astro     /projects/echo, /projects/nuru, ...
  layouts/
    BaseLayout.astro     <head>, fonts and the stylesheets of every page
    ProjectLayout.astro  case study shell: sidebar card, section list, previous / next
  data/projects.js       project titles, meta, badges, section list and their order
  scripts/               small vanilla JS files (sidebar, tabs, before/after slider, home gallery)
  styles/
    tokens.css           colours and the font stack
    base.css             reset, links, focus ring, shared motion
    project.css          case study layout shared by every project
    components/*.css     reusable pieces: tabs, diagrams, browser frame, slider, marquee...
    projects/*.css       styles used by one case study only
    pages/*.css          home, about and contact
    reveal.css           scroll reveal, linked last
public/
  media/<project>/       images and videos, named after what they show
  favicon.svg
```

Each page links its stylesheets in a fixed order: tokens, base, project, components, the page's own file, then reveal.
A rule in a later file wins over the same rule in an earlier one.

## Editing

- **Text and images of a case study:** `src/pages/projects/<name>.astro`.
- **Sidebar title, meta, badges or section names:** `src/data/projects.js`. The order of that list sets the previous / next links.
- **A colour or the typeface everywhere:** `src/styles/tokens.css`.
- **A new image or video:** put it in `public/media/<project>/` and reference it as `/media/<project>/<file>`.
  Use `.webp` for images and `.mp4` (H.264) for video. Keep single files under 25 MB.

## Deploy (Cloudflare)

The site deploys from GitHub to Cloudflare Workers as static assets (`wrangler.jsonc`).

1. Cloudflare dashboard → Workers & Pages → Create → Import a repository → pick this repo.
2. Build command: `npm run build`. Deploy command: `npx wrangler deploy`.
3. After the first deploy, add your domain under the Worker's Settings → Domains & Routes.

Every push to `main` then builds and publishes the site.
