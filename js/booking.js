/* ============================================
   SlayedbySarah — Booking Module
   Reusable booking flow for all services.
   Renders a modal with date/time picker,
   client info form, and Stripe checkout.

   Usage:
     SBSBooking.open({
       slug: '16-luxury-install',
       serviceName: '16" Luxury Install Package',
       servicePrice: 497,
       location: 'houston',
     });
   ============================================ */

const SBSBooking = (() => {
  'use strict';

  const API = 'https://getestimateflow--estimateflow-webhooks-sbs-booking.modal.run';

  const TIME_SLOTS = [
    { display: '9:00 AM',  hour24: '09:00' },
    { display: '12:30 PM', hour24: '12:30' },
    { display: '3:30 PM',  hour24: '15:30' },
    { display: '6:30 PM',  hour24: '18:30' },
  ];

  /* ── Slug → Cal.com event type ID mapping ── */
  const EVENT_TYPES = {
    // Houston
    '16-luxury-install': 4914253,
    '18-luxury-install': 4914254,
    '20-luxury-install': 4914255,
    '22-luxury-install': 4914260,
    '24-luxury-install': 4914261,
    '26-luxury-install': 4914262,
    'double-weft': 4914242,
    'double-weft-refresh': 4914246,
    'frontal-closure-maintenance': 4914250,
    'itips-all-around-maintenance': 4914244,
    'itips-full-install-new': 4914240,
    'itips-full-install-returning': 4914241,
    'itips-perimeter-maintenance': 4914245,
    'itips-take-down': 4914247,
    'keratin-tape-ins': 4914243,
    'lace-closure-sew-in': 4914238,
    'lace-closure-sew-in-other-hair': 4914236,
    'lace-wig-class': 4914252,
    'lace-wig-install': 4914237,
    'package-maintenance': 4914249,
    'ponytail-install': 4914239,
    'quick-weave': 4914233,
    'sew-in-maintenance': 4914248,
    'sew-in-minimal-leave-out': 4914234,
    'sew-in-other-hair': 4914235,
    'take-down': 4914251,
    // Boston
    'boston-16-luxury-install': 4917043,
    'boston-18-luxury-install': 4917042,
    'boston-20-luxury-install': 4917040,
    'boston-22-luxury-install': 4917041,
    'boston-24-luxury-install': 4917058,
    'boston-26-luxury-install': 4917059,
    'boston-double-weft': 4917052,
    'boston-double-weft-refresh': 4917055,
    'boston-frontal-closure-maintenance': 4917047,
    'boston-itips-all-around-maintenance': 4917050,
    'boston-itips-full-install-new': 4917045,
    'boston-itips-full-install-returning': 4917051,
    'boston-itips-perimeter-maintenance': 4917035,
    'boston-itips-take-down': 4917057,
    'boston-keratin-tape-ins': 4917039,
    'boston-lace-closure-sew-in': 4917044,
    'boston-lace-closure-sew-in-other-hair': 4917053,
    'boston-lace-wig-class': 4917046,
    'boston-lace-wig-install': 4917056,
    'boston-package-maintenance': 4917036,
    'boston-ponytail-install': 4917034,
    'boston-quick-weave': 4917054,
    'boston-sew-in': 4914231,
    'boston-sew-in-maintenance': 4917049,
    'boston-sew-in-minimal-leave-out': 4917037,
    'boston-sew-in-other-hair': 4917048,
    'boston-take-down': 4917038,
  };

  const LOCATIONS = {
    houston: { tzLabel: 'CT', tzOffset: 5 },
    boston:   { tzLabel: 'ET', tzOffset: 4,
      fixedDates: [
        { date: '2026-03-23', label: 'Mar 23', day: 'Mon' },
        { date: '2026-03-24', label: 'Mar 24', day: 'Tue' },
        { date: '2026-03-25', label: 'Mar 25', day: 'Wed' },
        { date: '2026-03-26', label: 'Mar 26', day: 'Thu' },
        { date: '2026-03-27', label: 'Mar 27', day: 'Fri' },
        { date: '2026-03-28', label: 'Mar 28', day: 'Sat' },
      ],
    },
  };

  const MONTH_NAMES = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];

  let modal = null;
  let cssInjected = false;
  let state = {};
  let bookedSlots = {};
  let dates = [];
  let availableDateSet = new Set();

  /* ── Date generation ── */
  function generateDates(location) {
    const loc = LOCATIONS[location];
    if (loc && loc.fixedDates) return loc.fixedDates;

    // Houston: next 20 weekdays (Mon-Fri, matching Cal.com schedule)
    const result = [];
    const d = new Date();
    d.setDate(d.getDate() + 1); // Start from tomorrow
    while (result.length < 20) {
      const day = d.getDay();
      if (day >= 1 && day <= 5) {
        result.push({
          date: d.toISOString().split('T')[0],
          label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        });
      }
      d.setDate(d.getDate() + 1);
    }
    return result;
  }

  /* ── CSS injection ── */
  function injectCSS() {
    if (cssInjected) return;
    cssInjected = true;
    const style = document.createElement('style');
    style.id = 'sbs-booking-styles';
    style.textContent = `
      /* ── Booking modal overlay ── */
      .sbs-booking-overlay {
        position: fixed; inset: 0; z-index: 10000;
        background: rgba(0,0,0,0.55);
        display: flex; align-items: flex-end; justify-content: center;
        opacity: 0; pointer-events: none;
        transition: opacity 0.3s ease;
      }
      .sbs-booking-overlay.active { opacity: 1; pointer-events: auto; }

      .sbs-booking-modal {
        position: relative;
        width: 100%; min-height: 85vh; max-height: 92vh;
        background: #fff; border-radius: 20px 20px 0 0;
        overflow: hidden;
        box-shadow: 0 -4px 40px rgba(0,0,0,0.2);
        transform: translateY(100%);
        transition: transform 0.35s cubic-bezier(0.32,0.72,0,1);
      }
      .sbs-booking-overlay.active .sbs-booking-modal { transform: translateY(0); }

      .sbs-booking-close {
        position: absolute; top: 8px; right: 12px; z-index: 10;
        background: rgba(255,255,255,0.9); border: 1px solid #F0E0DB;
        border-radius: 50%; width: 36px; height: 36px;
        font-size: 1.3rem; color: #2D2226; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: background 0.2s;
      }
      .sbs-booking-close:hover { background: #FFF8F5; }

      @media (min-width: 769px) {
        .sbs-booking-overlay { align-items: center; padding: 24px; }
        .sbs-booking-modal {
          max-width: 620px; min-height: 620px; max-height: 88vh;
          border-radius: 16px;
          transform: translateY(20px) scale(0.97);
          transition: transform 0.3s ease;
        }
        .sbs-booking-overlay.active .sbs-booking-modal {
          transform: translateY(0) scale(1);
        }
      }

      /* ── Progress dots ── */
      .sbs-progress { display:flex; align-items:center; justify-content:center; gap:8px; padding:16px 24px 0; }
      .sbs-dot { width:10px; height:10px; border-radius:50%; background:#F0E0DB; transition:all 0.3s; }
      .sbs-dot.active { background:#C48B7C; transform:scale(1.2); }
      .sbs-dot.completed { background:#7BA68A; }
      .sbs-line { width:32px; height:2px; background:#F0E0DB; transition:background 0.3s; }
      .sbs-line.completed { background:#7BA68A; }

      /* ── Step panels ── */
      .sbs-step {
        position:absolute; inset:0; top:44px; background:#fff;
        display:flex; flex-direction:column;
        padding: 24px 24px 32px; overflow-y:auto; overflow-x:hidden;
        box-sizing:border-box;
        opacity:0; pointer-events:none; transform:translateX(30px);
        transition: opacity 0.3s ease, transform 0.3s ease;
      }
      .sbs-step.active { opacity:1; transform:translateX(0); }
      .sbs-booking-overlay.active .sbs-step.active { pointer-events:auto; }
      .sbs-step.exit-left { transform:translateX(-30px); }

      .sbs-step-title {
        font-family: 'Playfair Display', Georgia, serif;
        font-size:1.35rem; font-weight:600; color:#2D2226;
        text-align:center; margin-bottom:2px;
      }
      .sbs-step-subtitle {
        font-size:0.85rem; color:#9B8A8E; text-align:center; margin-bottom:16px;
      }

      /* ── Back button ── */
      .sbs-back {
        display:inline-flex; align-items:center; gap:4px;
        font-size:0.85rem; font-weight:500; color:#9B8A8E;
        background:none; border:none; cursor:pointer; padding:0; margin-bottom:8px;
        font-family: 'Montserrat', sans-serif;
      }
      .sbs-back:hover { color:#2D2226; }

      /* ── Section label ── */
      .sbs-label {
        font-size:0.75rem; font-weight:600; letter-spacing:0.1em;
        text-transform:uppercase; color:#C48B7C; margin-bottom:10px;
        font-family: 'Montserrat', sans-serif;
      }

      /* ── Calendar ── */
      .sbs-cal-header {
        display:flex; align-items:center; justify-content:space-between;
        margin-bottom:14px;
      }
      .sbs-cal-title {
        font-family:'Playfair Display',Georgia,serif;
        font-size:1.2rem; font-weight:600; color:#2D2226;
      }
      .sbs-cal-nav {
        background:none; border:1.5px solid #F0E0DB;
        border-radius:50%; width:34px; height:34px;
        cursor:pointer; display:flex; align-items:center; justify-content:center;
        color:#6B5A5E; transition:all 0.2s;
        font-family:'Montserrat',sans-serif; font-size:1.1rem;
      }
      .sbs-cal-nav:hover { background:#FFF8F5; border-color:#C48B7C; }
      .sbs-cal-nav:disabled { opacity:0.25; cursor:not-allowed; background:none; }
      .sbs-cal-weekdays {
        display:grid; grid-template-columns:repeat(7,1fr);
        text-align:center; margin-bottom:6px;
      }
      .sbs-cal-weekday {
        font-size:0.72rem; font-weight:600; color:#9B8A8E;
        padding:4px 0; text-transform:uppercase; letter-spacing:0.05em;
        font-family:'Montserrat',sans-serif;
      }
      .sbs-cal-days {
        display:grid; grid-template-columns:repeat(7,1fr); gap:3px;
      }
      .sbs-cal-day {
        aspect-ratio:1; display:flex; align-items:center; justify-content:center;
        border-radius:50%; font-size:0.92rem; font-weight:500;
        color:#D4C8CB; cursor:default; position:relative;
        border:none; background:none;
        font-family:'Montserrat',sans-serif;
        transition:all 0.15s;
      }
      .sbs-cal-day.empty { visibility:hidden; }
      .sbs-cal-day.available { color:#2D2226; font-weight:600; cursor:pointer; }
      .sbs-cal-day.available:hover { background:#FFF0EB; }
      .sbs-cal-day.available.selected { background:#C48B7C; color:#fff; }
      .sbs-cal-day.full { color:#D4C8CB; text-decoration:line-through; }
      .sbs-cal-day.today { box-shadow:inset 0 0 0 1.5px #E0C5BF; }
      .sbs-cal-day.available::after {
        content:''; position:absolute; bottom:2px;
        width:4px; height:4px; border-radius:50%; background:#7BA68A;
      }
      .sbs-cal-day.available.selected::after { background:rgba(255,255,255,0.7); }
      .sbs-cal-day.full::after { display:none; }

      /* ── Calendar hide/show transitions ── */
      .sbs-calendar {
        transition: opacity 0.35s ease, transform 0.35s ease;
      }
      .sbs-calendar.hidden {
        opacity:0; transform:scale(0.96); pointer-events:none;
        position:absolute; width:1px; height:1px; overflow:hidden;
      }

      /* ── Selected-date display ── */
      .sbs-date-display {
        display:none; text-align:center; margin-bottom:18px;
        opacity:0; transform:translateY(-6px);
        transition: opacity 0.35s ease, transform 0.35s ease;
      }
      .sbs-date-display.visible { display:block; opacity:1; transform:translateY(0); }
      .sbs-date-chosen {
        font-family:'Playfair Display',Georgia,serif;
        font-size:1.3rem; font-weight:600; color:#2D2226; margin-bottom:4px;
      }
      .sbs-date-change {
        font-family:'Montserrat',sans-serif; font-size:0.8rem;
        font-weight:500; color:#C48B7C; background:none; border:none;
        cursor:pointer; text-decoration:underline; text-underline-offset:2px;
        transition:color 0.2s;
      }
      .sbs-date-change:hover { color:#8B5E54; }

      /* ── Time section ── */
      .sbs-time-section {
        margin-top:8px; opacity:0; transform:translateY(8px);
        transition: opacity 0.35s ease 0.1s, transform 0.35s ease 0.1s; pointer-events:none;
      }
      .sbs-time-section.visible { opacity:1; transform:translateY(0); pointer-events:auto; }
      .sbs-time-grid { display:flex; flex-direction:column; gap:10px; }
      .sbs-time-chip {
        display:flex; align-items:center; justify-content:space-between;
        padding:20px 22px; background:#fff; border:1.5px solid #F0E0DB;
        border-radius:12px; cursor:pointer; transition:all 0.2s;
        font-family: 'Montserrat', sans-serif;
      }
      .sbs-time-chip:hover:not(.disabled) { border-color:#C48B7C; background:#FFF8F5; }
      .sbs-time-chip.disabled { opacity:0.4; cursor:not-allowed; }
      .sbs-time-text { font-size:1rem; font-weight:600; color:#2D2226; }
      .sbs-time-status { font-size:0.73rem; font-weight:600; color:#7BA68A; }
      .sbs-time-chip.disabled .sbs-time-status { color:#9B8A8E; }

      /* ── Step 2: summary + form ── */
      .sbs-summary { display:flex; flex-wrap:wrap; gap:6px; justify-content:center; margin-bottom:16px; }
      .sbs-tag {
        font-size:0.75rem; font-weight:600; padding:5px 12px;
        border-radius:999px; background:#FFF0EB; color:#8B5E54;
        font-family: 'Montserrat', sans-serif;
      }
      .sbs-form { width:100%; display:flex; flex-direction:column; gap:10px; }
      .sbs-form label {
        display:flex; flex-direction:column; gap:3px;
        font-size:0.8rem; font-weight:600; color:#6B5A5E; letter-spacing:0.02em;
        font-family: 'Montserrat', sans-serif;
      }
      .sbs-form input, .sbs-form textarea {
        font-family:'Montserrat',sans-serif; font-size:0.95rem;
        padding:11px 14px; border:1.5px solid #F0E0DB; border-radius:10px;
        background:#fff; color:#2D2226; outline:none;
        -webkit-appearance:none; box-sizing:border-box; width:100%;
        transition:border-color 0.2s;
      }
      .sbs-form input:focus, .sbs-form textarea:focus { border-color:#C48B7C; }
      .sbs-form input::placeholder, .sbs-form textarea::placeholder { color:#C9BFC1; }
      .sbs-form textarea { resize:none; min-height:56px; }
      .sbs-form-row { display:flex; flex-direction:column; gap:10px; }

      .sbs-pay-btn {
        display:flex; align-items:center; justify-content:center;
        width:100%; padding:14px; margin-top:4px;
        font-family:'Montserrat',sans-serif; font-size:1rem; font-weight:600;
        letter-spacing:0.02em; color:#fff;
        background:linear-gradient(135deg,#C48B7C,#B76E79);
        border:none; border-radius:999px; cursor:pointer;
        box-shadow:0 4px 15px rgba(183,110,121,0.3);
        transition:all 0.25s;
      }
      .sbs-pay-btn:hover { transform:translateY(-2px); box-shadow:0 6px 25px rgba(183,110,121,0.4); }
      .sbs-deposit-note { font-size:0.73rem; color:#9B8A8E; text-align:center; margin-top:4px; font-family:'Montserrat',sans-serif; }
    `;
    document.head.appendChild(style);
  }

  /* ── Create modal DOM ── */
  function ensureModal() {
    if (modal) return;
    injectCSS();

    modal = document.createElement('div');
    modal.className = 'sbs-booking-overlay';
    modal.innerHTML = `
      <div class="sbs-booking-modal">
        <button class="sbs-booking-close" aria-label="Close booking">&times;</button>
        <div class="sbs-progress">
          <div class="sbs-dot active" data-step="1"></div>
          <div class="sbs-line"></div>
          <div class="sbs-dot" data-step="2"></div>
        </div>
        <div class="sbs-step active" id="sbsStep1">
          <h3 class="sbs-step-title">When Works for You?</h3>
          <p class="sbs-step-subtitle" id="sbsSubtitle"></p>
          <div class="sbs-calendar">
            <div class="sbs-cal-header">
              <button type="button" class="sbs-cal-nav" id="sbsCalPrev" aria-label="Previous month">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span class="sbs-cal-title" id="sbsCalTitle"></span>
              <button type="button" class="sbs-cal-nav" id="sbsCalNext" aria-label="Next month">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
            <div class="sbs-cal-weekdays">
              <span class="sbs-cal-weekday">Su</span><span class="sbs-cal-weekday">Mo</span><span class="sbs-cal-weekday">Tu</span><span class="sbs-cal-weekday">We</span><span class="sbs-cal-weekday">Th</span><span class="sbs-cal-weekday">Fr</span><span class="sbs-cal-weekday">Sa</span>
            </div>
            <div class="sbs-cal-days" id="sbsCalDays"></div>
          </div>
          <div class="sbs-date-display" id="sbsDateDisplay">
            <div class="sbs-date-chosen" id="sbsDateChosen"></div>
            <button type="button" class="sbs-date-change" id="sbsDateChange">View more dates</button>
          </div>
          <div class="sbs-time-section" id="sbsTimeSection">
            <p class="sbs-label">Pick a time</p>
            <div class="sbs-time-grid" id="sbsTimeGrid"></div>
          </div>
        </div>
        <div class="sbs-step" id="sbsStep2">
          <button class="sbs-back" id="sbsBackBtn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          <h3 class="sbs-step-title">Complete Your Booking</h3>
          <div class="sbs-summary" id="sbsSummary"></div>
          <form class="sbs-form" id="sbsForm" autocomplete="on">
            <div class="sbs-form-row">
              <label>Name<input type="text" name="name" placeholder="Full name" required autocomplete="name"></label>
              <label>Phone<input type="tel" name="phone" placeholder="(555) 123-4567" required autocomplete="tel"></label>
            </div>
            <label>Email<input type="email" name="email" placeholder="you@email.com" required autocomplete="email"></label>
            <label>Notes <span style="font-weight:400;color:#C9BFC1">(optional)</span>
              <textarea name="notes" placeholder="Special requests?"></textarea>
            </label>
            <button type="submit" class="sbs-pay-btn">Pay $50 Deposit</button>
            <p class="sbs-deposit-note">Remaining balance paid at your appointment</p>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Close triggers
    modal.querySelector('.sbs-booking-close').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

    // Calendar navigation
    modal.querySelector('#sbsCalPrev').addEventListener('click', () => navigateMonth(-1));
    modal.querySelector('#sbsCalNext').addEventListener('click', () => navigateMonth(1));

    // "View more dates" — bring calendar back
    modal.querySelector('#sbsDateChange').addEventListener('click', () => showCalendar());

    // Back button
    modal.querySelector('#sbsBackBtn').addEventListener('click', () => goToStep(1));

    // Form submit
    modal.querySelector('#sbsForm').addEventListener('submit', handleSubmit);
  }


  /* ── Public: open ── */
  function open(config) {
    ensureModal();

    const slug = config.slug || '';
    const loc = LOCATIONS[config.location] || LOCATIONS.houston;

    state = {
      slug,
      eventTypeId: EVENT_TYPES[slug] || 0,
      serviceName: config.serviceName || '',
      servicePrice: config.servicePrice || 0,
      location: config.location || 'houston',
      calMonth: null,
      calYear: null,
      date: null,
      dateLabel: null,
      time: null,
      timeDisplay: null,
    };

    dates = generateDates(state.location);
    availableDateSet = new Set(dates.map(d => d.date));
    bookedSlots = {};

    // Set initial calendar month from first available date
    if (dates.length) {
      const first = new Date(dates[0].date + 'T12:00:00');
      state.calMonth = first.getMonth();
      state.calYear = first.getFullYear();
    } else {
      const now = new Date();
      state.calMonth = now.getMonth();
      state.calYear = now.getFullYear();
    }

    // Update subtitle
    modal.querySelector('#sbsSubtitle').textContent =
      state.serviceName + ' \u00B7 ' + loc.tzLabel;

    // Reset UI
    goToStep(1);
    modal.querySelector('.sbs-calendar').classList.remove('hidden');
    modal.querySelector('#sbsDateDisplay').classList.remove('visible');
    modal.querySelector('#sbsTimeSection').classList.remove('visible');
    modal.querySelector('#sbsTimeGrid').innerHTML = '';
    modal.querySelector('#sbsForm').reset();
    renderCalendar();

    // Show
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Fetch live availability
    fetchAvailability();
  }

  /* ── Public: close ── */
  function close() {
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }


  /* ── Fetch availability from API ── */
  async function fetchAvailability() {
    if (!dates.length || !state.eventTypeId) return;

    const loc = LOCATIONS[state.location] || LOCATIONS.houston;
    const dateStart = dates[0].date;
    const dateEnd = dates[dates.length - 1].date;

    try {
      const resp = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_availability',
          event_type_id: state.eventTypeId,
          date_start: dateStart,
          date_end: dateEnd,
          tz_offset: loc.tzOffset,
        }),
      });
      const data = await resp.json();
      if (data.success && data.booked_slots) {
        bookedSlots = data.booked_slots;
      }
    } catch (err) {
      console.warn('Could not fetch availability:', err);
    }
    renderCalendar();
  }


  /* ── Step navigation ── */
  function goToStep(step) {
    const dots = modal.querySelectorAll('.sbs-dot');
    const line = modal.querySelector('.sbs-line');
    const s1 = modal.querySelector('#sbsStep1');
    const s2 = modal.querySelector('#sbsStep2');

    dots.forEach(d => {
      const s = parseInt(d.dataset.step);
      d.classList.toggle('active', s === step);
      d.classList.toggle('completed', s < step);
    });
    if (line) line.classList.toggle('completed', step > 1);

    s1.classList.remove('active', 'exit-left');
    s2.classList.remove('active', 'exit-left');
    if (step === 1) { s1.classList.add('active'); }
    else { s1.classList.add('exit-left'); s2.classList.add('active'); }
  }


  /* ── Calendar month navigation ── */
  function navigateMonth(delta) {
    state.calMonth += delta;
    if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; }
    if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; }
    renderCalendar();
  }

  /* ── Render calendar month view ── */
  function renderCalendar() {
    const titleEl = modal.querySelector('#sbsCalTitle');
    const daysEl = modal.querySelector('#sbsCalDays');
    const prevBtn = modal.querySelector('#sbsCalPrev');
    const nextBtn = modal.querySelector('#sbsCalNext');
    if (!titleEl || !daysEl) return;

    titleEl.textContent = MONTH_NAMES[state.calMonth] + ' ' + state.calYear;

    // Determine navigable range
    const dateStrs = dates.map(d => d.date);
    if (dateStrs.length && prevBtn && nextBtn) {
      const firstDate = new Date(dateStrs[0] + 'T12:00:00');
      const lastDate = new Date(dateStrs[dateStrs.length - 1] + 'T12:00:00');
      prevBtn.disabled = (state.calYear === firstDate.getFullYear() && state.calMonth <= firstDate.getMonth())
        || state.calYear < firstDate.getFullYear();
      nextBtn.disabled = (state.calYear === lastDate.getFullYear() && state.calMonth >= lastDate.getMonth())
        || state.calYear > lastDate.getFullYear();
    }

    const firstDayOfWeek = new Date(state.calYear, state.calMonth, 1).getDay();
    const daysInMonth = new Date(state.calYear, state.calMonth + 1, 0).getDate();
    const todayStr = new Date().toISOString().split('T')[0];

    daysEl.innerHTML = '';

    // Empty cells before 1st
    for (let i = 0; i < firstDayOfWeek; i++) {
      const empty = document.createElement('div');
      empty.className = 'sbs-cal-day empty';
      daysEl.appendChild(empty);
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = state.calYear + '-' +
        String(state.calMonth + 1).padStart(2, '0') + '-' +
        String(d).padStart(2, '0');

      const isAvailable = availableDateSet.has(dateStr);
      const booked = bookedSlots[dateStr] || [];
      const isFull = isAvailable && booked.length >= TIME_SLOTS.length;
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === state.date;

      const cell = document.createElement('button');
      cell.type = 'button';
      let cls = 'sbs-cal-day';
      if (isAvailable && !isFull) cls += ' available';
      if (isFull) cls += ' full';
      if (isToday) cls += ' today';
      if (isSelected) cls += ' selected';
      cell.className = cls;
      cell.textContent = d;

      if (isAvailable && !isFull) {
        cell.addEventListener('click', () => {
          const dateObj = new Date(state.calYear, state.calMonth, d);
          state.date = dateStr;
          state.dateLabel = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
          state.time = null;
          state.timeDisplay = null;
          hideCalendarShowTime();
        });
      }

      daysEl.appendChild(cell);
    }
  }


  /* ── Render time slots ── */
  function renderTimeGrid() {
    const grid = modal.querySelector('#sbsTimeGrid');
    const section = modal.querySelector('#sbsTimeSection');
    if (!grid || !section) return;
    grid.innerHTML = '';
    section.classList.add('visible');

    const booked = bookedSlots[state.date] || [];
    const loc = LOCATIONS[state.location] || LOCATIONS.houston;

    TIME_SLOTS.forEach(slot => {
      const isBooked = booked.includes(slot.hour24);
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'sbs-time-chip' + (isBooked ? ' disabled' : '');
      chip.innerHTML = `
        <span class="sbs-time-text">${slot.display} ${loc.tzLabel}</span>
        <span class="sbs-time-status">${isBooked ? 'Booked' : 'Open'}</span>`;

      if (!isBooked) {
        chip.addEventListener('click', () => {
          state.time = slot.hour24;
          state.timeDisplay = slot.display;
          renderStep2();
          goToStep(2);
        });
      }
      grid.appendChild(chip);
    });
  }


  /* ── Calendar ↔ Time picker transitions ── */
  function hideCalendarShowTime() {
    const cal = modal.querySelector('.sbs-calendar');
    const dateDisplay = modal.querySelector('#sbsDateDisplay');
    const dateChosen = modal.querySelector('#sbsDateChosen');

    // Vaporize calendar
    cal.classList.add('hidden');

    // Show selected date header
    dateChosen.textContent = state.dateLabel;
    // Small delay so the fade-in plays after calendar fades out
    setTimeout(() => {
      dateDisplay.classList.add('visible');
      renderTimeGrid();
    }, 150);
  }

  function showCalendar() {
    const cal = modal.querySelector('.sbs-calendar');
    const dateDisplay = modal.querySelector('#sbsDateDisplay');
    const section = modal.querySelector('#sbsTimeSection');

    // Hide time picker and date display
    section.classList.remove('visible');
    dateDisplay.classList.remove('visible');

    // Bring calendar back after brief pause
    setTimeout(() => {
      cal.classList.remove('hidden');
      renderCalendar();
    }, 150);
  }


  /* ── Render step 2 summary ── */
  function renderStep2() {
    const summary = modal.querySelector('#sbsSummary');
    const loc = LOCATIONS[state.location] || LOCATIONS.houston;
    if (summary) {
      summary.innerHTML = `
        <span class="sbs-tag">${state.serviceName}</span>
        <span class="sbs-tag">${state.dateLabel}</span>
        <span class="sbs-tag">${state.timeDisplay} ${loc.tzLabel}</span>`;
    }
  }


  /* ── Handle form submit → Stripe ── */
  async function handleSubmit(e) {
    e.preventDefault();

    const form = modal.querySelector('#sbsForm');
    const btn = modal.querySelector('.sbs-pay-btn');
    const formData = new FormData(form);
    const loc = LOCATIONS[state.location] || LOCATIONS.houston;

    const payload = {
      action: 'create_checkout',
      date: state.date,
      time: state.time,
      event_type_id: state.eventTypeId,
      service_name: state.serviceName,
      service_price: state.servicePrice,
      tz_offset: loc.tzOffset,
      tz_label: loc.tzLabel,
      location: state.location,
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      notes: formData.get('notes') || '',
      test_mode: true, // TEMP: remove after testing
    };

    if (btn) { btn.disabled = true; btn.textContent = 'Processing...'; }

    try {
      const resp = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (data.success && data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        alert('Something went wrong. Please try again.');
        console.error('Checkout error:', data);
      }
    } catch (err) {
      alert('Could not connect to payment server. Please try again.');
      console.error('Checkout fetch error:', err);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Pay $50 Deposit'; }
    }
  }


  return { open, close };
})();
