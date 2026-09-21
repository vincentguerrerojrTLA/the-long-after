(() => {
  const RAW_BASE = 'https://raw.githubusercontent.com/vincentguerrerojrTLA/the-long-after/main';
  const PROJECT_URL = `${RAW_BASE}/data/project-status.json`;
  const LORE_URL = `${RAW_BASE}/data/lore-public.json`;
  let timer = null;
  let lastProjectFingerprint = '';
  let lastLoreFingerprint = '';

  const q = (sel, root = document) => root.querySelector(sel);
  const qa = (sel, root = document) => [...root.querySelectorAll(sel)];
  const pct = (done, total) => total > 0 ? Math.max(0, Math.min(100, Math.round((done / total) * 100))) : 0;

  function setText(node, value) {
    if (node && value !== undefined && value !== null) node.textContent = String(value);
  }

  function setSyncBadge(status, updatedAt) {
    const host = q('.head-right');
    if (!host) return;
    let badge = q('#siteSyncIndicator');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'siteSyncIndicator';
      badge.className = 'live';
      host.prepend(badge);
    }
    badge.textContent = status === 'ok' ? 'SYNC LIVE' : status === 'loading' ? 'SYNCING' : 'SYNC RETRY';
    if (updatedAt) {
      const d = new Date(updatedAt);
      badge.title = Number.isNaN(d.getTime()) ? `Last project sync: ${updatedAt}` : `Last project sync: ${d.toLocaleString()}`;
    }
  }

  function renderRelease(data) {
    const release = data.release || {};
    const active = data.active || {};
    const progress = pct(Number(active.completedGates || 0), Number(active.totalGates || 0));
    const card = q('.release-card');
    if (card) {
      setText(q('.release-head b', card), release.label);
      setText(q('.release-head span', card), release.status);
      setText(q('.release-main small', card), release.estimatedDropLabel);
      setText(q('.release-main strong', card), release.estimatedDrop);
      setText(q('.release-main p', card), release.window);
      const phase = q('.phase-row', card);
      if (phase) {
        setText(q('span:first-child', phase), `${active.phaseNumber || ''} — ${active.phaseTitle || ''}`.trim());
        setText(q('span:last-child', phase), `${active.completedGates ?? 0} / ${active.totalGates ?? 0}`);
      }
      const bar = q('.bar i', card);
      if (bar) bar.style.width = `${progress}%`;
      const gauge = q('.percent-gauge', card);
      if (gauge) {
        setText(q('span', gauge), `${active.phaseTitle || 'Phase'} completion`);
        setText(q('strong', gauge), `${progress}%`);
      }
      setText(q('.release-note', card), active.note);
      const bands = qa('.release-bands .band', card);
      if (bands[0]) setText(q('b', bands[0]), release.fastPath);
      if (bands[1]) setText(q('b', bands[1]), release.planningTarget);
      if (bands[2]) setText(q('b', bands[2]), release.riskCase);
    }

    const eta = q('.eta-card');
    if (eta) {
      setText(q('h3', eta), release.estimatedDropLabel);
      const month = q('.month', eta);
      if (month && release.estimatedDrop) month.innerHTML = String(release.estimatedDrop).replace(' ', '<br>');
      setText(q('.window', eta), release.window?.replace('Working window · ', 'Working release window · '));
      const bands = qa('.bands > div', eta);
      if (bands[0]) setText(q('b', bands[0]), release.fastPath);
      if (bands[1]) setText(q('b', bands[1]), release.planningTarget);
      if (bands[2]) setText(q('b', bands[2]), release.riskCase);
    }
  }

  function renderActivity(data) {
    const strip = q('.activity-strip');
    if (!strip || !Array.isArray(data.activity)) return;
    strip.replaceChildren(...data.activity.map(entry => {
      const div = document.createElement('div');
      div.className = 'activity-entry';
      const b = document.createElement('b');
      b.textContent = entry.kind || 'UPDATE';
      div.append(b, document.createTextNode(entry.text || ''));
      return div;
    }));
  }

  function renderRoadmap(data) {
    const active = data.active || {};
    const progress = pct(Number(active.completedGates || 0), Number(active.totalGates || 0));
    const gauge = q('.project-gauge');
    if (gauge) {
      const labels = qa('.micro-label', gauge);
      if (labels[0]) setText(labels[0], 'Current active phase');
      const title = q('[style*="font-size:22px"]', gauge);
      setText(title, `${active.phaseTitle || 'Phase'} completion`);
      const value = q('strong', gauge);
      setText(value, `${progress}%`);
      const bar = q('.bar i', gauge);
      if (bar) bar.style.width = `${progress}%`;
      const note = qa('div', gauge).find(el => el.style?.fontSize === '11px');
      if (note) setText(note, `${active.completedGates ?? 0} of ${active.totalGates ?? 0} ${active.phaseTitle || 'phase'} gates complete · ${active.ticker || 'Current ticker'} remains active.`);
    }

    if (Array.isArray(data.phases)) {
      const cards = qa('.phases .phase');
      data.phases.forEach((phase, i) => {
        const card = cards[i];
        if (!card) return;
        card.classList.toggle('active', phase.state === 'ACTIVE');
        setText(q('.phase-num', card), phase.number);
        setText(q('.phase-title', card), phase.title);
        let phaseState = phase.state || '';
        if (Number.isFinite(Number(phase.completed)) && Number.isFinite(Number(phase.total))) phaseState += ` · ${phase.completed}/${phase.total}`;
        setText(q('.phase-state', card), phaseState);
        setText(q('.phase-focus', card), phase.focus);
      });
    }
  }

  function mergeCatalog(data) {
    if (!data.catalog || typeof DATA === 'undefined') return;
    for (const [group, remoteItems] of Object.entries(data.catalog)) {
      if (!DATA[group] || !remoteItems || typeof remoteItems !== 'object') continue;
      const tabs = q(`[data-group="${group}"] .item-tabs`);
      for (const [key, incoming] of Object.entries(remoteItems)) {
        if (!incoming || typeof incoming !== 'object') continue;
        if (incoming.hidden === true) {
          const oldTab = q(`[data-group="${group}"] .item-tab[data-item="${key}"]`);
          if (oldTab) oldTab.remove();
          continue;
        }
        const previous = DATA[group][key] || {};
        DATA[group][key] = {
          ...previous,
          ...incoming,
          details: {...(previous.details || {}), ...(incoming.details || {})},
          facts: incoming.facts || previous.facts || []
        };
        if (tabs) {
          let tab = q(`.item-tab[data-item="${key}"]`, tabs);
          if (!tab) {
            tab = document.createElement('button');
            tab.className = 'item-tab';
            tab.dataset.item = key;
            tab.innerHTML = '<strong></strong><small></small>';
            tabs.append(tab);
          }
          setText(q('strong', tab), incoming.label || incoming.title || previous.title || key);
          setText(q('small', tab), incoming.subtitle || incoming.chip || previous.chip || 'Project item');
        }
      }
      if (typeof state !== 'undefined' && state.view === group && typeof render === 'function') render(group);
    }
  }

  function ensureLoreShell() {
    if (typeof DATA === 'undefined' || typeof BGS === 'undefined' || typeof state === 'undefined') return null;
    if (!DATA.lore) DATA.lore = {};
    if (!state.item.lore) state.item.lore = '';
    if (!state.detail.lore) state.detail.lore = null;
    BGS.lore = 'assets/world-board.png';

    const nav = q('.primary-nav');
    if (nav && !q('[data-view="lore"]', nav)) {
      const button = document.createElement('button');
      button.className = 'nav';
      button.dataset.view = 'lore';
      button.textContent = 'Lore';
      const roadmap = q('[data-view="roadmap"]', nav);
      nav.insertBefore(button, roadmap || null);
    }

    let screen = q('[data-screen="lore"]');
    if (!screen) {
      screen = document.createElement('section');
      screen.className = 'screen';
      screen.dataset.screen = 'lore';
      screen.innerHTML = `
        <div class="hub" data-group="lore">
          <aside class="rail">
            <div class="rail-top"><div class="micro-label">Public Archive</div><h2>Lore</h2><p>Spoiler-safe world and story records. Protected discoveries stay sealed until their intended reveal.</p></div>
            <div class="item-tabs"></div>
          </aside>
          <article class="workspace" id="workspace-lore"><div class="workspace-bg"></div><div class="workspace-body"></div></article>
        </div>`;
      const main = q('.stage') || q('main');
      if (main) main.append(screen);
    }
    return screen;
  }

  function applyLoreData(lore) {
    if (!lore || lore.classification !== 'PUBLIC' || !lore.items || typeof lore.items !== 'object') return;
    const screen = ensureLoreShell();
    if (!screen || typeof DATA === 'undefined') return;
    const tabs = q('[data-group="lore"] .item-tabs', screen);
    DATA.lore = {};
    if (tabs) tabs.replaceChildren();

    for (const [key, item] of Object.entries(lore.items)) {
      if (!item || item.classification !== 'PUBLIC') continue;
      DATA.lore[key] = {
        img: item.img || 'assets/world-board.png',
        chip: item.chip || 'PUBLIC LORE',
        chipClass: item.chipClass || '',
        title: item.title || item.label || key,
        body: item.body || '',
        facts: Array.isArray(item.facts) ? item.facts : [],
        details: item.details && typeof item.details === 'object' ? item.details : {Overview: item.body || ''}
      };
      if (tabs) {
        const tab = document.createElement('button');
        tab.className = 'item-tab';
        tab.dataset.item = key;
        tab.innerHTML = '<strong></strong><small></small>';
        setText(q('strong', tab), item.label || item.title || key);
        setText(q('small', tab), item.subtitle || item.chip || 'Public lore');
        tabs.append(tab);
      }
    }

    const keys = Object.keys(DATA.lore);
    if (!keys.length) return;
    if (!DATA.lore[state.item.lore]) state.item.lore = keys[0];
    qa('[data-group="lore"] .item-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.item === state.item.lore));
    if (state.view === 'lore' && typeof render === 'function') render('lore');
    if (location.hash.startsWith('#/lore') && typeof route === 'function') route();
    window.TLA_PUBLIC_LORE = lore;
  }

  function applyProjectData(data) {
    renderRelease(data);
    renderActivity(data);
    renderRoadmap(data);
    mergeCatalog(data);
    setSyncBadge('ok', data.updatedAt);
    document.documentElement.dataset.projectSync = 'live';
    window.TLA_PROJECT_STATUS = data;
  }

  async function getJson(url) {
    const response = await fetch(`${url}?t=${Date.now()}`, {cache: 'no-store', mode: 'cors'});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async function poll() {
    setSyncBadge((lastProjectFingerprint || lastLoreFingerprint) ? 'ok' : 'loading');
    try {
      const [project, lore] = await Promise.all([getJson(PROJECT_URL), getJson(LORE_URL)]);
      const projectFingerprint = JSON.stringify(project);
      const loreFingerprint = JSON.stringify(lore);
      if (projectFingerprint !== lastProjectFingerprint) {
        applyProjectData(project);
        lastProjectFingerprint = projectFingerprint;
        window.dispatchEvent(new CustomEvent('tla-project-sync', {detail: project}));
      }
      if (loreFingerprint !== lastLoreFingerprint) {
        applyLoreData(lore);
        lastLoreFingerprint = loreFingerprint;
        window.dispatchEvent(new CustomEvent('tla-lore-sync', {detail: lore}));
      }
      setSyncBadge('ok', project.updatedAt || lore.updatedAt);
      const seconds = Math.max(10, Number(project.sync?.pollSeconds || 15));
      clearTimeout(timer);
      timer = setTimeout(poll, seconds * 1000);
    } catch (error) {
      console.warn('TLA live sync retrying:', error);
      setSyncBadge('error');
      clearTimeout(timer);
      timer = setTimeout(poll, 15000);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', poll, {once: true});
  else poll();
})();
