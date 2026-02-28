/* ============================================
   SlayedbySarah — Boston Landing Page JS
   Showcase video, sticky CTA, scroll animations
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // --- Sticky Bottom CTA (appears after scrolling past hero) ---
  const stickyCta = document.getElementById('stickyCta');
  const heroCta = document.getElementById('heroCta');

  if (stickyCta && heroCta) {
    document.body.classList.add('has-sticky-cta');

    const stickyObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        // Sticky appears when hero button is not visible
        stickyCta.classList.toggle('visible', !entry.isIntersecting);
      });
    }, { threshold: 0, rootMargin: "-10px 0px 0px 0px" });

    stickyObserver.observe(heroCta);
  }


  // --- Showcase Video Unmute Toggle ---
  const showcaseVideo = document.querySelector('.boston-showcase-video video');
  const unmuteHint = document.getElementById('unmuteHint');

  if (showcaseVideo && unmuteHint) {
    unmuteHint.addEventListener('click', () => {
      if (showcaseVideo.muted) {
        showcaseVideo.muted = false;
        unmuteHint.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
          Tap to mute
        `;
      } else {
        showcaseVideo.muted = true;
        unmuteHint.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
          Tap to unmute
        `;
      }
    });
  }


  // --- Smooth Scroll ---
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });


  // --- Fade-in Animations ---
  const animObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        animObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

  document.querySelectorAll(
    '.section, .boston-offer-card, .boston-bonus-card, .boston-raffle-card, .boston-referral-card, .boston-urgency-item, .boston-showcase-video'
  ).forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = `opacity 0.6s ease ${i * 0.05}s, transform 0.6s ease ${i * 0.05}s`;
    animObserver.observe(el);
  });

  // Inject visible state
  const style = document.createElement('style');
  style.textContent = '.visible { opacity: 1 !important; transform: translateY(0) !important; }';
  document.head.appendChild(style);

});
