// @ts-check
import { defineConfig } from 'astro/config';

// Static site: every page is built to plain HTML in dist/.
// build.format 'file' gives clean URLs such as /about and /projects/echo.
export default defineConfig({
  build: { format: 'file' },
  vite: {
    build: {
      // Tell the CSS minifier which browsers we target, so it keeps
      // scroll-driven animation properties (animation-timeline) intact.
      cssTarget: ['chrome115', 'edge115', 'firefox115', 'safari16'],
    },
  },
});
