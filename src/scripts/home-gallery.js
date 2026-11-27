// Home gallery: the drawn planes you can drag through, the particle name intro,
// the project captions and the About / Contact boxes on the rails.
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
    idb = q1('[data-id]'),
    hint = q1('[data-hint]'),
    detail = q1('[data-detail]'),
    live = q1('[data-live]');
  const byIdx = (attr) => qa('[' + attr + ']').sort((a, b) => a.getAttribute(attr) - b.getAttribute(attr));
  const els = byIdx('data-pl'),
    caps = byIdx('data-cap'),
    dts = byIdx('data-dt');
  const N = els.length;
  const mq = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const RM = () => !!(mq && mq.matches);
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const wrap = (x) => ((((x + N / 2) % N) + N) % N) - N / 2;
  const mod = (x) => ((x % N) + N) % N;
  const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
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
    const cap = caps[i];
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
      go: cap.querySelector('[data-go]'),
      cta: cap.querySelector('[data-go],[data-soon]'),
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
  const planeAt = (s, hv, fx, fy, push, cw, ch) => {
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
      sc = (1 + 0.03 * hv) * (1 - 0.25 * push);
    let cx = cr(D.X, s),
      cy = cr(D.Y, s);
    if (push) {
      cx = 841 + (cx - 841) * (1 + 0.6 * push);
      cy = 494 + (cy - 494) * (1 + 0.6 * push);
    }
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
  const heroQuad = (asp) => {
    let x0, x1, y0, y1;
    if (compact) {
      x0 = 16;
      x1 = W - 16;
      y0 = 160;
      y1 = H * 0.52;
    } else {
      const a = toS([640, 160]),
        b = toS([1614, 812]);
      x0 = a[0];
      y0 = a[1];
      x1 = b[0];
      y1 = b[1];
    }
    const bw = x1 - x0,
      bh = y1 - y0,
      w = Math.min(bw, bh * asp),
      h = w / asp;
    const x = x0 + (bw - w) / 2,
      y = y0 + (bh - h) / 2;
    return [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ];
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
  /* blended quad at a slot, so the construction lines glide from plane to plane while dragging */
  const slotQ = (k) => {
    let sw = 0;
    const acc = [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ];
    items.forEach((it) => {
      const w = Math.max(0, 1 - Math.abs(it.s - k)) * it.ex;
      if (w <= 0 || !it.dq) return;
      sw += w;
      for (let j = 0; j < 4; j++) {
        acc[j][0] += it.dq[j][0] * w;
        acc[j][1] += it.dq[j][1] * w;
      }
    });
    if (sw < 0.001) return null;
    return { q: acc.map((p) => [p[0] / sw, p[1] / sw]), w: Math.min(1, sw) };
  };
  const bil = (Q, u, v) => {
    const t = [Q[0][0] + (Q[1][0] - Q[0][0]) * u, Q[0][1] + (Q[1][1] - Q[0][1]) * u],
      b = [Q[3][0] + (Q[2][0] - Q[3][0]) * u, Q[3][1] + (Q[2][1] - Q[3][1]) * u];
    return [t[0] + (b[0] - t[0]) * v, t[1] + (b[1] - t[1]) * v];
  };
  const yOnLine = (a, b, x) => a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0] || 1e-6);

  /* state */
  let kbd = false,
    p = 3,
    v = 0,
    target = 3,
    drag = null,
    hoverIdx = -1,
    openIdx = -1,
    openU = 0,
    openDir = 0,
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
    if (openIdx >= 0) return;
    target = Math.round(target) + d;
    touch();
  };
  const goTo = (i) => {
    const b = Math.round(target);
    target = b + Math.round(wrap(i - b));
  };
  const open = (i) => {
    if (openIdx >= 0) return;
    goTo(i);
    openIdx = i;
    dts.forEach((d, j) => {
      if (j === i) d.setAttribute('data-on', '');
      else d.removeAttribute('data-on');
    });
    items[i].el.classList.add('on');
    detail.setAttribute('aria-hidden', 'false');
    root.classList.add('is-open');
    openDir = 1;
    hoverIdx = -1;
  };
  const close = () => {
    if (openIdx < 0 || openDir < 0) return;
    openDir = -1;
  };
  const onOpened = () => {
    const b = q1('[data-back]');
    if (b && kbd) b.focus({ preventScroll: true });
  };
  const onClosed = () => {
    root.classList.remove('is-open');
    detail.setAttribute('aria-hidden', 'true');
    if (openIdx >= 0) items[openIdx].el.classList.remove('on');
    dts.forEach((d) => d.removeAttribute('data-on'));
    openIdx = -1;
    if (kbd) stage.focus({ preventScroll: true });
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
    if (openDir) {
      openU = clamp(openU + (openDir * dt) / (rm ? 0.3 : 1.1));
      if (openDir > 0 && openU >= 1) {
        openDir = 0;
        onOpened();
      } else if (openDir < 0 && openU <= 0) {
        openDir = 0;
        onClosed();
      }
    }
    const E = eio(openU),
      keep = 1 - E;
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
    dots.style.opacity = (0.72 * keep * clamp(intro * 1.5)).toFixed(3);
    const li = clamp(intro * 1.8 - 0.55) * keep;
    idb.style.opacity = (1 - clamp(E * 1.8)).toFixed(3);
    hint.style.opacity = ((touched ? 0.6 : 1) * keep).toFixed(3);
    const de = clamp((E - 0.5) / 0.5);
    detail.style.opacity = de.toFixed(3);
    detail.style.transform = 'translateY(' + ((1 - eo(de)) * 16).toFixed(1) + 'px)';
    detail.style.pointerEvents = de > 0.85 && openDir >= 0 ? 'auto' : 'none';

    items.forEach((it, i) => {
      const s = wrap(i - p);
      it.s = s;
      const want = hoverIdx === i && !drag && openIdx < 0 ? 1 : 0;
      it.hv += (want - it.hv) * (1 - Math.exp(-dt * (rm ? 40 : 9)));
      const as = Math.abs(s);
      it.ex = clamp((3.5 - as) / 0.5);
      it.ei = eo(clamp(intro * 1.8 - 0.12 * Math.min(3, Math.round(as))));
      const fa = rm ? 0 : 4.5 * Math.min(1, as) + 0.8;
      const fx = fa * 0.6 * Math.sin(t * 0.47 + i * 1.3),
        fy = fa * Math.sin(t * 0.61 + i * 2.1) + (1 - it.ei) * 46;
      const isO = i === openIdx;
      const P = planeAt(s, it.hv, fx, fy, isO ? 0 : E, it.cw, it.ch);
      it.dq = P.q;
      let q = P.q.map(toS),
        asp = P.asp;
      if (isO && E > 0) {
        asp = lerp(P.asp, it.ha, E);
        const hq = heroQuad(asp),
          bump = 1 + 0.04 * Math.sin(Math.PI * E);
        q = q.map((pt, j) => [lerp(pt[0], hq[j][0], E), lerp(pt[1], hq[j][1], E)]);
        const mx = (q[0][0] + q[2][0]) / 2,
          my = (q[0][1] + q[2][1]) / 2;
        q = q.map((pt) => [mx + (pt[0] - mx) * bump, my + (pt[1] - my) * bump]);
      }
      it.q = q;
      const op = isO ? 1 : it.ex * it.ei * Math.pow(keep, 1.4);
      it.el.style.visibility = op < 0.003 ? 'hidden' : 'visible';
      it.el.style.opacity = op.toFixed(3);
      /* two covers: the square one while the plane is turned to the side, the rectangle once it faces the viewer */
      if (it.sq) {
        let k = clamp((P.c - 0.25) / 0.5);
        k = k * k * (3 - 2 * k);
        const so = isO ? 0 : +(1 - k).toFixed(3);
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
      it.el.style.zIndex = String(isO ? 90 : 60 - Math.round(as * 10));
      it.el.classList.toggle('hov', it.hv > 0.5);
      /* caption: only the centre project */
      const a = clamp(1 - as * 2.4);
      const cop = a * it.ex * it.ei * Math.pow(1 - Math.min(1, E * 1.7), 2);
      it.cap.style.visibility = cop < 0.003 ? 'hidden' : 'visible';
      it.cap.style.opacity = cop.toFixed(3);
      it.cap.style.zIndex = '95';
      if (it.cta) it.cta.style.pointerEvents = cop > 0.6 ? 'auto' : 'none';
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
    if (openIdx >= 0 || (e.button !== undefined && e.button > 0)) return;
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
        } catch (_) {}
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
    if (e.pointerType === 'mouse' && openIdx < 0) {
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
      } catch (_) {}
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
    if (i === activeIdx && Math.abs(wrap(i - p)) < 0.35) open(i);
    else goTo(i);
  };
  const onLeave = () => {
    if (!drag) hoverIdx = -1;
  };
  const onClick = (e) => {
    if (performance.now() - lastDragEnd < 350) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const tg = e.target;
    if (!tg || !tg.closest) return;
    const gb = tg.closest('[data-go]');
    if (gb) {
      e.preventDefault();
      touch();
      open(+gb.getAttribute('data-go'));
      return;
    }
    if (tg.closest('[data-back]')) {
      e.preventDefault();
      close();
      return;
    }
    const pl = tg.closest('[data-pl]');
    if (pl && openIdx === +pl.getAttribute('data-pl') && openU > 0.95) {
      const a = dts[openIdx].querySelector('a[href]');
      if (a) a.click();
    }
  };
  const onKey = (e) => {
    kbd = true;
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const tg = e.target,
      tag = (tg && tg.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag) || (tg && tg.isContentEditable)) return;
    if (openIdx >= 0) {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
      return;
    }
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
      touch();
      open(activeIdx);
    }
  };
  const onDocKey = (e) => {
    const ae = doc.activeElement;
    if (!ae || ae === doc.body || ae === doc.documentElement) onKey(e);
  };
  const onAnyDown = () => {
    kbd = false;
  };
  stage.addEventListener('pointerdown', onDown);
  stage.addEventListener('pointermove', onMove);
  stage.addEventListener('pointerup', onUp);
  stage.addEventListener('pointercancel', onUp);
  stage.addEventListener('pointerleave', onLeave);
  root.addEventListener('pointerdown', onAnyDown, true);
  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKey);
  doc.addEventListener('keydown', onDocKey);
  const ro = win.ResizeObserver ? new win.ResizeObserver(() => measure()) : null;
  if (ro) ro.observe(root);
  else win.addEventListener('resize', measure);
  raf = win.requestAnimationFrame(frame);
  /* identity: dots gather into the name, the role and "Layers of interaction", then the type itself fades in */
  const idIntro = (() => {
    const cv = idb ? idb.querySelector('[data-idp]') : null;
    if (!cv || !cv.getContext) return null;
    if (RM()) {
      idb.setAttribute('data-ph', 'done');
      return null;
    }
    idb.setAttribute('data-ph', 'wait');
    const nmE = idb.querySelector('.nm'),
      roE = idb.querySelector('.role'),
      lyE = idb.querySelector('.lay');
    let dead = false,
      started = false,
      rafI = 0,
      tmo = 0,
      ps = [],
      t0 = 0,
      W = 0,
      H = 0,
      ctx = null,
      gs = [];
    const finish = () => {
      if (dead) return;
      dead = true;
      win.cancelAnimationFrame(rafI);
      win.clearTimeout(tmo);
      win.removeEventListener('resize', finish);
      [nmE, roE, lyE].forEach((e) => {
        if (e) e.style.opacity = '';
      });
      idb.setAttribute('data-ph', 'done');
      if (ctx) ctx.clearRect(0, 0, W, H);
      cv.style.display = 'none';
    };
    win.addEventListener('resize', finish);
    const sample = (el, n) => {
      const none = { pts: [], box: null };
      if (!el || !el.getClientRects().length) return none;
      const cr = cv.getBoundingClientRect();
      const oc = doc.createElement('canvas');
      oc.width = Math.max(1, Math.ceil(cr.width));
      oc.height = Math.max(1, Math.ceil(cr.height));
      const c2 = oc.getContext('2d');
      c2.fillStyle = '#000';
      c2.textBaseline = 'alphabetic';
      const cs = win.getComputedStyle(el),
        fs = parseFloat(cs.fontSize) || 16,
        up = cs.textTransform === 'uppercase';
      c2.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      const wk = doc.createTreeWalker(el, 4),
        rg = doc.createRange();
      let nd,
        box = null;
      while ((nd = wk.nextNode())) {
        const tx = nd.nodeValue;
        for (let i = 0; i < tx.length; i++) {
          const ch = tx[i];
          if (!ch.trim()) continue;
          rg.setStart(nd, i);
          rg.setEnd(nd, i + 1);
          const r = rg.getBoundingClientRect();
          if (!r.width) continue;
          const gl = up ? ch.toLocaleUpperCase('en') : ch,
            m = c2.measureText(gl);
          const asc = m.fontBoundingBoxAscent || fs * 0.92,
            dsc = m.fontBoundingBoxDescent || fs * 0.24;
          const x = r.left - cr.left,
            y = r.top - cr.top + (r.height - asc - dsc) / 2 + asc;
          c2.fillText(gl, x, y);
          const b = [x, r.top - cr.top, r.right - cr.left, r.bottom - cr.top];
          box = box
            ? [Math.min(box[0], b[0]), Math.min(box[1], b[1]), Math.max(box[2], b[2]), Math.max(box[3], b[3])]
            : b;
        }
      }
      if (!box) return none;
      const step = Math.max(1, fs / 26),
        data = c2.getImageData(0, 0, oc.width, oc.height).data,
        pts = [];
      for (let y = Math.max(0, box[1]); y < Math.min(oc.height, box[3]); y += step) {
        for (let x = Math.max(0, box[0]); x < Math.min(oc.width, box[2]); x += step) {
          if (data[((y | 0) * oc.width + (x | 0)) * 4 + 3] > 110)
            pts.push([x + (Math.random() - 0.5) * step * 0.5, y + (Math.random() - 0.5) * step * 0.5]);
        }
      }
      for (let i = pts.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0,
          t = pts[i];
        pts[i] = pts[j];
        pts[j] = t;
      }
      return { pts: pts.slice(0, n), box };
    };
    const build = () => {
      const cr = cv.getBoundingClientRect();
      W = cr.width;
      H = cr.height;
      if (W < 4 || H < 4) return false;
      const dpr = Math.min(2, win.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx = cv.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = parseFloat(win.getComputedStyle(root).getPropertyValue('--g')) || 1;
      const pad = 30 * g,
        dot = Math.max(1.3, 1.65 * g);
      const sN = sample(nmE, 1500),
        sR = sample(roE, 700),
        sL = sample(lyE, 700);
      if (!sN.box) return false;
      const idR = [0, Math.max(0, sN.box[1] - pad), W, (sR.box ? sR.box[3] : sN.box[3]) + pad * 1.2];
      const add = (S, R, d0, rv, el, sz) => {
        if (!S.box) return;
        gs.push({ el, rv, done: false });
        const span = Math.max(1, R[2] - R[0]);
        S.pts.forEach((p) => {
          ps.push({
            sx: R[0] + Math.random() * span,
            sy: R[1] + Math.random() * (R[3] - R[1]),
            tx: p[0],
            ty: p[1],
            a: d0 + Math.random() * 1000,
            m: d0 + 700 + Math.random() * 600 + ((p[0] - R[0]) / span) * 220,
            d: 800 + Math.random() * 380,
            vx: (Math.random() - 0.5) * 16 * g,
            vy: (Math.random() - 0.5) * 10 * g,
            w: Math.random() * 6.283,
            rv,
            s: sz * (0.8 + Math.random() * 0.5),
          });
        });
      };
      add(sN, idR, 0, 2550, nmE, dot);
      add(sR, idR, 200, 2800, roE, dot * 0.85);
      if (sL.box)
        add(
          sL,
          [
            Math.max(0, sL.box[0] - pad),
            sL.box[1] - pad * 1.6,
            Math.min(W, sL.box[2] + pad * 2.2),
            sL.box[3] + pad * 1.3,
          ],
          360,
          2950,
          lyE,
          dot * 0.9,
        );
      return ps.length > 0;
    };
    const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
    const tick = (now) => {
      if (dead) return;
      const t = now - t0;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#2A2926';
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        if (t < p.a) continue;
        let al = Math.min(1, (t - p.a) / 320) * 0.95;
        if (t > p.rv) al *= Math.max(0, 1 - (t - p.rv) / 480);
        if (al <= 0.01) continue;
        const dr = Math.min(t, p.m) / 1000,
          bx = p.sx + p.vx * dr,
          by = p.sy + p.vy * dr;
        let x = bx,
          y = by;
        if (t > p.m) {
          const k = Math.min(1, (t - p.m) / p.d),
            e = ease(k),
            wob = Math.sin(k * Math.PI) * 5;
          x = bx + (p.tx - bx) * e + Math.cos(p.w) * wob;
          y = by + (p.ty - by) * e + Math.sin(p.w) * wob;
        }
        ctx.globalAlpha = al;
        ctx.fillRect(x - p.s / 2, y - p.s / 2, p.s, p.s);
      }
      ctx.globalAlpha = 1;
      gs.forEach((gr) => {
        if (!gr.done && t > gr.rv && gr.el) {
          gr.done = true;
          gr.el.style.opacity = '1';
        }
      });
      if (t > 3600) {
        finish();
        return;
      }
      rafI = win.requestAnimationFrame(tick);
    };
    const start = () => {
      if (started || dead) return;
      started = true;
      try {
        if (!build()) {
          finish();
          return;
        }
      } catch (e) {
        finish();
        return;
      }
      idb.setAttribute('data-ph', 'run');
      t0 = win.performance.now();
      rafI = win.requestAnimationFrame(tick);
    };
    if (doc.fonts && doc.fonts.ready) {
      doc.fonts.ready.then(() => win.requestAnimationFrame(start));
      tmo = win.setTimeout(start, 1800);
    } else start();
    return { stop: finish };
  })();
  return {
    root,
    destroy() {
      win.cancelAnimationFrame(raf);
      if (idIntro) idIntro.stop();
      stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerup', onUp);
      stage.removeEventListener('pointercancel', onUp);
      stage.removeEventListener('pointerleave', onLeave);
      root.removeEventListener('pointerdown', onAnyDown, true);
      root.removeEventListener('click', onClick);
      root.removeEventListener('keydown', onKey);
      doc.removeEventListener('keydown', onDocKey);
      if (ro) ro.disconnect();
      else win.removeEventListener('resize', measure);
    },
  };
}
