const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');
if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => navLinks.classList.remove('open'));
  });
}

// figures out which page we're on and highlights that nav link
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a').forEach(a => {
  const href = a.getAttribute('href').split('#')[0];
  if (href === currentPage || (currentPage === '' && href === 'index.html')) {
    a.classList.add('active');
  }
});

const exhibits = [
  { label: "THE ORIGIN:",      sub: "Punch Cards and Magnetic Drums",  href: "exhibit-origin.html" },
  { label: "THE DISK:",        sub: "Magnetic Storage and HDDs",        href: "exhibit-disk.html" },
  { label: "THE OPTICAL AGE:", sub: "CDs, DVDs, and Their Limits",      href: "exhibit-optical.html" },
  { label: "THE FLASH:",       sub: "SSDs, NAND, and NVMe",             href: "exhibit-flash.html" },
  { label: "THE HORIZON:",     sub: "Cloud, DNA, and Emerging Storage", href: "exhibit-horizon.html" },
];

const carouselItems = document.querySelectorAll('.carousel-item');

// tracks which exhibit is currently active, starting from whichever item
// already has the "active" class in the HTML (Optical, index 2)
let currentIndex = 0;
carouselItems.forEach(item => {
  if (item.classList.contains('active')) {
    currentIndex = parseInt(item.dataset.index, 10);
  }
});

function activateExhibit(idx) {
  // clear whatever was active before
  carouselItems.forEach(i => {
    i.classList.remove('active');
    const old = i.querySelector('.carousel-label');
    const oldBtn = i.querySelector('.btn-select');
    if (old) old.remove();
    if (oldBtn) oldBtn.remove();
  });

  const item = document.querySelector(`.carousel-item[data-index="${idx}"]`);
  if (!item) return;

  item.classList.add('active');
  currentIndex = idx;

  const info = exhibits[idx];
  if (!info) return;

  const btn = document.createElement('a');
  btn.href        = info.href;
  btn.className   = 'btn btn-select';
  btn.textContent = 'Select';

  const label = document.createElement('div');
  label.className = 'carousel-label';
  label.innerHTML = `${info.label}<small>${info.sub}</small>`;

  item.appendChild(btn);
  item.appendChild(label);
}

carouselItems.forEach(item => {
  item.addEventListener('click', () => {
    const idx = parseInt(item.dataset.index, 10);
    activateExhibit(idx);
  });
});

// prev/next buttons cycle through the 5 exhibit icons, wrapping around at the ends
const carouselPrev = document.getElementById('carouselPrev');
const carouselNext = document.getElementById('carouselNext');
const totalExhibits = exhibits.length;

if (carouselPrev) {
  carouselPrev.addEventListener('click', () => {
    const nextIndex = (currentIndex - 1 + totalExhibits) % totalExhibits;
    activateExhibit(nextIndex);
  });
}

if (carouselNext) {
  carouselNext.addEventListener('click', () => {
    const nextIndex = (currentIndex + 1) % totalExhibits;
    activateExhibit(nextIndex);
  });
}

document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});