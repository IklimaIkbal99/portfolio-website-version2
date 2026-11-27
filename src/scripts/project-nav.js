// Case study sidebar: highlights the section in view, fills the progress rail
// and scrolls smoothly when a section is picked.

const items = [...document.querySelectorAll('.toc-i')];
const links = items.map((item) => item.querySelector('.toc-a'));
const fill = document.querySelector('.toc-fill');
const sections = [...document.querySelectorAll('[data-sec]')];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

links.forEach((link) => {
  link.addEventListener('click', (event) => {
    const target = document.querySelector(link.hash);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', link.hash);
  });
});

let frame = 0;
let current = -1;

function update() {
  frame = 0;
  const count = sections.length;
  if (!count) return;

  const root = document.documentElement;
  const viewport = window.innerHeight;
  let active = 0;
  let progress = 0;

  if (root.scrollHeight - viewport > 4) {
    // A section becomes active once its top passes a line 32% down the screen.
    const probe = viewport * 0.32;
    sections.forEach((section, i) => {
      if (section.getBoundingClientRect().top <= probe) active = i;
    });
    const box = sections[active].getBoundingClientRect();
    progress = box.top > probe ? 0 : Math.min(1, Math.max(0, (probe - box.top) / Math.max(1, box.height)));
    if (window.scrollY + viewport >= root.scrollHeight - 4) {
      active = count - 1;
      progress = 1;
    }
  }

  const filled = count > 1 ? Math.min(1, (active + progress) / (count - 1)) : 1;
  if (fill) fill.style.height = `${(filled * 100).toFixed(1)}%`;

  if (active !== current) {
    current = active;
    items.forEach((item, i) => {
      item.dataset.st = i < active ? 'done' : i === active ? 'on' : 'next';
      links[i].setAttribute('aria-current', i === active ? 'true' : 'false');
    });
  }
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(update);
}

window.addEventListener('scroll', schedule, { passive: true });
window.addEventListener('resize', schedule);
update();
