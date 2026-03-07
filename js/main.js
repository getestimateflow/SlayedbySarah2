/* ============================================
   SlayedbySarah — Main JavaScript
   Service card expansion, Cal.com embeds,
   tab switching, mobile nav, scroll effects
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // --- Navigation Scroll Effect ---
  const nav = document.getElementById('nav');
  const handleScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();


  // --- Boston Trip Banner (temporary — remove after March 28) ---
  if (!window.location.pathname.startsWith('/boston') && !sessionStorage.getItem('sbs_boston_dismissed')) {
    const bostonBanner = document.createElement('a');
    bostonBanner.href = '/boston';
    bostonBanner.id = 'bostonBanner';
    bostonBanner.style.cssText = 'display:block;position:fixed;top:0;left:0;right:0;z-index:10000;background:linear-gradient(135deg,#C48B7C,#B76E79);color:#fff;text-align:center;padding:12px 40px 12px 20px;font-family:Montserrat,sans-serif;font-size:0.85rem;font-weight:500;text-decoration:none;letter-spacing:0.3px;cursor:pointer;';
    bostonBanner.innerHTML = 'Sarah\u2019s in Boston March 23\u201328! Book your sew-in \u2192';
    const closeBos = document.createElement('button');
    closeBos.style.cssText = 'position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;color:#fff;font-size:1.2rem;cursor:pointer;opacity:0.7;';
    closeBos.innerHTML = '&times;';
    closeBos.onclick = (e) => {
      e.preventDefault(); e.stopPropagation();
      bostonBanner.remove();
      document.body.style.marginTop = '';
      if (nav) nav.style.top = '';
      window.removeEventListener('resize', pushContent);
      sessionStorage.setItem('sbs_boston_dismissed', '1');
    };
    bostonBanner.appendChild(closeBos);
    document.body.appendChild(bostonBanner);
    // Push nav and body content below the banner (measure actual height)
    const pushContent = () => {
      const bannerH = bostonBanner.offsetHeight + 'px';
      document.body.style.marginTop = bannerH;
      if (nav) nav.style.top = bannerH;
    };
    pushContent();
    window.addEventListener('resize', pushContent);
  }


  // --- Stripe Cancel Redirect Banner ---
  if (new URLSearchParams(window.location.search).has('cancelled')) {
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#2D2226;color:#fff;text-align:center;padding:14px 40px 14px 20px;font-family:Montserrat,sans-serif;font-size:0.9rem;';
    banner.textContent = 'Booking cancelled — no charge was made.';
    const close = document.createElement('button');
    close.style.cssText = 'position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;color:#fff;font-size:1.2rem;cursor:pointer;';
    close.innerHTML = '&times;';
    close.onclick = () => { banner.remove(); history.replaceState(null, '', window.location.pathname); };
    banner.appendChild(close);
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 8000);
  }


  // --- Mobile Nav Toggle ---
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');

  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navMenu.classList.toggle('active');
    document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
  });

  // Close mobile nav when a link is clicked
  navMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navToggle.classList.remove('active');
      navMenu.classList.remove('active');
      document.body.style.overflow = '';
    });
  });


  // --- Service Category Tabs ---
  const tabs = document.querySelectorAll('.tab');
  const categories = document.querySelectorAll('.service-category');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const category = tab.dataset.category;

      // Update active tab
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Close any open service cards in all categories
      document.querySelectorAll('.service-card.active').forEach(card => {
        card.classList.remove('active');
      });

      // Show selected category
      categories.forEach(cat => {
        cat.classList.toggle('active', cat.dataset.category === category);
      });
    });
  });


  // --- Location Selector ---
  let currentLocation = 'houston';
  const locationButtons = document.querySelectorAll('.location-btn');

  locationButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const location = btn.dataset.location;
      if (location === currentLocation) return;

      currentLocation = location;

      // Update active button
      locationButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Close any open service cards
      document.querySelectorAll('.service-card.active').forEach(card => {
        card.classList.remove('active');
      });

      // Update all cal links: swap between houston and boston slugs
      document.querySelectorAll('.cal-embed').forEach(embed => {
        const link = embed.dataset.calLink;
        if (!link) return;

        let newLink;
        if (location === 'boston') {
          // slayedbysarah1/slug → slayedbysarah1/boston-slug
          newLink = link.replace('slayedbysarah1/', 'slayedbysarah1/boston-');
        } else {
          // slayedbysarah1/boston-slug → slayedbysarah1/slug
          newLink = link.replace('slayedbysarah1/boston-', 'slayedbysarah1/');
        }

        embed.dataset.calLink = newLink;
        // Reset loaded state so embed reloads with new URL
        embed.dataset.loaded = '';
        embed.innerHTML = '<p class="cal-placeholder">Loading calendar...</p>';
      });

      // Also update the book button data-cal attributes
      document.querySelectorAll('.btn-book').forEach(bookBtn => {
        const cal = bookBtn.dataset.cal;
        if (!cal) return;

        if (location === 'boston') {
          bookBtn.dataset.cal = cal.replace('slayedbysarah1/', 'slayedbysarah1/boston-');
        } else {
          bookBtn.dataset.cal = cal.replace('slayedbysarah1/boston-', 'slayedbysarah1/');
        }
      });
    });
  });


  // --- Service Card: Book Now → Booking Modal ---
  // Uses SBSBooking module (booking.js) instead of Cal.com iframe
  const bookButtons = document.querySelectorAll('.btn-book');

  bookButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const card = button.closest('.service-card');
      const serviceName = card.querySelector('.service-name')?.textContent?.trim() || '';
      const priceText = card.querySelector('.service-price')?.textContent?.trim() || '';
      const servicePrice = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;

      // Extract slug from data-cal attribute (e.g., "slayedbysarah1/16-luxury-install")
      const calAttr = button.dataset.cal || '';
      const slug = calAttr.replace('slayedbysarah1/', '');

      // Open booking modal
      if (typeof SBSBooking !== 'undefined') {
        SBSBooking.open({
          slug: slug,
          serviceName: serviceName,
          servicePrice: servicePrice,
          location: currentLocation,
        });
      }
    });
  });


  // --- Gallery Video Play/Pause ---
  document.querySelectorAll('.gallery-item video').forEach(video => {
    const item = video.closest('.gallery-item');

    // Add play button overlay
    const playIcon = document.createElement('div');
    playIcon.className = 'play-icon';
    playIcon.innerHTML = `
      <svg viewBox="0 0 24 24" fill="white" stroke="none">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
    `;
    item.appendChild(playIcon);

    // Click to play/pause
    item.addEventListener('click', () => {
      if (video.paused) {
        // Pause all other videos first
        document.querySelectorAll('.gallery-item video').forEach(v => {
          if (v !== video) {
            v.pause();
            v.closest('.gallery-item').classList.remove('playing');
          }
        });
        video.play();
        item.classList.add('playing');
      } else {
        video.pause();
        item.classList.remove('playing');
      }
    });
  });


  // --- Smooth Scroll for Anchor Links ---
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();
      const headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height'));
      const targetTop = target.getBoundingClientRect().top + window.scrollY - headerHeight;
      window.scrollTo({ top: targetTop, behavior: 'smooth' });
    });
  });


  // --- Intersection Observer for Fade-in Animations ---
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Add fade-in animation to sections and cards
  const animateElements = document.querySelectorAll(
    '.section, .service-card, .policy-card, .gallery-item, .contact-cta-card'
  );

  animateElements.forEach(el => {
    el.classList.add('animate-on-scroll');
    observer.observe(el);
  });

  // Inject animation styles
  const animStyle = document.createElement('style');
  animStyle.textContent = `
    .animate-on-scroll {
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.6s ease, transform 0.6s ease;
    }
    .animate-on-scroll.visible {
      opacity: 1;
      transform: translateY(0);
    }
    .service-card.animate-on-scroll,
    .policy-card.animate-on-scroll,
    .gallery-item.animate-on-scroll,
    .contact-cta-card.animate-on-scroll {
      transition-delay: calc(var(--stagger, 0) * 80ms);
    }
  `;
  document.head.appendChild(animStyle);

  // Add stagger delay to grid items
  document.querySelectorAll('.service-grid, .policies-grid, .gallery-grid').forEach(grid => {
    grid.querySelectorAll('.animate-on-scroll').forEach((item, index) => {
      item.style.setProperty('--stagger', index);
    });
  });

});


/* ============================================
   Instagram Feed Integration (for future use)

   To enable:
   1. Add id="instagramFeed" to the gallery grid in index.html
   2. Set INSTAGRAM_TOKEN below with a valid token
   3. Uncomment loadInstagramFeed() in the DOMContentLoaded handler

   HOW TO GET A TOKEN:
   Create a Meta developer app → add Instagram Graph API →
   generate a long-lived token (lasts 60 days).
   ============================================ */

// const INSTAGRAM_TOKEN = '';
//
// function loadInstagramFeed() {
//   const feedContainer = document.getElementById('instagramFeed');
//   if (!feedContainer || !INSTAGRAM_TOKEN) return;
//
//   const apiUrl = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&access_token=${INSTAGRAM_TOKEN}&limit=6`;
//
//   fetch(apiUrl)
//     .then(r => { if (!r.ok) throw new Error('API error'); return r.json(); })
//     .then(data => {
//       const posts = (data.data || [])
//         .filter(p => ['IMAGE','CAROUSEL_ALBUM','VIDEO'].includes(p.media_type))
//         .slice(0, 6);
//       if (!posts.length) return;
//       feedContainer.innerHTML = '';
//       posts.forEach((post, i) => {
//         const img = post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url;
//         const cap = post.caption ? post.caption.substring(0, 100) : '';
//         const item = document.createElement('div');
//         item.className = 'gallery-item';
//         item.style.setProperty('--stagger', i);
//         item.innerHTML = `<a href="${post.permalink}" target="_blank" rel="noopener"><img src="${img}" alt="${cap || 'Hair by SlayedbySarah'}" loading="lazy"></a>`;
//         feedContainer.appendChild(item);
//       });
//     })
//     .catch(() => {});
// }
