(function () {
  'use strict';

  const STORAGE_KEY = 'figurinhas-brasileirao-2026-v1';
  const DATA_VERSION = 1;

  // Cada figurinha guarda um contador = quantidade que você tem: 0 = não tem
  // (vazio no álbum), 1 = tem e colou (verde), 2+ = tem + repetidas disponíveis
  // pra troca (âmbar, com o nº de repetidas extras no badge). Um clique soma 1.
  // `tradeLists` são listas nomeadas (uma por amigo/troca) com as figurinhas
  // já separadas e ainda não entregues: { id, name, createdAt, items: { key: {key, label, qty} } }.
  /** @type {{items: Object<string, number>, tradeLists: Object<string, {id:string,name:string,createdAt:number,items:Object<string,{key:string,label:string,qty:number}>}>}} */
  let state = { items: {}, tradeLists: {} };

  // Modo "separando": estado só de interação, não é salvo entre sessões.
  let separationMode = false;

  // Índice de toda figurinha/card válido no álbum (chave -> {label, teamName}),
  // construído uma vez a partir de data.js — usado pra validar o que foi
  // colado numa lista de texto, seja número solto (jogador/painel/card) ou
  // código+número (escudo, mascote, Abertura Institucional).
  const ALL_STICKERS = {};
  SECTIONS.forEach((section) => {
    section.teams.forEach((team) => {
      const meta = teamMeta(team);
      teamSlots(team, meta).forEach((slot) => {
        const { key, label } = stickerId(team, slot);
        ALL_STICKERS[key] = { label, teamName: team.name };
      });
    });
  });

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          state.items = parsed.items || {};
          state.tradeLists = parsed.tradeLists || {};
        }
      }
    } catch (e) {
      console.warn('Falha ao carregar dados salvos, iniciando do zero.', e);
    }
  }

  function save() {
    state.version = DATA_VERSION;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Falha ao salvar no navegador.', e);
      showToast('⚠️ Não consegui salvar (armazenamento cheio ou bloqueado).');
    }
  }

  function teamMeta(team) {
    if (team.playerStart !== undefined) {
      const n = team.playerCount || PLAYERS_PER_TEAM;
      let count = n;
      if (team.shieldNumber !== undefined) count++;
      if (team.mascotNumber !== undefined) count++;
      return { stickerCount: count };
    }
    return { stickerCount: team.stickerCount || DEFAULT_STICKER_COUNT };
  }

  // ---------- Identidade de cada figurinha (chave de armazenamento + rótulo) ----------

  // `slot` percorre as células de um time/seção: 'shield' e 'mascot' são as
  // peças à parte de cada time (prefixo próprio E/M, numeração cruzando os
  // times); números 1..N são a numeração global contínua sem prefixo de quem
  // tem `playerStart`; os demais times usam 1..stickerCount no esquema
  // código+número (ex: CB3).
  function teamSlots(team, meta) {
    if (team.playerStart !== undefined) {
      const n = team.playerCount || PLAYERS_PER_TEAM;
      const slots = [];
      if (team.shieldNumber !== undefined) slots.push('shield');
      for (let i = 1; i <= n; i++) slots.push(i);
      if (team.mascotNumber !== undefined) slots.push('mascot');
      return slots;
    }
    const slots = [];
    for (let n = 1; n <= meta.stickerCount; n++) slots.push(n);
    return slots;
  }

  function stickerId(team, slot) {
    if (slot === 'shield') {
      const label = 'E' + team.shieldNumber;
      return { key: label, label, isShield: true };
    }
    if (slot === 'mascot') {
      const label = 'M' + team.mascotNumber;
      return { key: label, label, isShield: false };
    }
    if (team.playerStart !== undefined) {
      const label = String(team.playerStart + slot - 1);
      return { key: label, label, isShield: false };
    }
    const label = team.code + slot;
    return { key: label, label, isShield: slot === 1 && team.shield !== false };
  }

  function getCount(key) {
    return state.items[key] || 0;
  }

  function setCount(key, count) {
    if (count <= 0) {
      delete state.items[key];
    } else {
      state.items[key] = count;
    }
    save();
  }

  function addOne(key) {
    setCount(key, getCount(key) + 1);
  }

  function removeOne(key) {
    setCount(key, Math.max(0, getCount(key) - 1));
  }

  // ---------- Trade lists (listas nomeadas de separadas) ----------

  function listArray() {
    return Object.values(state.tradeLists).sort((a, b) => a.createdAt - b.createdAt);
  }

  function findListByName(name) {
    const norm = name.trim().toLowerCase();
    return listArray().find((l) => l.name.trim().toLowerCase() === norm);
  }

  function generateId() {
    return 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function getOrCreateList(name) {
    const trimmed = name.trim() || `Lista ${listArray().length + 1}`;
    const existing = findListByName(trimmed);
    if (existing) return existing;
    const list = { id: generateId(), name: trimmed, createdAt: Date.now(), items: {} };
    state.tradeLists[list.id] = list;
    save();
    return list;
  }

  function allocationsFor(key) {
    return listArray()
      .filter((l) => l.items[key] && l.items[key].qty > 0)
      .map((l) => ({ list: l, qty: l.items[key].qty }));
  }

  function allocatedQty(key) {
    return allocationsFor(key).reduce((sum, a) => sum + a.qty, 0);
  }

  function addAllocation(listId, key, label, delta) {
    const list = state.tradeLists[listId];
    if (!list) return;
    const current = list.items[key] ? list.items[key].qty : 0;
    const next = current + delta;
    if (next <= 0) {
      delete list.items[key];
    } else {
      list.items[key] = { key, label, qty: next };
    }
    save();
  }

  function deliverItem(listId, key) {
    const list = state.tradeLists[listId];
    if (!list || !list.items[key]) return;
    const entry = list.items[key];
    setCount(key, Math.max(0, getCount(key) - entry.qty));
    delete list.items[key];
    save();
  }

  function deliverList(listId) {
    const list = state.tradeLists[listId];
    if (!list) return;
    Object.keys(list.items).forEach((key) => deliverItem(listId, key));
  }

  function deleteList(listId) {
    delete state.tradeLists[listId];
    save();
  }

  // Lista "ativa": enquanto definida, separar (no grid ou na tela de colar
  // lista) sempre soma direto nela, sem perguntar de novo a cada clique.
  let activeListId = null;

  function activeList() {
    return activeListId ? state.tradeLists[activeListId] : null;
  }

  function separateOneClick(key, label, teamName, onDone) {
    if (activeList()) {
      addAllocation(activeListId, key, label, 1);
      renderAll();
      if (onDone) onDone();
      return;
    }
    openListPicker(`Separar ${label}${teamName ? ' (' + teamName + ')' : ''} pra qual lista?`, (listId) => {
      activeListId = listId;
      addAllocation(listId, key, label, 1);
      renderAll();
      renderSeparationBanner();
      if (onDone) onDone();
    });
  }

  function unseparateOneClick(key) {
    if (!activeList()) return;
    addAllocation(activeListId, key, null, -1);
    renderAll();
  }

  // Usado na tela de "Colar lista": sempre pergunta pra qual lista, mesmo
  // que já exista uma lista ativa do "Modo separando" — separar a partir de
  // uma lista colada é uma ação independente, não deve herdar a lista ativa
  // silenciosamente.
  function separateOneViaPicker(key, label, teamName, onDone) {
    openListPicker(`Separar ${label}${teamName ? ' (' + teamName + ')' : ''} pra qual lista?`, (listId) => {
      addAllocation(listId, key, label, 1);
      activeListId = listId;
      renderAll();
      if (onDone) onDone();
    });
  }

  // ---------- Rendering ----------

  // Cards vêm nos envelopes mas não se colam no álbum — contam à parte no
  // progresso, junto com figurinhas nas métricas de repetidas/separadas
  // (que servem pra troca dos dois tipos de colecionável).
  function computeSummary() {
    let ownedCodes = 0, totalCodes = 0, ownedCards = 0, totalCards = 0, dupeCodes = 0, dupeUnits = 0;
    const separatedKeys = new Set();
    listArray().forEach((l) => Object.keys(l.items).forEach((k) => separatedKeys.add(k)));
    SECTIONS.forEach((section) => {
      const isCards = section.title === 'Cards';
      section.teams.forEach((team) => {
        const meta = teamMeta(team);
        teamSlots(team, meta).forEach((slot) => {
          if (isCards) totalCards++; else totalCodes++;
          const { key } = stickerId(team, slot);
          const count = getCount(key);
          if (count > 0) { if (isCards) ownedCards++; else ownedCodes++; }
          if (count > 1) {
            dupeCodes++;
            dupeUnits += count - 1;
          }
        });
      });
    });
    return { ownedCodes, totalCodes, ownedCards, totalCards, dupeCodes, dupeUnits, separated: separatedKeys.size };
  }

  // Barra de progresso do header: só o essencial (álbum + cards), pra não
  // ocupar espaço da tela com números — o detalhe completo mora no menu.
  function renderHeaderProgress() {
    const s = computeSummary();
    const pct = s.totalCodes ? Math.round((100 * s.ownedCodes) / s.totalCodes) : 0;
    document.getElementById('albumProgressFill').style.width = pct + '%';
    document.getElementById('albumProgressText').textContent = `Álbum: ${s.ownedCodes}/${s.totalCodes} (${pct}%)`;
    const cardsPct = s.totalCards ? Math.round((100 * s.ownedCards) / s.totalCards) : 0;
    document.getElementById('cardsProgressText').textContent = `Cards: ${s.ownedCards}/${s.totalCards} (${cardsPct}%)`;
  }

  // Estatísticas completas (repetidas/separadas) ficam no menu lateral.
  function renderDrawerStats() {
    const s = computeSummary();
    const albumPct = s.totalCodes ? Math.round((100 * s.ownedCodes) / s.totalCodes) : 0;
    const cardsPct = s.totalCards ? Math.round((100 * s.ownedCards) / s.totalCards) : 0;
    document.getElementById('drawerStats').innerHTML = `
      <div class="stat-row"><span>Álbum</span><b>${s.ownedCodes}/${s.totalCodes}</b><span class="stat-pct">${albumPct}%</span></div>
      <div class="stat-row"><span>Cards</span><b>${s.ownedCards}/${s.totalCards}</b><span class="stat-pct">${cardsPct}%</span></div>
      <div class="stat-row"><span>Repetidas</span><b>${s.dupeCodes}</b><span class="stat-pct">${s.dupeUnits} figurinha(s)</span></div>
      <div class="stat-row"><span>Separadas p/ troca</span><b>${s.separated}</b></div>
    `;
  }

  function stickerCell(team, slot) {
    const { key, label, isShield } = stickerId(team, slot);
    const count = getCount(key);
    const isOwned = count > 0;
    const isDupe = count > 1;
    const allocated = allocatedQty(key);
    const div = document.createElement('div');
    div.className = 'sticker st-' + (isDupe ? 2 : (isOwned ? 1 : 0)) + (isShield ? ' sticker-shield' : '') + (allocated > 0 ? ' separated' : '');

    // Um clique já marca "tenho" (verde); clicar de novo soma repetida (âmbar).
    // Botão direito depende do navegador/extensões (alguns bloqueiam o
    // preventDefault do menu nativo), então Shift+clique é o jeito garantido
    // de remover; o botão direito continua funcionando como atalho extra
    // onde o navegador permitir.
    // No modo separando, só as repetidas usam clique pra separar/tirar da
    // lista ativa — figurinhas sem repetida continuam somando/removendo
    // normal, senão não dava pra tirar uma marcação errada de volta a zero
    // enquanto o modo estivesse ligado.
    const separateHere = separationMode && isDupe;
    div.title = separateHere
      ? `${label} — clique: separar (+1 na lista ativa) · shift+clique ou botão direito: tirar (-1)`
      : `${label}${isShield ? ' — escudo do time' : ''} — ${isDupe ? 'Tenho repetida' : (isOwned ? 'Tenho' : 'Não tenho')}\nClique: marcar/somar · Shift+clique ou botão direito: remover`;
    div.addEventListener('click', (ev) => {
      if (separateHere) {
        if (ev.shiftKey) unseparateOneClick(key);
        else separateOneClick(key, label, team.name);
        return;
      }
      if (ev.shiftKey) removeOne(key);
      else addOne(key);
      renderAll();
    });
    div.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      if (separateHere) {
        unseparateOneClick(key);
        return;
      }
      removeOne(key);
      renderAll();
    });

    div.textContent = label;

    if (count > 1) {
      const extraBadge = document.createElement('span');
      extraBadge.className = 'extra-badge';
      extraBadge.textContent = count - 1;
      extraBadge.title = `${count - 1} repetida(s)`;
      div.appendChild(extraBadge);
    }
    if (allocated > 0) {
      const badge = document.createElement('span');
      badge.className = 'sep-badge';
      badge.textContent = allocated;
      badge.title = `${allocated} separada(s)`;
      div.appendChild(badge);
    }
    return div;
  }

  function teamProgress(team, meta) {
    let owned = 0, dupe = 0, separated = 0;
    teamSlots(team, meta).forEach((slot) => {
      const { key } = stickerId(team, slot);
      const count = getCount(key);
      if (count > 0) owned++;
      if (count > 1) dupe++;
      if (allocatedQty(key) > 0) separated++;
    });
    return { owned, dupe, separated };
  }

  function teamCard(team) {
    const meta = teamMeta(team);
    const card = document.createElement('div');
    card.className = 'team-card';
    card.id = teamId(team);
    card.dataset.search = (team.name + ' ' + team.code).toLowerCase();

    const header = document.createElement('div');
    header.className = 'team-header';

    const badge = document.createElement('span');
    badge.className = 'team-badge';
    badge.style.background = team.color;
    badge.textContent = team.code;

    const name = document.createElement('span');
    name.className = 'team-name';
    name.textContent = team.name;

    const code = document.createElement('span');
    code.className = 'team-code';
    code.textContent = team.code;

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = '📤';
    copyBtn.title = 'Copiar repetidas desse time';
    copyBtn.addEventListener('click', () => copyDupesForTeams([team]));

    header.append(badge, name, code, copyBtn);
    card.appendChild(header);

    const progress = teamProgress(team, meta);
    const bar = document.createElement('div');
    bar.className = 'progress-bar';
    const ownedFill = document.createElement('div');
    ownedFill.className = 'progress-fill-owned';
    ownedFill.style.width = (100 * (progress.owned - progress.separated) / meta.stickerCount) + '%';
    const sepFill = document.createElement('div');
    sepFill.className = 'progress-fill-sep';
    sepFill.style.width = (100 * progress.separated / meta.stickerCount) + '%';
    bar.append(ownedFill, sepFill);
    card.appendChild(bar);

    const grid = document.createElement('div');
    grid.className = 'sticker-grid';
    teamSlots(team, meta).forEach((slot) => grid.appendChild(stickerCell(team, slot)));
    card.appendChild(grid);

    return card;
  }

  function sectionId(section) {
    return 'section-' + section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  function teamId(team) {
    return 'team-' + team.code;
  }

  // Barra de navegação rápida entre seções — em telas pequenas, rolar até o
  // fim de 51 grupos de times pra achar "Cards" é ruim; os chips resolvem.
  function renderSectionNav() {
    const nav = document.getElementById('sectionNav');
    nav.innerHTML = '';
    SECTIONS.forEach((section) => {
      const btn = document.createElement('button');
      btn.className = 'section-chip';
      btn.textContent = section.title;
      btn.addEventListener('click', () => {
        expandSection(section.title);
        document.getElementById(sectionId(section)).scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      nav.appendChild(btn);
    });
  }

  // Seletor no menu lateral pra pular direto pra um time específico, sem
  // precisar rolar ou saber em qual seção ele está.
  function renderTeamJump() {
    const select = document.getElementById('teamJumpSelect');
    SECTIONS.forEach((section) => {
      const group = document.createElement('optgroup');
      group.label = section.title;
      section.teams.forEach((team) => {
        const opt = document.createElement('option');
        opt.value = team.code;
        opt.textContent = team.name;
        group.appendChild(opt);
      });
      select.appendChild(group);
    });
    select.addEventListener('change', () => {
      const code = select.value;
      select.value = '';
      if (!code) return;
      let targetSection = null, targetTeam = null;
      SECTIONS.forEach((section) => {
        const found = section.teams.find((t) => t.code === code);
        if (found) { targetSection = section; targetTeam = found; }
      });
      if (!targetTeam) return;
      expandSection(targetSection.title);
      document.getElementById('drawerOverlay').classList.remove('open');
      requestAnimationFrame(() => {
        const el = document.getElementById(teamId(targetTeam));
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  // ---------- Seções recolhíveis ----------

  const collapsedSections = new Set();

  function expandSection(title) {
    if (collapsedSections.delete(title)) renderGroups();
  }

  function toggleSection(title) {
    if (collapsedSections.has(title)) collapsedSections.delete(title);
    else collapsedSections.add(title);
    renderGroups();
  }

  function renderGroups() {
    const container = document.getElementById('groups');
    container.innerHTML = '';
    SECTIONS.forEach((section) => {
      const isCollapsed = collapsedSections.has(section.title);
      const block = document.createElement('section');
      block.className = 'group-block' + (isCollapsed ? ' collapsed' : '');
      block.id = sectionId(section);

      const h2 = document.createElement('h2');
      h2.className = 'group-title';
      const chevron = document.createElement('span');
      chevron.className = 'group-chevron';
      chevron.textContent = isCollapsed ? '▸' : '▾';
      h2.append(chevron, document.createTextNode(section.title));
      h2.addEventListener('click', () => toggleSection(section.title));
      block.appendChild(h2);

      const grid = document.createElement('div');
      grid.className = 'group-grid';
      section.teams.forEach((team) => grid.appendChild(teamCard(team)));
      block.appendChild(grid);

      container.appendChild(block);
    });
    applyFilter();
  }

  function renderAll() {
    renderGroups();
    renderHeaderProgress();
    renderDrawerStats();
  }

  // ---------- Filter ----------

  function applyFilter() {
    const q = document.getElementById('filterInput').value.trim().toLowerCase();
    document.querySelectorAll('.team-card').forEach((card) => {
      const match = !q || card.dataset.search.includes(q);
      card.classList.toggle('hidden-by-filter', !match);
    });
    document.querySelectorAll('.group-block').forEach((block) => {
      const anyVisible = Array.from(block.querySelectorAll('.team-card'))
        .some((c) => !c.classList.contains('hidden-by-filter'));
      block.style.display = anyVisible ? '' : 'none';
    });
  }

  // ---------- Separation mode ----------

  function toggleSeparationMode() {
    if (separationMode) {
      setSeparationMode(false);
      return;
    }
    openListPicker('Escolher lista pra separar', (listId) => {
      activeListId = listId;
      setSeparationMode(true);
    });
  }

  function setSeparationMode(on) {
    separationMode = on;
    document.getElementById('separationModeBtn').classList.toggle('active', on);
    renderSeparationBanner();
    renderGroups();
  }

  function renderSeparationBanner() {
    const banner = document.getElementById('separationBanner');
    if (!separationMode) {
      banner.classList.add('hidden');
      return;
    }
    banner.classList.remove('hidden');
    banner.innerHTML = '';
    const list = activeList();
    const text = document.createElement('span');
    text.className = 'separation-banner-text';
    text.textContent = `📦 Modo separando ativo — lista: ${list ? list.name : '(nenhuma)'}. Clique numa repetida pra separar, shift+clique pra tirar.`;

    const switchBtn = document.createElement('button');
    switchBtn.className = 'btn btn-tiny';
    switchBtn.textContent = '🔀 Trocar lista';
    switchBtn.addEventListener('click', () => {
      openListPicker('Trocar pra qual lista?', (listId) => {
        activeListId = listId;
        renderSeparationBanner();
      });
    });

    const stopBtn = document.createElement('button');
    stopBtn.className = 'btn btn-tiny';
    stopBtn.textContent = '⏹️ Parar';
    stopBtn.addEventListener('click', () => setSeparationMode(false));

    banner.append(text, switchBtn, stopBtn);
  }

  // ---------- List picker (escolher/criar lista ao separar) ----------

  let listPickerConfirm = null;

  function openListPicker(title, onConfirm) {
    listPickerConfirm = onConfirm;
    document.getElementById('listPickerTitle').textContent = title;
    const existingEl = document.getElementById('listPickerExisting');
    existingEl.innerHTML = '';
    listArray().forEach((list) => {
      const btn = document.createElement('button');
      btn.className = 'btn list-picker-item';
      const count = Object.keys(list.items).length;
      btn.textContent = `${list.name} (${count} item${count === 1 ? '' : 's'})`;
      btn.addEventListener('click', () => {
        listPickerConfirm(list.id);
        closeListPicker();
      });
      existingEl.appendChild(btn);
    });
    document.getElementById('listPickerNewName').value = '';
    document.getElementById('listPickerOverlay').classList.remove('hidden');
    document.getElementById('listPickerNewName').focus();
  }

  function closeListPicker() {
    document.getElementById('listPickerOverlay').classList.add('hidden');
    listPickerConfirm = null;
  }

  function confirmNewListFromPicker() {
    const nameInput = document.getElementById('listPickerNewName');
    if (!nameInput.value.trim() || !listPickerConfirm) return;
    const list = getOrCreateList(nameInput.value);
    listPickerConfirm(list.id);
    closeListPicker();
  }

  // ---------- Minhas listas ----------

  function renderMyLists() {
    const content = document.getElementById('myListsContent');
    content.innerHTML = '';
    const lists = listArray();
    if (lists.length === 0) {
      content.innerHTML = '<p class="hint">Nenhuma lista ainda. Ative o "Modo separando" e clique numa repetida, ou separe direto pela tela de "Colar lista".</p>';
      return;
    }
    lists.forEach((list) => {
      const block = document.createElement('div');
      block.className = 'trade-list-block';

      const header = document.createElement('div');
      header.className = 'trade-list-header';
      const title = document.createElement('h3');
      const itemCount = Object.keys(list.items).length;
      title.textContent = `${list.name} — ${itemCount} pendente${itemCount === 1 ? '' : 's'}`;

      const copyBtn = document.createElement('button');
      copyBtn.className = 'btn';
      copyBtn.textContent = '📤 Copiar';
      copyBtn.addEventListener('click', () => copyTradeList(list));

      const deliverAllBtn = document.createElement('button');
      deliverAllBtn.className = 'btn btn-owned';
      deliverAllBtn.textContent = '✅ Marcar tudo como entregue';
      deliverAllBtn.disabled = itemCount === 0;
      deliverAllBtn.addEventListener('click', () => {
        deliverList(list.id);
        renderAll();
        renderMyLists();
        showToast(`Lista "${list.name}" entregue!`);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn';
      deleteBtn.textContent = '🗑️ Excluir lista';
      deleteBtn.disabled = itemCount > 0;
      deleteBtn.title = itemCount > 0 ? 'Entregue ou remova os itens antes de excluir' : 'Excluir lista vazia';
      deleteBtn.addEventListener('click', () => {
        deleteList(list.id);
        renderMyLists();
      });

      header.append(title, copyBtn, deliverAllBtn, deleteBtn);
      block.appendChild(header);

      const itemsWrap = document.createElement('div');
      itemsWrap.className = 'trade-list-items';
      Object.keys(list.items).forEach((key) => {
        const entry = list.items[key];
        const row = document.createElement('div');
        row.className = 'trade-list-row';

        const label = document.createElement('span');
        label.className = 'trade-list-label';
        label.textContent = `${entry.label} (x${entry.qty})`;

        const minusBtn = document.createElement('button');
        minusBtn.className = 'step-mini';
        minusBtn.textContent = '−';
        minusBtn.title = 'Tirar 1 dessa lista (não entrega, só desmarca)';
        minusBtn.addEventListener('click', () => {
          addAllocation(list.id, entry.key, entry.label, -1);
          renderAll();
          renderMyLists();
        });

        const plusBtn = document.createElement('button');
        plusBtn.className = 'step-mini';
        plusBtn.textContent = '+';
        plusBtn.title = 'Separar mais uma dessa figurinha pra essa lista';
        plusBtn.addEventListener('click', () => {
          addAllocation(list.id, entry.key, entry.label, 1);
          renderAll();
          renderMyLists();
        });

        const deliverBtn = document.createElement('button');
        deliverBtn.className = 'btn btn-owned btn-tiny';
        deliverBtn.textContent = 'Entregue';
        deliverBtn.addEventListener('click', () => {
          deliverItem(list.id, key);
          renderAll();
          renderMyLists();
        });

        row.append(label, minusBtn, plusBtn, deliverBtn);
        itemsWrap.appendChild(row);
      });
      if (itemCount === 0) {
        itemsWrap.innerHTML = '<p class="hint">Tudo entregue por aqui!</p>';
      }
      block.appendChild(itemsWrap);

      content.appendChild(block);
    });
  }

  function copyTradeList(list) {
    const items = Object.values(list.items);
    if (items.length === 0) {
      showToast('Essa lista não tem itens pendentes.');
      return;
    }
    const text = `${list.name}\n` + items.map((it) => `${it.label}${it.qty > 1 ? ' (x' + it.qty + ')' : ''}`).join(', ');
    navigator.clipboard.writeText(text).then(() => {
      showToast('Lista copiada!');
    }).catch(() => {
      window.prompt('Copie manualmente (Ctrl+C):', text);
    });
  }

  function openMyLists() {
    renderMyLists();
    document.getElementById('myListsOverlay').classList.remove('hidden');
  }

  function closeMyLists() {
    document.getElementById('myListsOverlay').classList.add('hidden');
  }

  // ---------- Import / verificação ----------

  // Formato 1: códigos colados junto do número, ex. "E5", "M3" ou "CB3 (x1)".
  const TOKEN_RE = /\b([A-Za-z]{1,4})(\d{1,3})\b/g;
  // Formato 2: código (+ nome) seguido de ":" e números soltos, ex. "CB: 2, 3".
  const LINE_COLON_RE = /\b([A-Za-z]{1,4})\b[^\n:]{0,24}:\s*([\d,\s]+)/g;
  // Formato 3: números soltos de jogador/painel/card (sem prefixo), separados
  // por vírgula/ponto-e-vírgula/quebra de linha, ex. "45, 102, 233".
  const BARE_NUM_RE = /(?:^|[,;\n])\s*(\d{1,3})\s*(?=[,;\n]|$)/g;

  function parseTokens(text) {
    const seen = new Set();
    const tokens = [];

    function addToken(key, label) {
      if (seen.has(key)) return;
      seen.add(key);
      const known = ALL_STICKERS[key];
      tokens.push({ key, label, exists: !!known, teamName: known ? known.teamName : null });
    }

    function addCodeToken(code, num) {
      addToken(code + num, code + num);
    }

    function addPlayerToken(globalNum) {
      addToken(String(globalNum), String(globalNum));
    }

    let m;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(text)) !== null) {
      addCodeToken(m[1].toUpperCase(), parseInt(m[2], 10));
    }

    LINE_COLON_RE.lastIndex = 0;
    while ((m = LINE_COLON_RE.exec(text)) !== null) {
      const code = m[1].toUpperCase();
      // só aceita se o código+1 for uma figurinha conhecida, pra não
      // confundir palavras curtas do texto com um código.
      if (!ALL_STICKERS[code + '1']) continue;
      const nums = m[2].match(/\d{1,3}/g) || [];
      nums.forEach((numStr) => addCodeToken(code, parseInt(numStr, 10)));
    }

    BARE_NUM_RE.lastIndex = 0;
    while ((m = BARE_NUM_RE.exec(text)) !== null) {
      addPlayerToken(parseInt(m[1], 10));
    }

    return tokens;
  }

  let currentTokens = [];

  function openImport() {
    document.getElementById('importOverlay').classList.remove('hidden');
    document.getElementById('importStep1').classList.remove('hidden');
    document.getElementById('importStep2').classList.add('hidden');
    document.getElementById('importText').focus();
  }

  function closeImport() {
    document.getElementById('importOverlay').classList.add('hidden');
  }

  function currentMatches() {
    return currentTokens.filter((t) => t.exists && getCount(t.key) > 1);
  }

  function separateAllMatches() {
    const matches = currentMatches();
    if (matches.length === 0) return;
    // Sempre pergunta a lista aqui, mesmo com uma lista ativa do "Modo
    // separando" — essa ação é independente daquele modo.
    openListPicker('Separar essa lista inteira pra qual lista?', (listId) => {
      matches.forEach((t) => addAllocation(listId, t.key, t.label, 1));
      activeListId = listId;
      renderAll();
      renderImportMatches();
      showToast(`${matches.length} figurinha(s) separada(s) em "${state.tradeLists[listId].name}"`);
    });
  }

  function copyMatches() {
    const matches = currentMatches();
    if (matches.length === 0) return;
    const text = matches.map((t) => t.label).join(', ');
    navigator.clipboard.writeText(text).then(() => {
      showToast('Lista do que você tem copiada!');
    }).catch(() => {
      window.prompt('Copie manualmente (Ctrl+C):', text);
    });
  }

  function renderImportMatches() {
    const wrap = document.getElementById('importMatches');
    const matchSummary = document.getElementById('importMatchSummary');
    const separateAllBtn = document.getElementById('separateAllBtn');
    const copyMatchesBtn = document.getElementById('copyMatchesBtn');
    wrap.innerHTML = '';

    const matches = currentMatches();

    if (matches.length === 0) {
      matchSummary.textContent = currentTokens.length > 0
        ? 'Você não tem nenhuma dessas como repetida no momento.'
        : '';
      matchSummary.classList.toggle('hidden', currentTokens.length === 0);
      matchSummary.classList.remove('has-matches');
      separateAllBtn.classList.add('hidden');
      copyMatchesBtn.classList.add('hidden');
      return;
    }

    matchSummary.textContent = `Você tem ${matches.length} dessas repetida(s) — dá pra oferecer em troca!`;
    matchSummary.classList.remove('hidden');
    matchSummary.classList.add('has-matches');
    separateAllBtn.classList.remove('hidden');
    copyMatchesBtn.classList.remove('hidden');

    matches.forEach((t) => {
      const count = getCount(t.key);
      const allocated = allocatedQty(t.key);

      const row = document.createElement('div');
      row.className = 'match-row';

      const label = document.createElement('span');
      label.className = 'match-label';
      label.textContent = `${t.label} — ${count - 1} repetida${count - 1 === 1 ? '' : 's'}${allocated > 0 ? `, ${allocated} já separada(s)` : ''}`;

      const sepBtn = document.createElement('button');
      sepBtn.className = 'btn btn-dupe btn-tiny';
      sepBtn.textContent = '📦 Separar';
      sepBtn.addEventListener('click', () => {
        separateOneViaPicker(t.key, t.label, t.teamName, renderImportMatches);
      });

      row.append(label, sepBtn);
      wrap.appendChild(row);
    });
  }

  function analyzeImport() {
    const text = document.getElementById('importText').value;
    currentTokens = parseTokens(text);
    const preview = document.getElementById('importPreview');
    preview.innerHTML = '';

    if (currentTokens.length === 0) {
      preview.innerHTML = '<div class="preview-row unknown"><span class="preview-status">Nenhum código reconhecido (ex.: AME1, "JOG: 2, 3" ou um número solto de jogador) foi encontrado no texto.</span></div>';
    }

    currentTokens.forEach((t) => {
      const row = document.createElement('div');
      const count = t.exists ? getCount(t.key) : 0;
      const isMatch = t.exists && count > 1;
      row.className = 'preview-row' + (t.exists ? '' : ' unknown') + (isMatch ? ' match' : '');
      const codeEl = document.createElement('span');
      codeEl.className = 'preview-code';
      codeEl.textContent = t.label;
      const statusEl = document.createElement('span');
      statusEl.className = 'preview-status';
      if (t.exists) {
        statusEl.textContent = isMatch
          ? `${t.teamName} — você TEM repetida (${count - 1}x), pode oferecer! ✅`
          : `${t.teamName} — você não tem repetida dessa`;
      } else {
        statusEl.textContent = 'Código não reconhecido no álbum — será ignorado';
      }
      row.append(codeEl, statusEl);
      preview.appendChild(row);
    });

    renderImportMatches();

    document.getElementById('importStep1').classList.add('hidden');
    document.getElementById('importStep2').classList.remove('hidden');
  }

  function applyImportAsDupe() {
    let applied = 0;
    currentTokens.forEach((t) => {
      if (!t.exists) return;
      addOne(t.key);
      applied++;
    });
    renderAll();
    closeImport();
    showToast(`${applied} figurinha(s) marcada(s).`);
  }

  // ---------- Export / copiar ----------

  function copyDupesForTeams(teams) {
    const blocks = [];
    teams.forEach((team) => {
      const meta = teamMeta(team);
      const labels = [];
      teamSlots(team, meta).forEach((slot) => {
        const { key, label } = stickerId(team, slot);
        if (getCount(key) > 1) labels.push(label);
      });
      if (labels.length === 0) return;
      const lines = [];
      for (let i = 0; i < labels.length; i += 6) {
        lines.push(labels.slice(i, i + 6).join(', '));
      }
      blocks.push(team.code + '\n' + lines.join('\n'));
    });

    if (blocks.length === 0) {
      showToast('Nenhuma figurinha repetida para copiar.');
      return;
    }

    const text = blocks.join('\n\n');
    navigator.clipboard.writeText(text).then(() => {
      showToast('Lista de repetidas copiada!');
    }).catch(() => {
      window.prompt('Copie manualmente (Ctrl+C):', text);
    });
  }

  function copyAllDupes() {
    const allTeams = [];
    SECTIONS.forEach((s) => s.teams.forEach((t) => allTeams.push(t)));
    copyDupesForTeams(allTeams);
  }

  // ---------- Exportar / importar dados (backup e transporte entre navegadores) ----------

  function exportData() {
    const payload = {
      app: 'figurinhas-brasileirao-2026',
      version: DATA_VERSION,
      exportedAt: new Date().toISOString(),
      state: { items: state.items, tradeLists: state.tradeLists },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `figurinhas-brasileirao-2026-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Dados exportados!');
  }

  function importDataFromFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let incoming;
      try {
        const parsed = JSON.parse(reader.result);
        incoming = parsed && parsed.state ? parsed.state : parsed;
        if (!incoming || typeof incoming !== 'object' || typeof incoming.items !== 'object') {
          throw new Error('Formato inesperado');
        }
      } catch (e) {
        console.warn('Falha ao ler arquivo de importação.', e);
        showToast('⚠️ Arquivo inválido, não foi possível importar.');
        return;
      }
      if (!window.confirm('Importar vai substituir os dados salvos neste navegador. Continuar?')) return;
      state.items = incoming.items || {};
      state.tradeLists = incoming.tradeLists || {};
      activeListId = null;
      setSeparationMode(false);
      save();
      renderAll();
      showToast('Dados importados!');
    };
    reader.readAsText(file);
  }

  // ---------- Toast ----------

  let toastTimer = null;
  function showToast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 2600);
  }

  // ---------- Wiring ----------

  function init() {
    load();
    renderSectionNav();
    renderTeamJump();
    renderAll();

    document.getElementById('filterInput').addEventListener('input', applyFilter);
    document.getElementById('openImportBtn').addEventListener('click', openImport);
    document.getElementById('closeImportBtn').addEventListener('click', closeImport);
    document.getElementById('analyzeBtn').addEventListener('click', analyzeImport);
    document.getElementById('backBtn').addEventListener('click', () => {
      document.getElementById('importStep2').classList.add('hidden');
      document.getElementById('importStep1').classList.remove('hidden');
    });
    document.getElementById('applyDupeBtn').addEventListener('click', applyImportAsDupe);
    document.getElementById('separateAllBtn').addEventListener('click', separateAllMatches);
    document.getElementById('copyMatchesBtn').addEventListener('click', copyMatches);
    document.getElementById('copyAllBtn').addEventListener('click', copyAllDupes);
    document.getElementById('separationModeBtn').addEventListener('click', toggleSeparationMode);
    document.getElementById('importOverlay').addEventListener('click', (ev) => {
      if (ev.target.id === 'importOverlay') closeImport();
    });

    document.getElementById('exportJsonBtn').addEventListener('click', exportData);
    document.getElementById('importJsonBtn').addEventListener('click', () => document.getElementById('importJsonFile').click());
    document.getElementById('importJsonFile').addEventListener('change', (ev) => {
      const file = ev.target.files[0];
      if (file) importDataFromFile(file);
      ev.target.value = '';
    });

    document.getElementById('myListsBtn').addEventListener('click', openMyLists);
    document.getElementById('closeMyListsBtn').addEventListener('click', closeMyLists);
    document.getElementById('myListsOverlay').addEventListener('click', (ev) => {
      if (ev.target.id === 'myListsOverlay') closeMyLists();
    });

    document.getElementById('closeListPickerBtn').addEventListener('click', closeListPicker);
    document.getElementById('listPickerCreateBtn').addEventListener('click', confirmNewListFromPicker);
    document.getElementById('listPickerNewName').addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') confirmNewListFromPicker();
    });
    document.getElementById('listPickerOverlay').addEventListener('click', (ev) => {
      if (ev.target.id === 'listPickerOverlay') closeListPicker();
    });

    const drawerOverlay = document.getElementById('drawerOverlay');
    document.getElementById('menuFab').addEventListener('click', () => drawerOverlay.classList.add('open'));
    document.getElementById('closeDrawerBtn').addEventListener('click', () => drawerOverlay.classList.remove('open'));
    drawerOverlay.addEventListener('click', (ev) => {
      if (ev.target.id === 'drawerOverlay') drawerOverlay.classList.remove('open');
    });
    document.querySelectorAll('.drawer-actions .btn').forEach((btn) => {
      btn.addEventListener('click', () => drawerOverlay.classList.remove('open'));
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((e) => {
        console.warn('Falha ao registrar o service worker (PWA offline não vai funcionar).', e);
      });
    });
  }
})();
