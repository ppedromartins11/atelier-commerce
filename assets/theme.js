/* Progressive enhancement: checkout and add-to-cart work without JavaScript. */
(() => {
  'use strict';
  const openButton = document.querySelector('[data-nav-open]');
  const closeButton = document.querySelector('[data-nav-close]');
  const mobileNav = document.querySelector('[data-mobile-nav]');
  function setNavOpen(isOpen) {
    if (!mobileNav || !openButton) return;
    mobileNav.hidden = !isOpen;
    openButton.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
    if (isOpen) closeButton?.focus();
    else openButton.focus();
  }
  openButton?.addEventListener('click', () => setNavOpen(true));
  closeButton?.addEventListener('click', () => setNavOpen(false));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && mobileNav && !mobileNav.hidden) setNavOpen(false);
  });
  document.addEventListener('click', (event) => {
    if (!mobileNav || mobileNav.hidden || !openButton) return;
    if (!mobileNav.contains(event.target) && !openButton.contains(event.target)) setNavOpen(false);
  });
  document.querySelectorAll('[data-gallery]').forEach((gallery) => {
    const image = gallery.querySelector('.main-product-photo');
    if (!image) return;
    gallery.querySelectorAll('[data-gallery-thumb]').forEach((thumbnail) => {
      thumbnail.addEventListener('click', () => {
        const src = thumbnail.dataset.imageSrc;
        if (!src) return;
        image.src = src;
        image.srcset = '';
        image.alt = thumbnail.dataset.imageAlt || '';
        gallery.querySelectorAll('[data-gallery-thumb]').forEach((button) => {
          button.classList.toggle('is-active', button === thumbnail);
          button.setAttribute('aria-pressed', String(button === thumbnail));
        });
      });
    });
  });
  document.querySelectorAll('[data-product-variants]').forEach((source) => {
    const details = source.closest('.product-details');
    const select = details?.querySelector('[data-variant-select]');
    const price = details?.querySelector('.price-current');
    const compare = details?.querySelector('.price-compare');
    if (!select || !price) return;
    let variants;
    try { variants = JSON.parse(source.textContent); } catch { return; }
    const currency = document.documentElement.dataset.currency || 'BRL';
    const locale = document.documentElement.lang || 'pt-BR';
    const money = (cents) => new Intl.NumberFormat(locale, {
      style: 'currency', currency
    }).format(cents / 100);
    const updatePrice = () => {
      const variant = variants.find((entry) => String(entry.id) === select.value);
      if (!variant) return;
      price.textContent = money(variant.price);
      const crossed = compare?.querySelector('s');
      if (crossed) crossed.textContent = variant.compare_at_price > variant.price
        ? money(variant.compare_at_price) : '';
    };
    select.addEventListener('change', updatePrice);
    updatePrice();
  });

  document.querySelectorAll('[data-quantity]').forEach((control) => {
    const input = control.querySelector('input[type="number"]');
    if (!input) return;
    const change = (step) => {
      const current = Number.parseInt(input.value || '1', 10);
      input.value = String(Math.max(1, (Number.isFinite(current) ? current : 1) + step));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };
    control.querySelector('[data-quantity-decrement]')?.addEventListener('click', () => change(-1));
    control.querySelector('[data-quantity-increment]')?.addEventListener('click', () => change(1));
  });
  document.querySelectorAll('[data-auto-submit]').forEach((form) => {
    form.addEventListener('change', (event) => {
      if (event.target instanceof HTMLInputElement && event.target.type === 'number') return;
      form.requestSubmit();
    });
  });
})();
