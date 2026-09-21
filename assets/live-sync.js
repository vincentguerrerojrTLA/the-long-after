(() => {
  const DATA_URL = './data/project-status.json';
  let timer = null;
  let lastFingerprint = '';

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
        let state = phase.state || '';
        if (Number.isFinite(Number(phase.completed)) && Number.isFinite(Number(phase.total))) state += ` · ${phase.completed}/${phase.total}`;
        setText(q('.phase-state', card), state);
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

  function applyProjectData(data) {
    renderRelease(data);
    renderActivity(data);
    renderRoadmap(data);
    mergeCatalog(data);
    setSyncBadge('ok', data.updatedAt);
    document.documentElement.dataset.projectSync = 'live';
    window.TLA_PROJECT_STATUS = data;
  }

  async function poll() {
    setSyncBadge(lastFingerprint ? 'ok' : 'loading');
    try {
      const response = await fetch(`${DATA_URL}?t=${Date.now()}`, {cache: 'no-store'});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const fingerprint = JSON.stringify(data);
      if (fingerprint !== lastFingerprint) {
        applyProjectData(data);
        lastFingerprint = fingerprint;
        window.dispatchEvent(new CustomEvent('tla-project-sync', {detail: data}));
      } else {
        setSyncBadge('ok', data.updatedAt);
      }
      const seconds = Math.max(10, Number(data.sync?.pollSeconds || 15));
      clearTimeout(timer);
      timer = setTimeout(poll, seconds * 1000);
    } catch (error) {
      console.warn('TLA live project sync retrying:', error);
      setSyncBadge('error');
      clearTimeout(timer);
      timer = setTimeout(poll, 15000);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', poll, {once: true});
  else poll();
})();
