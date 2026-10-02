(() => {
  const outlets = {
    hari: { name: 'Hari Nagar', phone: '+919873347347', menu: 'https://woodland-affairs.godirekt.in/spark/app/#/mainpage', image: 'images/amb-hari-green.jpg' },
    dwarka: { name: 'Dwarka', phone: '+919873798727', menu: 'https://woodland-affairs-dwarka.godirekt.in/spark/app/#/mainpage', image: 'images/wa-dwarka.jpg' },
    janakpuri: { name: 'Janakpuri · Eatery Royale', phone: '+919990283002', menu: 'https://eateryroyale.godirekt.in/spark/app/#/mainpage', image: 'images/wa-eatery-royale-web.webp' }
  };
  let outlet = 'hari', type = 'carte';
  let page = 0, turning = false;
  let swipe = null;
  let activeTurn = null, queuedPage = null, turnTimer = 0;
  let suppressPageClickUntil = 0;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const results = document.getElementById('menu-results');
  function sheetMarkup(pageNumber) {
    const pages = window.woodlandMenus[outlet];
    const [heading, dishes] = pages[pageNumber];
    return `<div class="book-page-top"><span class="notebook__eyebrow">${outlets[outlet].name} · À la carte</span><span class="book-chapter-number" aria-hidden="true">${String(pageNumber + 1).padStart(2, '0')}</span></div><h3>${heading}</h3><div class="book-divider" aria-hidden="true">✦</div><ul>${dishes.map((dish, index) => `<li><span class="book-dish-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><span>${dish}</span></li>`).join('')}</ul><span class="notebook__folio">WOODLAND AFFAIRS <span>${String(pageNumber + 1).padStart(2, '0')} / ${String(pages.length).padStart(2, '0')}</span></span>`;
  }
  function notebookPage() {
    const pages = window.woodlandMenus[outlet];
    const sheet = results.querySelector('.notebook > .notebook__sheet');
    if (!sheet) return;
    sheet.innerHTML = sheetMarkup(page);
    sheet.scrollTop = 0;
    results.querySelector('[data-page="prev"]').disabled = page === 0;
    results.querySelector('[data-page="next"]').disabled = page === pages.length - 1;
    results.querySelector('.notebook__progress').textContent = `Page ${page + 1} of ${pages.length}`;
    results.querySelectorAll('[data-chapter]').forEach(button => {
      button.setAttribute('aria-pressed', String(Number(button.dataset.chapter) === page));
    });
  }
  function cancelTurn() {
    const previous = activeTurn;
    activeTurn = null;
    queuedPage = null;
    clearTimeout(turnTimer);
    if (previous) {
      previous.animations.forEach(animation => animation.cancel());
      previous.layer.remove();
      results.querySelector('.notebook > .notebook__sheet')?.style.removeProperty('visibility');
    }
    swipe = null;
    turning = false;
  }
  function turnPage(direction, target) {
    const next = target === undefined ? (queuedPage ?? page) + direction : target;
    if (next < 0 || next >= window.woodlandMenus[outlet].length) return;
    if (turning) { queuedPage = next; return; }
    if (next === page) return;
    direction = next > page ? 1 : -1;
    const sheet = results.querySelector('.notebook__sheet');
    const previousScroll = sheet.scrollTop;
    const outgoing = sheet.cloneNode(true);
    page = next;
    notebookPage();
    if (reduceMotion.matches || !sheet.animate) return;
    const incoming = sheet.cloneNode(true);
    const layer = document.createElement('div');
    layer.className = 'book-turn-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.style.cssText = `left:${sheet.offsetLeft}px;top:${sheet.offsetTop}px;width:${sheet.offsetWidth}px;height:${sheet.offsetHeight}px`;
    [outgoing, incoming].forEach(face => {
      face.removeAttribute('aria-live');
      face.className = 'notebook__sheet book-turn-face';
      layer.appendChild(face);
    });
    sheet.parentElement.appendChild(layer);
    outgoing.scrollTop = previousScroll;
    turning = true;
    sheet.style.visibility = 'hidden';
    const state = { layer, animations:[] };
    activeTurn = state;
    const settle = () => {
      if (activeTurn !== state) return;
      clearTimeout(turnTimer);
      activeTurn = null;
      state.animations.forEach(animation => animation.cancel());
      layer.remove();
      sheet.style.removeProperty('visibility');
      turning = false;
      const requested = queuedPage;
      queuedPage = null;
      if (requested !== null) turnPage(requested > page ? 1 : -1, requested);
    };
    const timing = { duration:520, easing:'linear', fill:'both' };
    try {
      // Swap faces at the edge-on midpoint, within the page area.
      state.animations = [
        outgoing.animate([
          { transform:'rotateY(0deg)', opacity:1, offset:0, easing:'ease-in' },
          { transform:`rotateY(${-direction * 90}deg)`, opacity:1, offset:0.5 },
          { transform:`rotateY(${-direction * 90}deg)`, opacity:0, offset:0.501 },
          { transform:`rotateY(${-direction * 90}deg)`, opacity:0, offset:1 }
        ], timing),
        incoming.animate([
          { transform:`rotateY(${direction * 90}deg)`, opacity:0, offset:0 },
          { transform:`rotateY(${direction * 90}deg)`, opacity:0, offset:0.499 },
          { transform:`rotateY(${direction * 90}deg)`, opacity:1, offset:0.5, easing:'ease-out' },
          { transform:'rotateY(0deg)', opacity:1, offset:1 }
        ], timing)
      ];
      Promise.all(state.animations.map(animation => animation.finished)).then(settle, settle);
      turnTimer = setTimeout(settle, 850);
    } catch { settle(); }
  }
  function buffetCard(menu, index) {
    return `<details class="buffet-card" ${index === 0 ? 'open' : ''}><summary><span class="buffet-card__number">${String(index + 1).padStart(2, '0')}</span><span class="buffet-card__identity"><strong>${menu.title}</strong><small>${menu.terms}</small></span><span class="buffet-card__toggle" aria-hidden="true">+</span></summary><div class="buffet-card__body">${menu.sections.map(([name, items]) => `<section><h4>${name}</h4><p>${items}</p></section>`).join('')}</div></details>`;
  }
  function render() {
    cancelTurn();
    const selected = outlets[outlet];
    let body;
    if (type === 'carte') {
      body = `<p class="menu-notice">Tap the right side for the next page or the left edge to go back. Swipe left or right to explore selected dishes from ${selected.name}. Prices are available in the <a href="${selected.menu}" target="_blank" rel="noopener noreferrer">full digital menu ↗</a>.</p><div class="book-chapters" role="group" aria-label="Menu chapters">${window.woodlandMenus[outlet].map(([heading], index) => `<button type="button" data-chapter="${index}" aria-pressed="${index === page}"><span>${String(index + 1).padStart(2, '0')}</span>${heading}</button>`).join('')}</div><div class="notebook" tabindex="0" aria-label="${selected.name} à la carte menu book" style="--book-photo:url('${selected.image}')"><div class="notebook__inside"><span class="book-edition">WOODLAND AFFAIRS<span>THE DINING COLLECTION</span></span><div class="book-cover-copy"><span class="menu-kicker">${selected.name}</span><h3>Good food,<br><em>page by page.</em></h3><p>Explore the flavours of ${selected.name}.</p></div><span class="book-cover-seal" aria-hidden="true">✦<span>EST. FOR GOOD TIMES</span></span><span class="book-cover-bottom">A LITTLE WILD. A LOT DELICIOUS.</span></div><div class="notebook__sheet" aria-live="polite"></div></div><div class="notebook__controls"><button type="button" data-page="prev" aria-label="Previous menu page">← Previous page</button><span class="notebook__progress"></span><button type="button" data-page="next" aria-label="Next menu page">Next page →</button></div>`;
    } else {
      body = outlet === 'janakpuri'
        ? `<div class="buffet-unavailable"><h3>Planning a buffet in Janakpuri?</h3><p>The supplied buffet packages apply to Hari Nagar and Dwarka. Contact Eatery Royale for its current group dining options.</p><a class="btn btn--brass" href="tel:${selected.phone}">Call Eatery Royale ↗</a></div>`
        : `<p class="menu-notice">These five packages are for Hari Nagar and Dwarka. Select a package to see its dishes and terms. Please confirm availability when booking.</p><div class="buffet-list">${window.woodlandBuffets.map(buffetCard).join('')}</div>`;
    }
    results.innerHTML = `<div class="menu-title"><h2>${type === 'carte' ? 'À la carte' : 'Buffet menus'}</h2><small>${selected.name} / ${type === 'carte' ? 'Selected dishes' : 'Group dining'}</small></div>${body}`;
    if (type === 'carte') notebookPage();
    const call = document.getElementById('outlet-call');
    call.href = 'tel:' + selected.phone;
    call.textContent = 'Speak to ' + selected.name + ' ↗';
    document.dispatchEvent(new Event('wa:menu-rendered'));
  }
  document.querySelectorAll('[data-outlet]').forEach(button => button.addEventListener('click', () => {
    outlet = button.dataset.outlet;
    page = 0;
    document.querySelectorAll('[data-outlet]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    render();
  }));
  document.querySelectorAll('[data-type]').forEach(button => button.addEventListener('click', () => {
    type = button.dataset.type;
    document.querySelectorAll('[data-type]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    render();
  }));
  results.addEventListener('click', event => {
    const sheet = event.target.closest('.notebook__sheet');
    if (sheet) {
      if (Date.now() < suppressPageClickUntil || event.target.closest('a, button, input, select, textarea')) return;
      const bounds = sheet.getBoundingClientRect();
      turnPage(event.clientX < bounds.left + bounds.width / 3 ? -1 : 1);
      return;
    }

    const button = event.target.closest('[data-page]');
    if (button) turnPage(button.dataset.page === 'next' ? 1 : -1);
    const chapter = event.target.closest('[data-chapter]');
    if (chapter && Number(chapter.dataset.chapter) !== page) turnPage(Number(chapter.dataset.chapter) > page ? 1 : -1, Number(chapter.dataset.chapter));
  });
  results.addEventListener('keydown', event => {
    if (!event.target.closest('.notebook')) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      turnPage(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
  // Track the whole book without rotating the touch target under the finger.
  results.addEventListener('pointerdown', event => {
    const book = event.target.closest('.notebook');
    if (!book || !event.isPrimary || event.button !== 0) { swipe = null; return; }
    suppressPageClickUntil = 0;
    swipe = { id:event.pointerId, x:event.clientX, y:event.clientY, scrolling:false, committed:false };
  });
  results.addEventListener('pointermove', event => {
    if (!swipe || event.pointerId !== swipe.id || swipe.scrolling || swipe.committed) return;
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    if (Math.abs(dy) >= 12 && Math.abs(dy) > Math.abs(dx)) {
      swipe.scrolling = true;
      suppressPageClickUntil = Date.now() + 700;
      return;
    }
    if (Math.abs(dx) < 18 || Math.abs(dx) <= Math.abs(dy)) return;
    swipe.committed = true;
    suppressPageClickUntil = Date.now() + 700;
    turnPage(dx < 0 ? 1 : -1);
  });
  function finishSwipe(event) {
    if (!swipe || event.pointerId !== swipe.id) return;
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    if (event.type === 'pointercancel' || swipe.committed || swipe.scrolling || Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      suppressPageClickUntil = Date.now() + 700;
    }
    swipe = null;
  }
  window.addEventListener('pointerup', finishSwipe);
  window.addEventListener('pointercancel', finishSwipe);
  window.addEventListener('resize', cancelTurn);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelTurn(); });
  reduceMotion.addEventListener('change', cancelTurn);
  render();
})();
