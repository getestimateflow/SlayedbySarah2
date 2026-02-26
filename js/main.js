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
          // slayedbysarah/slug → slayedbysarah/boston-slug
          newLink = link.replace('slayedbysarah/', 'slayedbysarah/boston-');
        } else {
          // slayedbysarah/boston-slug → slayedbysarah/slug
          newLink = link.replace('slayedbysarah/boston-', 'slayedbysarah/');
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
          bookBtn.dataset.cal = cal.replace('slayedbysarah/', 'slayedbysarah/boston-');
        } else {
          bookBtn.dataset.cal = cal.replace('slayedbysarah/boston-', 'slayedbysarah/');
        }
      });
    });
  });


  // --- Service Card Expansion & Cal.com Embed ---
  const bookButtons = document.querySelectorAll('.btn-book');

  bookButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const card = button.closest('.service-card');
      const wasActive = card.classList.contains('active');

      // Close all other open cards in this category
      const parentCategory = card.closest('.service-category');
      parentCategory.querySelectorAll('.service-card.active').forEach(openCard => {
        if (openCard !== card) {
          openCard.classList.remove('active');
        }
      });

      // Toggle this card
      card.classList.toggle('active');

      // If we just opened the card, load the Cal.com embed and scroll to it
      if (!wasActive) {
        loadCalEmbed(card);

        // Wait for closing card's max-height transition to settle before scrolling
        setTimeout(() => {
          const headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height'));
          const cardTop = card.getBoundingClientRect().top + window.scrollY - headerHeight - 20;
          window.scrollTo({ top: cardTop, behavior: 'smooth' });
        }, 350);
      }
    });
  });


  /**
   * Load Cal.com inline embed into a service card
   * Replace the placeholder with an actual Cal.com embed
   */
  function loadCalEmbed(card) {
    const embedContainer = card.querySelector('.cal-embed');
    if (!embedContainer || embedContainer.dataset.loaded === 'true') return;

    const calLink = embedContainer.dataset.calLink;
    if (!calLink) return;

    // Mark as loaded so we don't reload
    embedContainer.dataset.loaded = 'true';

    // Clear placeholder
    embedContainer.innerHTML = '';

    // Create iframe embed for Cal.com
    // When Cal.com is set up, these links will be like: https://cal.com/slayedbysarah/service-name
    const iframe = document.createElement('iframe');
    iframe.src = `https://cal.com/${calLink}?embed=true&layout=month_view&theme=light`;
    iframe.title = 'Book Appointment';
    iframe.style.width = '100%';
    iframe.style.minHeight = '600px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '10px';
    iframe.loading = 'lazy';
    iframe.allow = 'payment';

    // Show a loading state while iframe loads
    const loader = document.createElement('div');
    loader.className = 'cal-loading';
    loader.innerHTML = `
      <div class="cal-loading-spinner"></div>
      <p>Loading booking calendar...</p>
    `;
    embedContainer.appendChild(loader);
    embedContainer.appendChild(iframe);

    // Remove loader when iframe is ready
    iframe.addEventListener('load', () => {
      if (loader.parentNode) {
        loader.remove();
      }
    });

    // Add loading spinner styles if not already present
    if (!document.getElementById('cal-loading-styles')) {
      const style = document.createElement('style');
      style.id = 'cal-loading-styles';
      style.textContent = `
        .cal-loading {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: var(--color-bg-warm);
          z-index: 1;
        }
        .cal-loading p {
          font-size: 0.85rem;
          color: var(--color-text-muted);
          font-weight: 500;
        }
        .cal-loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--color-border);
          border-top-color: var(--color-primary);
          border-radius: 50%;
          animation: calSpin 0.8s linear infinite;
        }
        @keyframes calSpin {
          to { transform: rotate(360deg); }
        }
        .cal-embed {
          position: relative;
        }
      `;
      document.head.appendChild(style);
    }
  }


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
