/* Orchestration: theme toggle, scroll reveals, stat count-ups,
   header state, magnetic buttons, email assembly, and the hero canvas.
   Everything here is progressive enhancement; the page works without it. */

import { createHero } from "./hero.js?v=2";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = document.documentElement;

/* ---------- Footer year ---------- */
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

/* ---------- Theme toggle (with View Transitions where supported) ---------- */
const toggle = document.querySelector(".theme-toggle");
if (toggle) {
	toggle.addEventListener("click", () => {
		const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
		const apply = () => {
			root.setAttribute("data-theme", next);
			try { localStorage.setItem("theme", next); } catch (e) {}
		};
		if (document.startViewTransition && !reduceMotion) {
			document.startViewTransition(apply);
		} else {
			apply();
		}
	});
}

/* ---------- Header scrolled state ---------- */
const header = document.querySelector(".site-header");
if (header) {
	const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 24);
	onScroll();
	window.addEventListener("scroll", onScroll, { passive: true });
}

/* ---------- Reveal on scroll ---------- */
const revealEls = document.querySelectorAll(".reveal");
if (reduceMotion) {
	revealEls.forEach((el) => el.classList.add("in"));
} else {
	const revealIO = new IntersectionObserver(
		(entries, obs) => {
			entries.forEach((en) => {
				if (!en.isIntersecting) return;
				en.target.classList.add("in");
				if (en.target.hasAttribute("data-count-parent") || en.target.classList.contains("stat-row")) {
					en.target.querySelectorAll("[data-count-to]").forEach(runCount);
				}
				obs.unobserve(en.target);
			});
		},
		{ threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
	);
	revealEls.forEach((el) => revealIO.observe(el));
}

/* ---------- Stat count-ups ---------- */
// Reset to the starting value up front so animation has somewhere to travel
// from, without a flash of the final number (which is what ships in the markup
// for the no-JS case).
if (!reduceMotion) {
	document.querySelectorAll("[data-count-to]").forEach((el) => {
		const from = el.dataset.countFrom;
		el.textContent = from ? `${from}→${from}` : "0";
	});
}

function runCount(el) {
	if (el.dataset.done) return;
	el.dataset.done = "1";
	const to = parseFloat(el.dataset.countTo);
	const from = parseFloat(el.dataset.countFrom || "0");
	const suffix = el.dataset.suffix || "";
	const arrow = el.dataset.countFrom ? true : false; // "14->70" style
	if (reduceMotion || isNaN(to)) {
		el.textContent = arrow ? `${from}→${to}${suffix}` : `${to}${suffix}`;
		return;
	}
	const dur = 1400;
	const t0 = performance.now();
	const easeOut = (x) => 1 - Math.pow(1 - x, 3);
	function tick(now) {
		const p = Math.min(1, (now - t0) / dur);
		const val = Math.round(from + (to - from) * easeOut(p));
		el.textContent = arrow ? `${from}→${val}${suffix}` : `${val}${suffix}`;
		if (p < 1) requestAnimationFrame(tick);
	}
	requestAnimationFrame(tick);
}

/* ---------- Magnetic buttons ---------- */
if (!reduceMotion && window.matchMedia("(pointer: fine)").matches) {
	document.querySelectorAll(".magnetic").forEach((el) => {
		const strength = 14;
		el.addEventListener("pointermove", (e) => {
			const r = el.getBoundingClientRect();
			const mx = e.clientX - (r.left + r.width / 2);
			const my = e.clientY - (r.top + r.height / 2);
			el.style.transform = `translate(${(mx / r.width) * strength}px, ${(my / r.height) * strength - 2}px)`;
		});
		el.addEventListener("pointerleave", () => { el.style.transform = ""; });
	});
}

/* ---------- Email: already a valid entity-encoded mailto, but add a
   tiny obfuscation guard so plain scrapers see assembled text on hover. ---------- */
document.querySelectorAll("[data-email]").forEach((a) => {
	// The href is entity-encoded in markup; browsers decode it, scrapers often do not.
	// Nothing further needed for function; this is just a hook point.
	a.addEventListener("click", () => { /* no-op, mailto handled natively */ });
});

/* ---------- Hero canvas ---------- */
const canvas = document.querySelector(".hero-canvas");
if (canvas && !reduceMotion) {
	const hero = createHero(canvas);
	requestAnimationFrame(() => canvas.classList.add("ready"));
	hero.start();
}
