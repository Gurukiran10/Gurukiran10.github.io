(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);

  /* ---------- Theme ---------- */
  const root = document.documentElement;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };
  const savedTheme = store.get("theme");
  if (savedTheme) root.dataset.theme = savedTheme;
  else if (window.matchMedia("(prefers-color-scheme: light)").matches) root.dataset.theme = "light";
  const toggleTheme = () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    store.set("theme", root.dataset.theme);
  };
  $("#themeToggle").addEventListener("click", toggleTheme);

  /* ---------- Toast + copy ---------- */
  const toast = $("#toast");
  let toastT;
  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(() => toast.classList.remove("show"), 1800);
  };
  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); showToast("Email copied ✓"); }
    catch { location.href = "mailto:" + text; }
  };
  $$("[data-copy]").forEach((b) => b.addEventListener("click", () => copy(b.dataset.copy)));

  /* ---------- Nav state ---------- */
  const nav = $(".nav");
  const links = $$(".nav-links a");
  const sections = links.map((a) => $(a.getAttribute("href")));
  const onScroll = () => {
    nav.classList.toggle("scrolled", scrollY > 10);
    let current = null;
    sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top < 200) current = i; });
    links.forEach((a, i) => a.classList.toggle("active", i === current));
    // fallback for when the observer misses (fast jumps, background tabs)
    $$(".reveal:not(.in)").forEach((el) => { if (el.getBoundingClientRect().top < innerHeight) el.classList.add("in"); });
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Reveal ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      io.unobserve(e.target);
    });
  }, { threshold: 0.12 });
  $$(".reveal").forEach((el, i) => {
    if (el.closest(".hero")) {
      // above the fold: reveal on load, don't wait for the observer
      el.style.transitionDelay = `${i * 90}ms`;
      requestAnimationFrame(() => el.classList.add("in"));
      setTimeout(() => el.classList.add("in"), 300);
    } else io.observe(el);
  });

  /* ---------- Count-up ---------- */
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target, end = +el.dataset.count, suffix = el.dataset.suffix || "";
      const dur = 1200, t0 = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + (p === 1 ? suffix : "");
        if (p < 1) requestAnimationFrame(step);
      };
      reduced ? (el.textContent = end + suffix) : requestAnimationFrame(step);
      countIO.unobserve(el);
    });
  }, { threshold: 0.6 });
  $$("[data-count]").forEach((el) => countIO.observe(el));

  /* ---------- Cursor glow + card spotlight ---------- */
  const glow = $(".glow");
  if (!reduced && matchMedia("(pointer: fine)").matches) {
    addEventListener("pointermove", (e) => {
      glow.style.left = e.clientX + "px";
      glow.style.top = e.clientY + "px";
    }, { passive: true });
  }
  $$(".spot").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", e.clientX - r.left + "px");
      card.style.setProperty("--my", e.clientY - r.top + "px");
    });
  });

  /* ---------- Agent trace terminal ---------- */
  const SCRIPT = [
    ["plan", "k-plan", "read SOP: AP-invoice-approval.md", 0, 0.01],
    ["plan", "k-plan", "3 steps · limit for auto-approval: ₹50,000", 0, 0],
    ["act", "k-act", "mail.open(inbox) → INV-2291 from Vertex Supplies", 3, 0.02],
    ["obs", "k-obs", "amount ₹78,400 · PO-1180 matched", 2, 0.01],
    ["warn", "k-warn", "over limit → decision belongs to a human", 1, 0.01],
    ["ask", "k-ask", "→ finance.lead: approve INV-2291 (₹78,400)?", 1, 0.01],
    ["obs", "k-obs", "✓ approved by finance.lead", 0, 0],
    ["act", "k-act", "erp.create_bill(INV-2291) …", 4, 0.03],
    ["err", "k-err", "500 Internal Server Error", 1, 0.01],
    ["act", "k-act", "check before retry: erp.search(INV-2291) → 0 rows", 3, 0.02],
    ["act", "k-act", "erp.create_bill(INV-2291) → BILL-5512", 2, 0.02],
    ["verify", "k-plan", "independent verifier (different model) …", 4, 0.03],
    ["verify", "k-ok", "✓ 1 bill · amount matches · approval on record", 0, 0],
    ["memory", "k-ask", "proposed rule: Vertex ≤ ₹80k → auto-approve", 0, 0],
    ["done", "k-ok", "done · receipt saved · 0 duplicate records", 0, 0],
  ];
  const body = $("#termBody"), tSteps = $("#tSteps"), tCost = $("#tCost"), tVer = $("#tVer");
  const MAX_LINES = 13;
  let steps = 0, cost = 0;

  const addLine = (tag, cls, text) => {
    const div = document.createElement("div");
    div.className = "line";
    div.innerHTML = `<span class="${cls} k-tag">${tag.padEnd(7)}</span><span class="${cls === "k-plan" || cls === "k-obs" ? "k-obs" : cls}">${text}</span>`;
    body.appendChild(div);
    while (body.children.length > MAX_LINES) body.firstElementChild.remove();
    return div;
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const runTrace = async () => {
    while (true) {
      body.innerHTML = "";
      steps = 0; cost = 0;
      tSteps.textContent = "0"; tCost.textContent = "$0.00";
      tVer.textContent = "waiting"; tVer.className = "";
      const prompt = addLine("$", "k-ok", 'acme run --role ap-clerk --task "process today\'s invoices"');
      await sleep(reduced ? 0 : 900);
      for (const [tag, cls, text, s, c] of SCRIPT) {
        addLine(tag, cls, text);
        steps += s; cost += c;
        tSteps.textContent = steps;
        tCost.textContent = "$" + cost.toFixed(2);
        if (tag === "verify") tVer.textContent = "checking…";
        if (text.startsWith("✓ 1 bill")) { tVer.textContent = "passed"; tVer.className = "ok"; }
        await sleep(reduced ? 0 : tag === "ask" ? 1500 : tag === "err" ? 1100 : 650 + Math.random() * 350);
      }
      const end = addLine("", "k-ok", "");
      end.innerHTML = '<span class="cursor"></span>';
      if (reduced) return;
      await sleep(5000);
    }
  };
  // start when visible
  const termIO = new IntersectionObserver((e) => {
    if (e[0].isIntersecting) { runTrace(); termIO.disconnect(); }
  });
  termIO.observe($("#term"));

  /* ---------- Command palette ---------- */
  $("#kbdHint").textContent = isMac ? "⌘K" : "Ctrl K";
  const palette = $("#palette"), input = $("#paletteInput"), list = $("#paletteList");
  const open = (url) => window.open(url, "_blank", "noopener");
  const go = (id) => $(id).scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  const COMMANDS = [
    { label: "Go to Work", hint: "section", run: () => go("#work") },
    { label: "Go to Approach", hint: "section", run: () => go("#principles") },
    { label: "Go to Experience", hint: "section", run: () => go("#experience") },
    { label: "Go to Archive", hint: "section", run: () => go("#archive") },
    { label: "Go to Contact", hint: "section", run: () => go("#contact") },
    { label: "Copy email address", hint: "action", run: () => copy("sgurukiran1@gmail.com") },
    { label: "Toggle light / dark theme", hint: "action", run: toggleTheme },
    { label: "Watch Acme Workforce demo", hint: "youtube", run: () => open("https://youtu.be/hfl3IZnOA8M") },
    { label: "Open GitHub profile", hint: "link", run: () => open("https://github.com/Gurukiran10") },
    { label: "Open LinkedIn", hint: "link", run: () => open("https://www.linkedin.com/in/gurukiran-s-1aaa30265") },
    { label: "Acme Workforce — code", hint: "repo", run: () => open("https://github.com/Gurukiran10/ai-workforce") },
    { label: "Research Agent — code", hint: "repo", run: () => open("https://github.com/Gurukiran10/research-agent") },
    { label: "Atlas Financial Assistant — code", hint: "repo", run: () => open("https://github.com/Gurukiran10/atlas-financial-assistant") },
    { label: "Pharma Complaint Copilot — live demo", hint: "demo", run: () => open("https://aivoa-complaint-system-xi.vercel.app") },
  ];
  let filtered = COMMANDS, sel = 0;

  const render = () => {
    list.innerHTML = filtered.length
      ? filtered.map((c, i) => `<li class="${i === sel ? "sel" : ""}" data-i="${i}"><span>${c.label}</span><small>${c.hint}</small></li>`).join("")
      : '<li class="empty">No results</li>';
    const s = list.querySelector(".sel");
    if (s) s.scrollIntoView({ block: "nearest" });
  };
  const openPalette = () => {
    palette.hidden = false; input.value = ""; filtered = COMMANDS; sel = 0; render();
    setTimeout(() => input.focus(), 10);
  };
  const closePalette = () => { palette.hidden = true; };
  const exec = (i) => { const c = filtered[i]; if (!c) return; closePalette(); c.run(); };

  $("#openPalette").addEventListener("click", openPalette);
  palette.addEventListener("click", (e) => { if (e.target === palette) closePalette(); });
  input.addEventListener("input", () => {
    const q = input.value.toLowerCase().trim();
    filtered = COMMANDS.filter((c) => (c.label + " " + c.hint).toLowerCase().includes(q));
    sel = 0; render();
  });
  list.addEventListener("click", (e) => { const li = e.target.closest("li[data-i]"); if (li) exec(+li.dataset.i); });
  list.addEventListener("mousemove", (e) => {
    const li = e.target.closest("li[data-i]");
    if (li && +li.dataset.i !== sel) { sel = +li.dataset.i; render(); }
  });
  addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault(); palette.hidden ? openPalette() : closePalette(); return;
    }
    if (palette.hidden) return;
    if (e.key === "Escape") closePalette();
    else if (e.key === "ArrowDown") { e.preventDefault(); sel = (sel + 1) % Math.max(1, filtered.length); render(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); sel = (sel - 1 + filtered.length) % Math.max(1, filtered.length); render(); }
    else if (e.key === "Enter") { e.preventDefault(); exec(sel); }
  });

  /* ---------- Footer ---------- */
  $("#year").textContent = new Date().getFullYear();
  const clock = $("#clock");
  const tick = () => {
    clock.textContent = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date()) + " IST, local time for me";
  };
  tick(); setInterval(tick, 30000);
})();
