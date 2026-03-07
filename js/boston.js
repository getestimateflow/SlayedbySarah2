/* ============================================
   SlayedbySarah — Boston Landing Page JS
   2-step booking flow, showcase video,
   sticky CTA, scroll animations
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ── Sticky Bottom CTA ──
  const stickyCta = document.getElementById('stickyCta');
  const heroCta = document.getElementById('heroCta');

  if (stickyCta && heroCta) {
    document.body.classList.add('has-sticky-cta');
    const stickyObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        stickyCta.classList.toggle('visible', !entry.isIntersecting);
      });
    }, { threshold: 0, rootMargin: '-10px 0px 0px 0px' });
    stickyObserver.observe(heroCta);
  }


  // ── Showcase Video Unmute Toggle ──
  const showcaseVideo = document.querySelector('.boston-showcase-video video');
  const unmuteHint = document.getElementById('unmuteHint');

  if (showcaseVideo && unmuteHint) {
    unmuteHint.addEventListener('click', () => {
      if (showcaseVideo.muted) {
        showcaseVideo.muted = false;
        unmuteHint.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
          Tap to mute`;
      } else {
        showcaseVideo.muted = true;
        unmuteHint.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
          Tap to unmute`;
      }
    });
  }


  // ── Smooth Scroll ──
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });


  // ══════════════════════════════════════════
  //  BOOKING FLOW (2 steps)
  // ══════════════════════════════════════════

  // --- Config ---
  const API_BOOKING = 'https://getestimateflow--estimateflow-webhooks-sbs-booking.modal.run';
  const TEST_MODE = new URLSearchParams(window.location.search).get('test') === 'true';

  // --- Data ---
  const PACKAGES = [
    { length: '16"', price: 497 },
    { length: '18"', price: 697 },
    { length: '20"', price: 727 },
    { length: '22"', price: 757 },
    { length: '24"', price: 787 },
    { length: '26"', price: 997 },
  ];

  const DATES = [
    { date: '2026-03-23', label: 'Mar 23', day: 'Mon' },
    { date: '2026-03-24', label: 'Mar 24', day: 'Tue' },
    { date: '2026-03-25', label: 'Mar 25', day: 'Wed' },
    { date: '2026-03-26', label: 'Mar 26', day: 'Thu' },
    { date: '2026-03-27', label: 'Mar 27', day: 'Fri' },
    { date: '2026-03-28', label: 'Mar 28', day: 'Sat' },
  ];

  const TIME_SLOTS = [
    { display: '9:00 AM',  hour24: '09:00' },
    { display: '12:30 PM', hour24: '12:30' },
    { display: '3:30 PM',  hour24: '15:30' },
    { display: '6:30 PM',  hour24: '18:30' },
  ];

  // Live booked slots — populated from API, falls back to empty (all open)
  let bookedSlots = {
    '2026-03-23': [],
    '2026-03-24': [],
    '2026-03-25': [],
    '2026-03-26': [],
    '2026-03-27': [],
    '2026-03-28': [],
  };

  // Booking state
  const booking = {
    date: null,
    dateLabel: null,
    time: null,
    timeDisplay: null,
    hairLength: null,
    hairPrice: null,
  };

  let currentStep = 1;
  let selectedDateEl = null;
  let availabilityLoaded = false;

  // --- DOM refs ---
  const calModal = document.getElementById('calModal');
  const calClose = document.getElementById('calModalClose');
  const progressDots = document.querySelectorAll('.booking-progress-dot');
  const progressLine = document.querySelector('.booking-progress-line');
  const step1 = document.getElementById('bookingStep1');
  const step2 = document.getElementById('bookingStep2');
  const dateGrid = document.getElementById('dateGrid');
  const timeGrid = document.getElementById('timeGrid');
  const timeSection = document.getElementById('timeSection');


  // --- Availability API ---
  async function fetchAvailability() {
    try {
      const resp = await fetch(API_BOOKING, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_availability' }),
      });
      const data = await resp.json();
      if (data.success && data.booked_slots) {
        bookedSlots = data.booked_slots;
        availabilityLoaded = true;
      }
    } catch (err) {
      console.warn('Could not fetch availability, showing all slots as open:', err);
    }
    // Re-render date grid with real data
    renderDateGrid();
  }


  // --- Modal open / close ---
  function openBookingModal() {
    if (!calModal) return;
    calModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    resetBooking();
    // Fetch live availability every time modal opens
    fetchAvailability();
  }

  function closeBookingModal() {
    if (!calModal) return;
    calModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  function resetBooking() {
    booking.date = null;
    booking.dateLabel = null;
    booking.time = null;
    booking.timeDisplay = null;
    booking.hairLength = null;
    booking.hairPrice = null;
    selectedDateEl = null;
    goToStep(1);
    renderDateGrid();
    if (timeSection) timeSection.classList.remove('visible');
    if (timeGrid) timeGrid.innerHTML = '';
    // Reset hair length select
    const sel = document.getElementById('hairLengthSelect');
    if (sel) sel.selectedIndex = 0;
    // Reset form
    const form = document.getElementById('bookingForm');
    if (form) form.reset();
  }

  // Close triggers
  if (calClose) calClose.addEventListener('click', closeBookingModal);
  if (calModal) calModal.addEventListener('click', (e) => {
    if (e.target === calModal) closeBookingModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeBookingModal();
  });

  // Wire all CTA buttons
  document.querySelectorAll('.cal-popup-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openBookingModal();
    });
  });

  // --- Step navigation ---
  function goToStep(step) {
    currentStep = step;

    // Progress dots
    progressDots.forEach(dot => {
      const s = parseInt(dot.dataset.step);
      dot.classList.toggle('active', s === step);
      dot.classList.toggle('completed', s < step);
    });
    if (progressLine) progressLine.classList.toggle('completed', step > 1);

    // Panels
    step1.classList.remove('active', 'exit-left');
    step2.classList.remove('active', 'exit-left');

    if (step === 1) {
      step1.classList.add('active');
    } else {
      step1.classList.add('exit-left');
      step2.classList.add('active');
    }
  }

  // Back button
  document.getElementById('backToStep1')?.addEventListener('click', () => goToStep(1));


  // ── Step 1: Date + Time ──
  function renderDateGrid() {
    if (!dateGrid) return;
    dateGrid.innerHTML = '';

    DATES.forEach(d => {
      const booked = bookedSlots[d.date] || [];
      const available = TIME_SLOTS.length - booked.length;
      const fullyBooked = available <= 0;

      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'date-chip' + (fullyBooked ? ' disabled' : '');

      card.innerHTML = `
        <span class="date-chip-day">${d.day}</span>
        <span class="date-chip-date">${d.label}</span>
        <span class="date-chip-slots">${fullyBooked ? 'Full' : available + ' left'}</span>`;

      if (!fullyBooked) {
        card.addEventListener('click', () => {
          // Update selected state
          if (selectedDateEl) selectedDateEl.classList.remove('selected');
          card.classList.add('selected');
          selectedDateEl = card;

          booking.date = d.date;
          booking.dateLabel = d.day + ', ' + d.label;
          booking.time = null;
          booking.timeDisplay = null;
          renderTimeGrid();
        });
      }
      dateGrid.appendChild(card);
    });
  }

  function renderTimeGrid() {
    if (!timeGrid || !timeSection) return;
    timeGrid.innerHTML = '';
    timeSection.classList.add('visible');

    const booked = bookedSlots[booking.date] || [];

    TIME_SLOTS.forEach(slot => {
      const isBooked = booked.includes(slot.hour24);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'time-chip' + (isBooked ? ' disabled' : '');

      card.innerHTML = `
        <span class="time-chip-time">${slot.display}</span>
        <span class="time-chip-status">${isBooked ? 'Booked' : 'Open'}</span>`;

      if (!isBooked) {
        card.addEventListener('click', () => {
          booking.time = slot.hour24;
          booking.timeDisplay = slot.display;
          renderStep2Summary();
          goToStep(2);
        });
      }
      timeGrid.appendChild(card);
    });
  }


  // ── Step 2: Details + Hair Length + Pay ──
  function renderStep2Summary() {
    const el = document.getElementById('step2Summary');
    if (!el) return;
    el.innerHTML = `
      <span class="booking-summary-tag">${booking.dateLabel}</span>
      <span class="booking-summary-tag">${booking.timeDisplay} ET</span>`;
  }

  // Hair length select
  const hairSelect = document.getElementById('hairLengthSelect');
  if (hairSelect) {
    PACKAGES.forEach(pkg => {
      const opt = document.createElement('option');
      opt.value = pkg.length;
      opt.dataset.price = pkg.price;
      opt.textContent = `${pkg.length} — $${pkg.price}`;
      hairSelect.appendChild(opt);
    });
    hairSelect.addEventListener('change', () => {
      const opt = hairSelect.options[hairSelect.selectedIndex];
      if (opt.value) {
        booking.hairLength = opt.value;
        booking.hairPrice = parseInt(opt.dataset.price);
      } else {
        booking.hairLength = null;
        booking.hairPrice = null;
      }
    });
  }

  // Form submit → Stripe Checkout
  const bookingForm = document.getElementById('bookingForm');
  const payBtn = document.querySelector('.booking-pay-btn');
  if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Validate hair length
      if (!booking.hairLength) {
        hairSelect.focus();
        hairSelect.style.borderColor = '#d9381e';
        setTimeout(() => { hairSelect.style.borderColor = ''; }, 2000);
        return;
      }

      const formData = new FormData(bookingForm);
      const payload = {
        date: booking.date,
        time: booking.time,
        hair_length: booking.hairLength,
        hair_price: booking.hairPrice,
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        notes: formData.get('notes') || '',
      };

      // Disable button while loading
      if (payBtn) {
        payBtn.disabled = true;
        payBtn.textContent = 'Processing...';
      }

      try {
        const resp = await fetch(API_BOOKING, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create_checkout', test_mode: TEST_MODE, ...payload }),
        });
        const data = await resp.json();

        if (data.success && data.checkout_url) {
          // Redirect to Stripe Checkout
          window.location.href = data.checkout_url;
        } else {
          alert('Something went wrong. Please try again.');
          console.error('Checkout error:', data);
        }
      } catch (err) {
        alert('Could not connect to payment server. Please try again.');
        console.error('Checkout fetch error:', err);
      } finally {
        if (payBtn) {
          payBtn.disabled = false;
          payBtn.textContent = 'Pay $50 Deposit';
        }
      }
    });
  }

  // Handle ?cancelled=true from Stripe cancel redirect
  if (new URLSearchParams(window.location.search).get('cancelled') === 'true') {
    // Clean the URL
    history.replaceState({}, '', window.location.pathname);
    // Show a brief dismissible notice
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:20000;background:#FFF0EB;color:#2D2226;text-align:center;padding:12px 16px;font-size:0.85rem;font-family:var(--font-body);border-bottom:1px solid #F0E0DB;';
    banner.innerHTML = 'Payment was cancelled. <strong style="cursor:pointer;margin-left:8px;color:#B76E79;">Book again</strong> or <span style="cursor:pointer;margin-left:4px;text-decoration:underline;">dismiss</span>';
    banner.querySelector('strong').addEventListener('click', () => { banner.remove(); openBookingModal(); });
    banner.querySelector('span').addEventListener('click', () => banner.remove());
    document.body.prepend(banner);
  }


  // ── Fade-in Animations ──
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

  const style = document.createElement('style');
  style.textContent = '.visible { opacity: 1 !important; transform: translateY(0) !important; }';
  document.head.appendChild(style);

  // Show test mode banner if active
  if (TEST_MODE) {
    const testBanner = document.createElement('div');
    testBanner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#fff3cd;color:#856404;text-align:center;padding:8px;font-size:0.85rem;font-weight:600;font-family:sans-serif;border-bottom:2px solid #ffc107;';
    testBanner.textContent = 'STRIPE TEST MODE — Use card 4242 4242 4242 4242';
    document.body.prepend(testBanner);
  }

});
