/* Generative backdrop: a calm flow-field of particles behind the whole page.
   GPU-cheap 2D canvas. Reacts gently to the pointer, settles when idle, and
   caps its frame rate. Particles softly dissolve over any on-page text so
   nothing paints on top of it. The browser already throttles rAF in hidden
   tabs, so there is no manual visibility pause to get stuck in a stopped state.
   Exposes start()/stop(); callers should skip it under reduced-motion. */

export function createHero(canvas) {
	const ctx = canvas.getContext("2d", { alpha: true });
	if (!ctx) return { start() {}, stop() {} };

	const PALETTE = ["#2dd4bf", "#8b7bfb", "#f5b64e"];
	const TARGET_FPS = 30;
	const FRAME_MS = 1000 / TARGET_FPS;

	let dpr = 1;
	let w = 0, h = 0;
	let particles = [];
	let raf = 0;
	let last = 0;
	let running = false;
	let t = 0;

	// Pointer influence, eased toward the real cursor.
	const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, active: false };

	// Text the particles should fade behind, across the whole page. Canvas is
	// fixed to the viewport, so element client rects map straight to canvas
	// coordinates; updateTextRects() keeps only the boxes near the viewport.
	const TEXT_SELECTOR = ".hero-eyeblock, .hero-name, .hero-tagline, .stat-row, .hero-cta, " +
		".brand, .site-nav, .section-head, .about-body, .tl-card, .skills, .tl-more, " +
		".contact-inner, .site-footer";
	const INFLATE = 10;  // px grown around each text box before blurring
	const BLUR = 22;     // px feather of the erased hole
	let textEls = [];
	let textRects = [];

	function collectTextEls() {
		textEls = Array.from(document.querySelectorAll(TEXT_SELECTOR));
	}

	function updateTextRects() {
		textRects.length = 0;
		for (const el of textEls) {
			const r = el.getBoundingClientRect();
			if (r.width && r.height && r.bottom > -80 && r.top < h + 80) {
				textRects.push({ l: r.left, t: r.top, w: r.width, h: r.height });
			}
		}
	}

	// Punch a soft, feathered hole over the text so particles simply dissolve
	// there. Blur feathers the edges, inflate + blur unions adjacent lines into
	// one blob (no lanes), and there are no forces (no bunching).
	function eraseTextZone() {
		if (!textRects.length) return;
		ctx.save();
		ctx.globalCompositeOperation = "destination-out";
		ctx.filter = "blur(" + BLUR + "px)";
		ctx.fillStyle = "#000";
		for (const r of textRects) {
			const x = r.l - INFLATE, y = r.t - INFLATE;
			const bw = r.w + INFLATE * 2, bh = r.h + INFLATE * 2;
			const rad = Math.min(18, bh / 2);
			ctx.beginPath();
			if (ctx.roundRect) ctx.roundRect(x, y, bw, bh, rad);
			else ctx.rect(x, y, bw, bh);
			ctx.fill();
		}
		ctx.restore();
	}

	function resize() {
		dpr = Math.min(window.devicePixelRatio || 1, 2);
		w = window.innerWidth;
		h = window.innerHeight;
		canvas.width = Math.floor(w * dpr);
		canvas.height = Math.floor(h * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		seed();
	}

	function seed() {
		// Scale particle count to viewport area, kept modest for battery.
		const count = Math.round(Math.min(150, Math.max(45, (w * h) / 15000)));
		particles = new Array(count).fill(0).map(() => spawn());
		// Paint a solid base once so early trails read well.
		ctx.clearRect(0, 0, w, h);
	}

	function spawn(fromEdge) {
		return {
			x: Math.random() * w,
			y: Math.random() * h,
			speed: 0.4 + Math.random() * 0.9,
			life: 0,
			maxLife: 200 + Math.random() * 400,
			size: 0.7 + Math.random() * 1.6,
			color: PALETTE[(Math.random() * PALETTE.length) | 0]
		};
	}

	// Smooth pseudo-noise flow angle from layered trig. Cheap, no lookup tables.
	function flowAngle(x, y) {
		const nx = x * 0.0016;
		const ny = y * 0.0016;
		const a =
			Math.sin(nx + t * 0.15) +
			Math.cos(ny - t * 0.12) +
			Math.sin((nx + ny) * 0.9 + t * 0.08);
		// Pointer swirl: nudge the field toward/around the cursor.
		const dx = x - pointer.x * w;
		const dy = y - pointer.y * h;
		const dist = Math.hypot(dx, dy);
		const swirl = pointer.active ? Math.max(0, 1 - dist / 320) * 1.6 : 0;
		return a * Math.PI + swirl * Math.atan2(dy, dx);
	}

	function step(now) {
		if (!running) return;
		raf = requestAnimationFrame(step);
		const elapsed = now - last;
		if (elapsed < FRAME_MS) return;
		last = now - (elapsed % FRAME_MS);
		t += 0.016;

		// Ease pointer toward its target for buttery motion.
		pointer.x += (pointer.tx - pointer.x) * 0.06;
		pointer.y += (pointer.ty - pointer.y) * 0.06;

		// Refresh the text boxes so the fade zone tracks the type as it scrolls.
		updateTextRects();

		// Fade previous frame slightly for soft trails.
		ctx.globalCompositeOperation = "destination-out";
		ctx.fillStyle = "rgba(0,0,0,0.06)";
		ctx.fillRect(0, 0, w, h);
		ctx.globalCompositeOperation = "lighter";

		for (const p of particles) {
			const ang = flowAngle(p.x, p.y);
			p.x += Math.cos(ang) * p.speed;
			p.y += Math.sin(ang) * p.speed;
			p.life++;

			if (p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20 || p.life > p.maxLife) {
				Object.assign(p, spawn(), { color: p.color });
				continue;
			}

			const fade = Math.sin((p.life / p.maxLife) * Math.PI); // in/out
			ctx.globalAlpha = 0.5 * fade;
			ctx.fillStyle = p.color;
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = "source-over";

		// Softly dissolve particles and trails wherever the text sits.
		eraseTextZone();
	}

	function onMove(e) {
		const touch = e.touches ? e.touches[0] : e;
		pointer.tx = touch.clientX / w;
		pointer.ty = touch.clientY / h;
		pointer.active = true;
	}
	function onLeave() { pointer.active = false; }

	function start() {
		if (running) return;
		running = true;
		last = performance.now();
		raf = requestAnimationFrame(step);
	}
	function stop() {
		running = false;
		cancelAnimationFrame(raf);
	}

	// Wiring
	collectTextEls();
	resize();
	let resizeTimer;
	window.addEventListener("resize", () => {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(resize, 150);
	});
	window.addEventListener("pointermove", onMove, { passive: true });
	window.addEventListener("pointerleave", onLeave);

	return { start, stop };
}
