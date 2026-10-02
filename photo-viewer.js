(() => {
  if (typeof HTMLDialogElement === 'undefined') return;
  // Only ordinary photo grids expand; tilt cards and layered scenes keep their 3D interaction.
  const depthTargets = '.o-card,.c-card,.func,.mcat,.gitem__media,.split__media,.proposal,.outlet-picker button,.hero,.food-stage,[data-tilt],[data-depth]';
  const candidates = [...document.querySelectorAll('.teaser-grid figure,.spread figure,.more-gallery__item')].filter(container => !container.closest(depthTargets));
  if (!candidates.length) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'photo-viewer';
  dialog.setAttribute('aria-label', 'Enlarged photograph');
  dialog.innerHTML = '<button class="photo-viewer__close" type="button" aria-label="Close photograph">×</button><img class="photo-viewer__image" alt=""><p class="photo-viewer__caption"></p>';
  document.body.append(dialog);
  const image = dialog.querySelector('img');
  const caption = dialog.querySelector('p');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let opener = null, source = null, animation = null, closing = false, ownsHistory = false;
  const marker = 'woodlandPhotoViewer';
  function originTransform() {
    if (!source || !source.isConnected) return 'scale(.95)';
    const from = source.getBoundingClientRect(), to = image.getBoundingClientRect();
    if (!to.width || !to.height || from.bottom < 0 || from.top > innerHeight) return 'scale(.95)';
    return `translate(${from.left + from.width / 2 - to.left - to.width / 2}px,${from.top + from.height / 2 - to.top - to.height / 2}px) scale(${from.width / to.width},${from.height / to.height})`;
  }
  function finishClose() {
    dialog.close();
    dialog.classList.remove('is-closing');
    document.body.classList.remove('photo-open');
    closing = false;
    image.removeAttribute('src');
    if (opener && opener.isConnected) opener.focus({preventScroll:true});
  }
  function closePhoto() {
    if (!dialog.open || closing) return;
    closing = true;
    if (animation) animation.cancel();
    dialog.classList.add('is-closing');
    if (motion.matches) { finishClose(); return; }
    animation = image.animate([{transform:'none',opacity:1},{transform:originTransform(),opacity:.15}], {duration:240,easing:'cubic-bezier(.4,0,.7,1)',fill:'forwards'});
    animation.finished.then(finishClose).catch(finishClose);
  }
  function requestClose() {
    if (closing) return;
    if (ownsHistory && history.state && history.state[marker]) { ownsHistory = false; history.back(); }
    else closePhoto();
  }
  function openPhoto(photo, button) {
    if (dialog.open) return;
    opener = button; source = photo;
    image.src = photo.currentSrc || photo.src;
    image.alt = photo.alt || 'Woodland Affairs photograph';
    caption.textContent = photo.alt;
    document.body.classList.add('photo-open');
    dialog.showModal();
    try { history.pushState({...history.state,[marker]:true},''); ownsHistory = true; } catch (_) { ownsHistory = false; }
    if (animation) animation.cancel();
    if (!motion.matches) animation = image.animate([{transform:originTransform(),opacity:.3},{transform:'none',opacity:1}], {duration:320,easing:'cubic-bezier(.16,1,.3,1)'});
  }
  candidates.forEach(container => {
    const photo = container.querySelector('img');
    if (!photo) return;
    const link = container.closest('a');
    if (link && !/\.(?:jpe?g|webp|png)(?:[?#]|$)/i.test(link.getAttribute('href') || '')) return;
    if (link) {
      link.setAttribute('aria-label', 'Enlarge photograph: ' + photo.alt);
      link.addEventListener('click', event => { event.preventDefault(); openPhoto(photo, link); });
      return;
    }
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'photo-zoom';
    button.setAttribute('aria-label','Enlarge photograph: ' + photo.alt);
    button.innerHTML = '<span aria-hidden="true">⤢</span>';
    container.classList.add('photo-zoom-host');
    container.append(button);
    button.addEventListener('click', () => openPhoto(photo, button));
  });
  dialog.querySelector('button').addEventListener('click', requestClose);
  dialog.addEventListener('click', event => { if (event.target === dialog) requestClose(); });
  dialog.addEventListener('cancel', event => { event.preventDefault(); requestClose(); });
  window.addEventListener('popstate', () => { ownsHistory = false; closePhoto(); });
})();
