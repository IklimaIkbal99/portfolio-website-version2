// Home gallery: the drawn planes you can drag through, the project captions
// and the About / Contact boxes on the rails. Picking the project in the centre
// (click, tap or Enter) opens its case study directly.
// initGallery(root) returns { destroy } to stop every listener and animation.

export function initGallery(root) {
  const doc = root.ownerDocument,
    win = doc.defaultView || window;
  const q1 = (s) => root.querySelector(s),
    qa = (s) => Array.from(root.querySelectorAll(s));
  const rpns = Array.from(root.querySelectorAll('[data-rpn]'));
  const stage = q1('[data-stage]'),
    svg = q1('[data-ln]'),
    dots = q1('[data-dots]'),
    hint = q1('[data-hint]'),
    live = q1('[data-live]');
  const byIdx = (attr) => qa('[' + attr + ']').sort((a, b) => a.getAttribute(attr) - b.getAttribute(attr));
  const els = byIdx('data-pl'),
    caps = byIdx('data-cap');
  const N = els.length;
  const mq = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const RM = () => !!(mq && mq.matches);
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const wrap = (x) => ((((x + N / 2) % N) + N) % N) - N / 2;
  const mod = (x) => ((x % N) + N) % N;
  const eo = (x) => 1 - Math.pow(1 - x, 3);

  /* Reference composition, in a 1672 × 941 design frame.
   Slots run from s = -4 to 4; the centre (s = 0) faces the viewer, every other plane is square and turned 90° to face left. */
  const D = {
    X: [28, 178, 344.5, 525, 841, 1176, 1365, 1498, 1620],
    Y: [846.8, 781.7, 709.5, 631.1, 494, 348.6, 266.6, 208.9, 155.9],
    S: [120, 142, 170, 212, 222, 205, 188, 160, 135],
    CW: 486,
    CH: 336.5,
    CA: 1.444,
    fa: 0.86,
    ka: -0.434,
    fb: 0.9,
    kb: 0.28,
    RP1: [
      [420, 330],
      [570, 264.9],
      [618, 278.3],
      [468, 343.4],
    ],
    RP2: [
      [1353, 700],
      [1503, 634.9],
      [1551, 648.3],
      [1401, 713.4],
    ],
    /* everything sits on one parallel grid: the gallery axis, both rails and the long edges of the small planes run at slope ka (-0.434),
   the short edges at kb (0.28), the uprights are vertical; plane centres lie on a straight line along the axis */
    TOP: [
      [40, 634.1],
      [1230, 117.6],
    ],
    BOT: [
      [480, 935.6],
      [1640, 432.1],
    ],
    V1: [
      [520, 320.8],
      [520, 425.8],
    ],
    V2: [
      [1460, 510.3],
      [1460, 653.6],
    ],
  };
  const cr = (arr, s) => {
    const u = s + 4,
      n = Math.floor(u),
      t = u - n,
      g = (k) => arr[Math.max(0, Math.min(arr.length - 1, k))];
    const p0 = g(n - 1),
      p1 = g(n),
      p2 = g(n + 1),
      p3 = g(n + 2);
    return (
      0.5 *
      (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t)
    );
  };

  /* svg pool */
  const NS = 'http://www.w3.org/2000/svg';
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  const mk = (tag, at) => {
    const e = doc.createElementNS(NS, tag);
    for (const k in at) e.setAttribute(k, at[k]);
    svg.appendChild(e);
    return e;
  };
  const DOT = {
    fill: 'none',
    stroke: '#8C8881',
    'stroke-width': '1.3',
    'stroke-dasharray': '0.1 5.2',
    'stroke-linecap': 'round',
    opacity: '0',
  };
  const L = {
    tl: mk('polyline', DOT),
    v1: mk('polyline', DOT),
    bl: mk('polyline', DOT),
    br: mk('polyline', DOT),
    tr: mk('polyline', DOT),
    v2: mk('polyline', DOT),
    v3: mk('polyline', DOT),
    dl: mk('polyline', DOT),
    rp1: mk('polygon', { fill: 'none', stroke: '#8C8881', 'stroke-width': '1.1', opacity: '0' }),
    rp2: mk('polygon', { fill: 'none', stroke: '#8C8881', 'stroke-width': '1.1', opacity: '0' }),
  };
  const DOTS = [0, 1, 2, 3, 4, 5].map(() => mk('circle', { r: '2.3', fill: '#4E4B46', opacity: '0' }));
  const ptsAttr = (pts) => pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const poly = (e, pts, op) => {
    if (!pts || op <= 0.004) {
      e.setAttribute('opacity', '0');
      return;
    }
    e.setAttribute('points', ptsAttr(pts));
    e.setAttribute('opacity', op.toFixed(3));
  };
  const dotAt = (e, p, op) => {
    if (!p || op <= 0.004) {
      e.setAttribute('opacity', '0');
      return;
    }
    e.setAttribute('cx', p[0].toFixed(1));
    e.setAttribute('cy', p[1].toFixed(1));
    e.setAttribute('opacity', op.toFixed(3));
  };

  const items = els.map((el, i) => {
    const cap = caps[i],
      go = cap.querySelector('[data-go]');
    const ha = parseFloat(el.getAttribute('data-ha')) || 1.4,
      cw = Math.min(290 * ha, 540);
    return {
      el,
      cap,
      ha,
      cw,
      ch: cw / ha,
      hv: 0,
      s: 0,
      q: null,
      ex: 1,
      ei: 0,
      w: 0,
      sq: el.querySelector('[data-sq]'),
      so: -1,
      name: el.getAttribute('aria-label'),
      go,
      href: go ? go.getAttribute('href') : null,
    };
  });

  /* frame of reference: design px → screen px */
  let W = 0,
    H = 0,
    compact = false,
    g = 1,
    ox = 0,
    oy = 0;
  const measure = () => {
    W = root.clientWidth || 1440;
    H = root.clientHeight || 900;
    compact = W < 760;
    if (compact) {
      g = Math.min(W / 700, H / 900);
      ox = W / 2 - 841 * g;
      oy = H * 0.53 - 494 * g;
    } else {
      g = Math.min(W / 1672, H / 941);
      ox = (W - 1672 * g) / 2;
      oy = (H - 941 * g) / 2;
    }
    root.style.setProperty('--g', g.toFixed(4));
    root.style.setProperty('--ox', ox.toFixed(1) + 'px');
    root.style.setProperty('--oy', oy.toFixed(1) + 'px');
  };
  measure();
  const toS = (p) => [ox + g * p[0], oy + g * p[1]];

  /* one plane at slot position s (design px): rotation, size and position all follow s */
  /* the centre plane takes each project's own cover ratio (cw x ch), so its rectangle image shows in full */
  const planeAt = (s, hv, fx, fy, cw, ch) => {
    const as = Math.abs(s);
    let c = clamp(1 - as);
    c = c * c * (3 - 2 * c);
    const th = ((1 - c) * Math.PI) / 2,
      co = Math.cos(th),
      si = Math.sin(th);
    const S = cr(D.S, s);
    const Wt = lerp(S, cw || D.CW, c),
      Ht = lerp(S, ch || D.CH, c);
    const ex = co * D.fa + si * D.fb,
      ey = co * D.fa * D.ka + si * D.fb * D.kb;
    const tp = lerp(-0.015, 0.04, c),
      sc = 1 + 0.03 * hv;
    let cx = cr(D.X, s),
      cy = cr(D.Y, s);
    cx += fx;
    cy += fy - 6 * hv;
    const Ex = ((Wt * ex) / 2) * sc,
      Ey = ((Wt * ey) / 2) * sc,
      hl = (Ht / 2) * (1 + tp) * sc,
      hr = (Ht / 2) * (1 - tp) * sc;
    return {
      q: [
        [cx - Ex, cy - Ey - hl],
        [cx + Ex, cy + Ey - hr],
        [cx + Ex, cy + Ey + hr],
        [cx - Ex, cy - Ey + hl],
      ],
      asp: Wt / Ht,
      c,
    };
  };
  const hom = (bw, bh, q) => {
    const x0 = q[0][0],
      y0 = q[0][1],
      x1 = q[1][0],
      y1 = q[1][1],
      x2 = q[2][0],
      y2 = q[2][1],
      x3 = q[3][0],
      y3 = q[3][1];
    const dx1 = x1 - x2,
      dx2 = x3 - x2,
      dx3 = x0 - x1 + x2 - x3,
      dy1 = y1 - y2,
      dy2 = y3 - y2,
      dy3 = y0 - y1 + y2 - y3;
    let gg = 0,
      hh = 0;
    const det = dx1 * dy2 - dx2 * dy1;
    if (Math.abs(det) > 1e-9 && (Math.abs(dx3) > 1e-9 || Math.abs(dy3) > 1e-9)) {
      gg = (dx3 * dy2 - dx2 * dy3) / det;
      hh = (dx1 * dy3 - dx3 * dy1) / det;
    }
    const a = x1 - x0 + gg * x1,
      b = x3 - x0 + hh * x3,
      d = y1 - y0 + gg * y1,
      e = y3 - y0 + hh * y3;
    return (
      'matrix3d(' +
      [a / bw, d / bw, 0, gg / bw, b / bh, e / bh, 0, hh / bh, 0, 0, 1, 0, x0, y0, 0, 1]
        .map((n) => +n.toFixed(7))
        .join(',') +
      ')'
    );
  };

  /* state */
  let p = 3,
    v = 0,
    target = 3,
    drag = null,
    hoverIdx = -1,
    intro = 0,
    lastT = 0,
    lastDragEnd = -1e9,
    activeIdx = -1,
    raf = 0,
    touched = false;
  const setActive = (ai) => {
    activeIdx = ai;
    items.forEach((it, i) => {
      if (it.go) it.go.tabIndex = i === ai ? 0 : -1;
      it.cap.setAttribute('aria-hidden', i === ai ? 'false' : 'true');
    });
    if (live) live.textContent = items[ai].name;
  };
  const touch = () => {
    if (!touched) {
      touched = true;
    }
  };
  const step = (d) => {
    target = Math.round(target) + d;
    touch();
  };
  const goTo = (i) => {
    const b = Math.round(target);
    target = b + Math.round(wrap(i - b));
  };
  const visit = (i) => {
    const href = items[i] && items[i].href;
    if (href) win.location.assign(href);
  };

  /* frame */
  const frame = (now) => {
    raf = win.requestAnimationFrame(frame);
    const t = now / 1000,
      dt = lastT ? Math.min(0.05, Math.max(0, t - lastT)) : 0.016;
    lastT = t;
    const rm = RM();
    intro = rm ? 1 : Math.min(1, intro + dt / 1.8);
    if (!drag) {
      const w = rm ? 26 : 7.2,
        acc = w * w * (target - p) - 2 * w * v;
      v += acc * dt;
      p += v * dt;
      if (Math.abs(target - p) < 2e-4 && Math.abs(v) < 2e-3) {
        p = target;
        v = 0;
      }
    }
    const ai = mod(Math.round(p));
    if (ai !== activeIdx) setActive(ai);
    const ph = Math.sin((p / N) * Math.PI * 2);
    const kx = 1 / Math.sqrt(1 + D.ka * D.ka),
      ky = D.ka * kx;
    dots.style.transform =
      'translate(' +
      (ph * 20 * kx).toFixed(2) +
      'px,' +
      (ph * 20 * ky).toFixed(2) +
      'px) skewY(' +
      ((Math.atan(D.ka) * 180) / Math.PI).toFixed(2) +
      'deg)';
    dots.style.opacity = (0.72 * clamp(intro * 1.5)).toFixed(3);
    const li = clamp(intro * 1.8 - 0.55);
    hint.style.opacity = touched ? '0.6' : '1';

    items.forEach((it, i) => {
      const s = wrap(i - p);
      it.s = s;
      const want = hoverIdx === i && !drag ? 1 : 0;
      it.hv += (want - it.hv) * (1 - Math.exp(-dt * (rm ? 40 : 9)));
      const as = Math.abs(s);
      it.ex = clamp((3.5 - as) / 0.5);
      it.ei = eo(clamp(intro * 1.8 - 0.12 * Math.min(3, Math.round(as))));
      const fa = rm ? 0 : 4.5 * Math.min(1, as) + 0.8;
      const fx = fa * 0.6 * Math.sin(t * 0.47 + i * 1.3),
        fy = fa * Math.sin(t * 0.61 + i * 2.1) + (1 - it.ei) * 46;
      const P = planeAt(s, it.hv, fx, fy, it.cw, it.ch);
      it.dq = P.q;
      const q = P.q.map(toS),
        asp = P.asp;
      it.q = q;
      const op = it.ex * it.ei;
      it.el.style.visibility = op < 0.003 ? 'hidden' : 'visible';
      it.el.style.opacity = op.toFixed(3);
      /* two covers: the square one while the plane is turned to the side, the rectangle once it faces the viewer */
      if (it.sq) {
        let k = clamp((P.c - 0.25) / 0.5);
        k = k * k * (3 - 2 * k);
        const so = +(1 - k).toFixed(3);
        if (so !== it.so) {
          it.so = so;
          it.sq.style.opacity = String(so);
        }
      }
      if (op >= 0.003) {
        const bw = Math.round(600 * asp);
        if (bw !== it.w) {
          it.w = bw;
          it.el.style.width = bw + 'px';
        }
        it.el.style.transform = hom(bw, 600, q);
      }
      it.el.style.zIndex = String(60 - Math.round(as * 10));
      it.el.classList.toggle('hov', it.hv > 0.5);
      /* caption: only the centre project */
      const a = clamp(1 - as * 2.4);
      const cop = a * it.ex * it.ei;
      it.cap.style.visibility = cop < 0.003 ? 'hidden' : 'visible';
      it.cap.style.opacity = cop.toFixed(3);
      it.cap.style.zIndex = '95';
      if (it.go) it.go.style.pointerEvents = cop > 0.6 ? 'auto' : 'none';
      if (cop >= 0.003) {
        const cs = compact ? 0.9 : clamp(g / 0.86, 0.8, 1.25),
          bl = q[3],
          br = q[2];
        const sl = (br[1] - bl[1]) / Math.max(1, br[0] - bl[0]),
          kk = cs * 0.96;
        it.cap.style.transform =
          'matrix(' +
          kk.toFixed(4) +
          ',' +
          (sl * kk).toFixed(4) +
          ',0,' +
          cs.toFixed(4) +
          ',' +
          bl[0].toFixed(1) +
          ',' +
          (bl[1] + 16 * cs + (1 - a) * 8).toFixed(1) +
          ')';
      }
    });

    /* construction lines: fixed reference rails, one above and one below the gallery, parallel to its axis;
   they do not follow the planes, so they never bend while dragging */
    const R1 = D.RP1.map(toS),
      R2 = D.RP2.map(toS);
    poly(L.rp1, R1, 0.85 * li);
    poly(L.rp2, R2, 0.85 * li);
    rpns.forEach((a) => {
      const o = li.toFixed(3);
      if (a.style.opacity !== o) a.style.opacity = o;
      const pe = li > 0.5 ? '' : 'none';
      if (a.style.pointerEvents !== pe) a.style.pointerEvents = pe;
    });
    const base = 0.82 * li;
    const T0 = toS(D.TOP[0]),
      T1 = toS(D.TOP[1]),
      B0 = toS(D.BOT[0]),
      B1 = toS(D.BOT[1]);
    poly(L.tl, [T0, T1], base);
    dotAt(DOTS[0], T0, base);
    dotAt(DOTS[1], T1, base);
    poly(L.br, [B0, B1], base);
    dotAt(DOTS[2], B0, base);
    dotAt(DOTS[3], B1, base);
    const J1 = toS(D.V1[1]),
      J2 = toS(D.V2[0]);
    poly(L.v1, [toS(D.V1[0]), J1], base);
    dotAt(DOTS[4], J1, base);
    poly(L.v2, [J2, toS(D.V2[1])], base);
    dotAt(DOTS[5], J2, base);
    poly(L.bl, null, 0);
    poly(L.tr, null, 0);
    poly(L.v3, null, 0);
    poly(L.dl, null, 0);
  };

  /* pointer */
  const scaleNow = () => {
    const r = root.getBoundingClientRect();
    return r.width / (root.offsetWidth || 1) || 1;
  };
  const onDown = (e) => {
    if (e.button !== undefined && e.button > 0) return;
    drag = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      p0: p,
      moved: false,
      cap: false,
      hist: [[performance.now(), p]],
      sc: scaleNow(),
    };
  };
  const onMove = (e) => {
    if (drag && e.pointerId === drag.id) {
      const dx = (e.clientX - drag.x0) / drag.sc,
        dy = (e.clientY - drag.y0) / drag.sc;
      if (!drag.moved && Math.hypot(dx, dy) > 6) {
        drag.moved = true;
        hoverIdx = -1;
        touch();
        stage.classList.add('grabbing');
        try {
          stage.setPointerCapture(e.pointerId);
          drag.cap = true;
        } catch {
          /* pointer capture is optional */
        }
      }
      if (drag.moved) {
        const stepPx = compact ? W * 0.45 : Math.max(200, 300 * g);
        p = drag.p0 - dx / stepPx;
        v = 0;
        target = Math.round(p);
        const now = performance.now();
        drag.hist.push([now, p]);
        while (drag.hist.length > 2 && now - drag.hist[0][0] > 120) drag.hist.shift();
      }
      return;
    }
    if (e.pointerType === 'mouse') {
      const h = e.target && e.target.closest ? e.target.closest('[data-pl]') : null;
      hoverIdx = h ? +h.getAttribute('data-pl') : -1;
    }
  };
  const onUp = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    stage.classList.remove('grabbing');
    if (d.cap) {
      try {
        stage.releasePointerCapture(e.pointerId);
      } catch {
        /* pointer capture is optional */
      }
    }
    if (d.moved) {
      const h = d.hist,
        a = h[0],
        b = h[h.length - 1],
        span = (b[0] - a[0]) / 1000;
      v = span > 0.005 ? clamp((b[1] - a[1]) / span, -14, 14) : 0;
      const base = Math.round(p);
      target = clamp(Math.round(p + v * 0.2), base - 2, base + 2);
      lastDragEnd = performance.now();
      return;
    }
    if (e.type === 'pointercancel') return;
    const tg = e.target;
    if (!tg || !tg.closest || tg.closest('button,a')) return;
    const pl = tg.closest('[data-pl]');
    if (!pl) return;
    const i = +pl.getAttribute('data-pl');
    touch();
    if (i === activeIdx && Math.abs(wrap(i - p)) < 0.35) visit(i);
    else goTo(i);
  };
  const onLeave = () => {
    if (!drag) hoverIdx = -1;
  };
  /* a click that ends a drag should not follow the "View project" link under the pointer */
  const onClick = (e) => {
    if (performance.now() - lastDragEnd < 350) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  const onKey = (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const tg = e.target,
      tag = (tg && tg.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag) || (tg && tg.isContentEditable)) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      step(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      step(-1);
    } else if (
      (e.key === 'Enter' || e.key === ' ') &&
      (tg === stage || tg === doc.body || tg === doc.documentElement)
    ) {
      e.preventDefault();
      visit(activeIdx);
    }
  };
  const onDocKey = (e) => {
    const ae = doc.activeElement;
    if (!ae || ae === doc.body || ae === doc.documentElement) onKey(e);
  };
  stage.addEventListener('pointerdown', onDown);
  stage.addEventListener('pointermove', onMove);
  stage.addEventListener('pointerup', onUp);
  stage.addEventListener('pointercancel', onUp);
  stage.addEventListener('pointerleave', onLeave);
  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKey);
  doc.addEventListener('keydown', onDocKey);
  const ro = win.ResizeObserver ? new win.ResizeObserver(() => measure()) : null;
  if (ro) ro.observe(root);
  else win.addEventListener('resize', measure);
  raf = win.requestAnimationFrame(frame);
  return {
    root,
    destroy() {
      win.cancelAnimationFrame(raf);
      stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerup', onUp);
      stage.removeEventListener('pointercancel', onUp);
      stage.removeEventListener('pointerleave', onLeave);
      root.removeEventListener('click', onClick);
      root.removeEventListener('keydown', onKey);
      doc.removeEventListener('keydown', onDocKey);
      if (ro) ro.disconnect();
      else win.removeEventListener('resize', measure);
    },
  };
}
