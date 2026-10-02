(() => {
  const outlets = {
    hari: { name: 'Hari Nagar', phone: '+919873347347', menu: 'https://woodland-affairs.godirekt.in/spark/app/#/mainpage', image: 'images/amb-hari-green.jpg' },
    dwarka: { name: 'Dwarka', phone: '+919873798727', menu: 'https://woodland-affairs-dwarka.godirekt.in/spark/app/#/mainpage', image: 'images/wa-dwarka.jpg' },
    janakpuri: { name: 'Janakpuri · Eatery Royale', phone: '+919990283002', menu: 'https://eateryroyale.godirekt.in/spark/app/#/mainpage', image: 'images/wa-eatery-royale-web.webp' }
  };
  let outlet = 'hari', type = 'carte';
  let page = 0, turning = false;
  let swipe = null;
  let leafAnimation = null, activeTurn = null, dragFrame = 0;
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
  function turnAngle(turn, progress) {
    return turn.direction > 0 ? -180 * progress : -180 * (1 - progress);
  }
  function paintTurn(turn) {
    turn.leaf.style.transform = `rotateY(${turnAngle(turn, turn.progress)}deg)`;
    turn.shadow.style.opacity = String(Math.sin(turn.progress * Math.PI) * .22);
  }
  function cancelTurn() {
    cancelAnimationFrame(dragFrame);
    dragFrame = 0;
    if (leafAnimation) { leafAnimation.cancel(); leafAnimation = null; }
    if (activeTurn) {
      activeTurn.sheet.innerHTML = activeTurn.original;
      activeTurn.sheet.scrollTop = activeTurn.scroll;
      activeTurn.sheet.removeAttribute('aria-busy');
      activeTurn.leaf.remove();
      activeTurn.shadow.remove();
      activeTurn = null;
    }
    swipe = null;
    turning = false;
  }
  function beginTurn(direction, next) {
    if (turning || next === page || next < 0 || next >= window.woodlandMenus[outlet].length) return null;
    const sheet = results.querySelector('.notebook > .notebook__sheet');
    const original = sheet.innerHTML, scroll = sheet.scrollTop;
    // Measure once before modifying the page; dragging only updates transforms.
    const geometry = `left:${sheet.offsetLeft}px;top:${sheet.offsetTop}px;width:${sheet.offsetWidth}px;height:${sheet.offsetHeight}px`;
    const front = sheet.cloneNode(true);
    front.removeAttribute('aria-live');
    front.className = 'notebook__sheet book-leaf-front';
    if (direction > 0) { sheet.innerHTML = sheetMarkup(next); sheet.scrollTop = 0; }
    else front.innerHTML = sheetMarkup(next);
    const leaf = document.createElement('div');
    leaf.className = 'book-turn-leaf';
    leaf.setAttribute('aria-hidden', 'true');
    leaf.style.cssText = geometry;
    const back = document.createElement('div');
    back.className = 'book-leaf-back';
    const shadow = document.createElement('div');
    shadow.className = 'book-page-shadow';
    shadow.setAttribute('aria-hidden', 'true');
    shadow.style.cssText = geometry;
    leaf.append(front, back);
    sheet.parentElement.append(shadow, leaf);
    front.scrollTop = direction > 0 ? scroll : 0;
    sheet.setAttribute('aria-busy', 'true');
    turning = true;
    activeTurn = {sheet, original, scroll, leaf, shadow, direction, next, progress:0};
    paintTurn(activeTurn);
    return activeTurn;
  }
  function settleTurn(commit) {
    const turn = activeTurn;
    if (!turn) return;
    cancelAnimationFrame(dragFrame);
    dragFrame = 0;
    const end = commit ? 1 : 0;
    const duration = reduceMotion.matches ? 0 : Math.max(180, Math.abs(end - turn.progress) * 620);
    paintTurn(turn);
    const animation = turn.leaf.animate([
      {transform:`rotateY(${turnAngle(turn, turn.progress)}deg)`},
      {transform:`rotateY(${turnAngle(turn, end)}deg)`}
    ], {duration, easing:'cubic-bezier(.2,.7,.2,1)', fill:'forwards'});
    turn.shadow.style.transition = `opacity ${duration}ms ease-out`;
    turn.shadow.style.opacity = '0';
    leafAnimation = animation;
    animation.finished.then(() => {
      if (activeTurn !== turn) return;
      if (commit) { page = turn.next; notebookPage(); }
      else { turn.sheet.innerHTML = turn.original; turn.sheet.scrollTop = turn.scroll; }
      turn.sheet.removeAttribute('aria-busy');
      turn.leaf.remove();
      turn.shadow.remove();
      activeTurn = leafAnimation = null;
      turning = false;
    }).catch(() => {});
  }
  function turnPage(direction, target) {
    const next = target === undefined ? page + direction : target;
    if (turning || next === page || next < 0 || next >= window.woodlandMenus[outlet].length) return;
    if (reduceMotion.matches) { page = next; notebookPage(); return; }
    if (beginTurn(direction, next)) settleTurn(true);
  }
  function buffetCard(menu, index) {
    return `<details class="buffet-card" ${index === 0 ? 'open' : ''}><summary><span class="buffet-card__number">${String(index + 1).padStart(2, '0')}</span><span class="buffet-card__identity"><strong>${menu.title}</strong><small>${menu.terms}</small></span><span class="buffet-card__toggle" aria-hidden="true">+</span></summary><div class="buffet-card__body">${menu.sections.map(([name, items]) => `<section><h4>${name}</h4><p>${items}</p></section>`).join('')}</div></details>`;
  }
  function render() {
    cancelTurn();
    const selected = outlets[outlet];
    let body;
    if (type === 'carte') {
      body = `<p class="menu-notice">Turn the pages to explore selected dishes from ${selected.name}. Prices are available in the <a href="${selected.menu}" target="_blank" rel="noopener noreferrer">full digital menu ↗</a>.</p><div class="book-chapters" role="group" aria-label="Menu chapters">${window.woodlandMenus[outlet].map(([heading], index) => `<button type="button" data-chapter="${index}" aria-pressed="${index === page}"><span>${String(index + 1).padStart(2, '0')}</span>${heading}</button>`).join('')}</div><div class="notebook" tabindex="0" aria-label="${selected.name} à la carte menu book" style="--book-photo:url('${selected.image}')"><div class="notebook__inside"><span class="book-edition">WOODLAND AFFAIRS<span>THE DINING COLLECTION</span></span><div class="book-cover-copy"><span class="menu-kicker">${selected.name}</span><h3>Good food,<br><em>page by page.</em></h3><p>Explore the flavours of ${selected.name}.</p></div><span class="book-cover-seal" aria-hidden="true">✦<span>EST. FOR GOOD TIMES</span></span><span class="book-cover-bottom">A LITTLE WILD. A LOT DELICIOUS.</span></div><div class="notebook__sheet" aria-live="polite"></div></div><div class="notebook__controls"><button type="button" data-page="prev" aria-label="Previous menu page">← Previous page</button><span class="notebook__progress"></span><button type="button" data-page="next" aria-label="Next menu page">Next page →</button></div>`;
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
  results.addEventListener('touchstart', event => {
    if (event.touches.length !== 1) { if (activeTurn) settleTurn(false); swipe = null; return; }
    const sheet = event.target.closest('.notebook > .notebook__sheet');
    if (!sheet || turning) return;
    const touch = event.touches[0];
    swipe = {sheet, x:touch.clientX, y:touch.clientY, width:sheet.clientWidth,
      lastX:touch.clientX, lastTime:performance.now(), velocity:0, direction:0, progress:0};
  }, {passive:true});
  results.addEventListener('touchmove', event => {
    if (!swipe) return;
    if (event.touches.length !== 1) { if (activeTurn) settleTurn(false); swipe = null; return; }
    const current = swipe, touch = event.touches[0];
    const dx = touch.clientX - current.x, dy = touch.clientY - current.y;
    if (!current.direction) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { swipe = null; return; }
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
      const direction = dx < 0 ? 1 : -1;
      if (page + direction < 0 || page + direction >= window.woodlandMenus[outlet].length) { swipe = null; return; }
      current.direction = direction;
      if (!reduceMotion.matches) beginTurn(direction, page + direction);
    }
    if (event.cancelable) event.preventDefault();
    const now = performance.now();
    current.velocity = (touch.clientX - current.lastX) / Math.max(1, now - current.lastTime);
    current.lastX = touch.clientX;
    current.lastTime = now;
    current.progress = Math.max(0, Math.min(1, -dx * current.direction / current.width));
    if (activeTurn) {
      activeTurn.progress = current.progress;
      if (!dragFrame) dragFrame = requestAnimationFrame(() => { dragFrame = 0; if (activeTurn) paintTurn(activeTurn); });
    }
  }, {passive:false});
  function finishSwipe(event) {
    if (!swipe) return;
    const current = swipe;
    swipe = null;
    if (!current.direction) return;
    const freshFlick = performance.now() - current.lastTime < 100 && -current.velocity * current.direction > .45;
    const commit = event.type !== 'touchcancel' && (current.progress > .26 || (current.progress > .07 && freshFlick));
    if (activeTurn) settleTurn(commit);
    else if (commit) turnPage(current.direction);
  }
  results.addEventListener('touchend', finishSwipe, {passive:true});
  results.addEventListener('touchcancel', finishSwipe, {passive:true});
  window.addEventListener('resize', cancelTurn);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelTurn(); });
  reduceMotion.addEventListener('change', cancelTurn);
  render();
})();
