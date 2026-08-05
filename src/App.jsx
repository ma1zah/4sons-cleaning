import { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { supabase } from './lib/supabase';
import AdminPage from './AdminPage';

const phone = '0426 482 554';
const phoneHref = 'tel:0426482554';
const email = '4sonscleaningservices@gmail.com';

const services = [
  {
    title: 'End of lease',
    text: 'A detailed, top-to-bottom clean designed to leave your property inspection-ready.',
  },
  {
    title: 'Home cleaning',
    text: 'Reliable one-off or recurring cleaning shaped around your home and routine.',
  },
  {
    title: 'Commercial cleaning',
    text: 'Professional cleaning for offices, gyms and local business premises.',
  },
  {
    title: 'Carpet steam cleaning',
    text: 'A powerful refresh for tired carpets, available as a standalone service or add-on.',
  },
  {
    title: 'Oven cleaning',
    text: 'Built-up grease and residue handled carefully, including stovetop and rangehood.',
  },
  {
    title: 'Window cleaning',
    text: 'Internal glass, frames and tracks cleaned for a clearer, brighter finish.',
  },
];

const apartmentPrices = [
  ['Studio apartment', '$230'],
  ['1 bedroom', '$290'],
  ['2 bedrooms', '$390'],
  ['3 bedrooms', '$490'],
];

const housePrices = [
  ['2 bedroom house', '$400'],
  ['3 bedroom house', '$450'],
  ['4 bedroom house', '$600'],
  ['5 bedroom house', '$750'],
];

const includedItems = [
  'Kitchen deep clean',
  'Oven, stovetop & rangehood',
  'Bathrooms, shower glass & toilets',
  'Bedrooms & living areas',
  'Vacuuming & mopping',
  'Skirting boards, doors & handles',
  'Cobweb removal',
  'Light switches & internal dusting',
];

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function getRoute() {
  const path = window.location.pathname;
  const relativePath = basePath && basePath !== '.' && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;

  if (/\/admin\/?$/.test(relativePath)) return 'admin';
  if (/\/booking\/?$/.test(relativePath)) return 'booking';
  return 'home';
}

function getAsset(path) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}

function formatDate(value) {
  if (!value) return 'Flexible';
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(value) {
  if (!value) return '';
  const [hours, minutes] = value.slice(0, 5).split(':').map(Number);
  return new Intl.DateTimeFormat('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2000, 0, 1, hours, minutes));
}

function App() {
  const [route, setRoute] = useState(getRoute);

  useEffect(() => {
    const updateRoute = () => setRoute(getRoute());
    window.addEventListener('popstate', updateRoute);
    return () => window.removeEventListener('popstate', updateRoute);
  }, []);

  function navigate(nextRoute) {
    const nextPath = nextRoute === 'home' ? '/' : `/${nextRoute}`;
    window.history.pushState({}, '', `${import.meta.env.BASE_URL}${nextPath.replace(/^\//, '')}`);
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (route === 'admin') {
    return <AdminPage navigate={navigate} />;
  }

  if (route === 'booking') {
    return <BookingPage navigate={navigate} />;
  }

  return <HomePage navigate={navigate} />;
}

function Brand({ light = false, navigate }) {
  return (
    <button className={`brand ${light ? 'brand-light' : ''}`} type="button" onClick={() => navigate('home')}>
      <span>4</span>
      <strong>
        SONS
        <small>CLEANING & MAINTENANCE</small>
      </strong>
    </button>
  );
}

function HomePage({ navigate }) {
  useEffect(() => {
    const elements = document.querySelectorAll('.site-shell [data-reveal]');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('is-visible'));
      return undefined;
    }

    document.documentElement.classList.add('reveal-ready');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -45px', threshold: 0.12 });

    elements.forEach((element) => observer.observe(element));
    return () => {
      observer.disconnect();
      document.documentElement.classList.remove('reveal-ready');
    };
  }, []);

  return (
    <main className="site-shell" id="top">
      <Header navigate={navigate} />

      <section className="hero-section">
        <img
          className="hero-background"
          src={getAsset('/images/team-hero.jpeg')}
          alt="The 4 Sons Cleaning team with professional cleaning equipment"
        />
        <div className="hero-copy">
          <p className="pill">Local. Reliable. Detail-driven.</p>
          <h1>
            A cleaner space.
            <span>A lighter day.</span>
          </h1>
          <p>
            Professional home, commercial and end-of-lease cleaning from a trusted
            Melbourne-based team.
          </p>
          <div className="hero-actions">
            <button type="button" onClick={() => navigate('booking')}>
              Check availability
            </button>
            <a href="#quote">Make an enquiry</a>
          </div>
          <div className="hero-checks" aria-label="Service promises">
            <span>Experienced team</span>
            <span>Affordable rates</span>
            <span>On time, every time</span>
          </div>
        </div>
      </section>

      <ServicesSection />
      <TeamSection />
      <PricingSection />
      <QuoteSection />
      <Footer navigate={navigate} />

      <div className="mobile-cta" aria-label="Quick contact actions">
        <a href={phoneHref}>Call now</a>
        <a href="#quote">Enquire now</a>
      </div>
    </main>
  );
}

function Header({ navigate }) {
  return (
    <header className="top-strip">
      <div className="service-area">
        <span>Serving Melbourne</span>
        <a href={phoneHref}>Call {phone}</a>
      </div>
      <nav className="main-nav" aria-label="Main navigation">
        <Brand navigate={navigate} />
        <div className="nav-links">
          <a href="#services">Services</a>
          <a href="#pricing">Pricing</a>
          <a href="#about">Our team</a>
          <button type="button" onClick={() => navigate('booking')}>Availability</button>
        </div>
        <button className="nav-quote" type="button" onClick={() => navigate('booking')}>
          Request a date
        </button>
      </nav>
    </header>
  );
}

function ServicesSection() {
  return (
    <section className="section services-section" id="services">
      <div className="section-heading" data-reveal>
        <p className="eyebrow">What we do</p>
        <h2>Cleaning that gets the details right.</h2>
        <p>
          From the final inspection to the weekly reset, we bring the equipment,
          care and dependable team your property deserves.
        </p>
      </div>

      <div className="services-grid" data-reveal>
        {services.map((service, index) => (
          <article className="service-card" key={service.title}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <h3>{service.title}</h3>
            <p>{service.text}</p>
            <a href="#quote">Enquire now &rarr;</a>
          </article>
        ))}
      </div>
    </section>
  );
}

function TeamSection() {
  return (
    <section className="section team-section" id="about">
      <div className="team-image" data-reveal>
        <img src={getAsset('/images/team-indoor.jpeg')} alt="4 Sons Cleaning team indoors" />
      </div>
      <div className="team-copy" data-reveal>
        <p className="eyebrow">Meet the team</p>
        <h2>
          Your property,
          <span>our priority.</span>
        </h2>
        <p>
          We are a local cleaning team serving homes and businesses across Melbourne.
          We believe good service is simple: arrive when promised, work with care,
          and leave every space genuinely cleaner.
        </p>
        <div className="team-stats">
          <span><strong>Local</strong> Melbourne based</span>
          <span><strong>Prepared</strong> Professional equipment</span>
          <span><strong>Thorough</strong> Attention to detail</span>
          <span><strong>Reliable</strong> Clear communication</span>
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section className="section pricing-section" id="pricing">
      <div className="section-heading" data-reveal>
        <p className="eyebrow">Straightforward pricing</p>
        <h2>End-of-lease cleaning.</h2>
        <p>
          Starting prices are shown below. Your final price depends on property condition,
          size and requested add-ons.
        </p>
      </div>

      <div className="pricing-grid" data-reveal>
        <PriceCard title="Apartments & units" prices={apartmentPrices} />
        <PriceCard title="Houses" prices={housePrices} featured />
        <div className="included-panel">
          <h3>Your standard clean includes</h3>
          <div>
            {includedItems.map((item) => (
              <span key={item}>
                <Check />
                {item}
              </span>
            ))}
          </div>
          <div className="addons">
            <strong>Optional add-ons</strong>
            <p>
              Carpet steam cleaning from $100 · Internal windows from $70 · Heavy
              oven cleaning from $70 · Pet hair removal from $40 · Mould treatment
              from $70
            </p>
          </div>
        </div>
      </div>

      <div className="offers" data-reveal>
        <Offer title="Opening offer" value="15% off" text="End-of-lease cleaning for the first 20 customers*" />
        <Offer title="Community offer" value="10% off" text="For Filipino families & referrals*" />
        <Offer title="Referral bonus" value="$30 off" text="For you and the friend you refer*" />
      </div>
    </section>
  );
}

function PriceCard({ title, prices, featured = false }) {
  return (
    <article className={`price-card ${featured ? 'featured' : ''}`}>
      {featured && <span className="popular">Popular</span>}
      <h3>{title}</h3>
      <div className="price-list">
        {prices.map(([label, amount]) => (
          <div key={label}>
            <span>{label}</span>
            <strong><small>from</small>{amount}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

function Offer({ title, value, text }) {
  return (
    <article>
      <span>{title}</span>
      <strong>{value}</strong>
      <p>{text}</p>
    </article>
  );
}

function QuoteSection() {
  const [form, setForm] = useState({
    customer_name: '',
    phone: '',
    email: '',
    suburb: '',
    service_type: 'End of lease cleaning',
    customer_notes: '',
  });
  const [state, setState] = useState({ status: 'idle', message: '' });

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submitQuote(event) {
    event.preventDefault();

    if (!supabase) {
      setState({ status: 'error', message: 'Online enquiries are temporarily unavailable. Please call or email the team.' });
      return;
    }

    setState({ status: 'loading', message: 'Sending your enquiry...' });
    const { error } = await supabase.from('enquiries').insert({
      customer_name: form.customer_name,
      phone: form.phone,
      email: form.email || null,
      suburb: form.suburb,
      service_type: form.service_type,
      details: form.customer_notes || null,
    });

    if (error) {
      setState({ status: 'error', message: 'Your enquiry could not be sent. Please try again or contact the team directly.' });
      return;
    }

    setForm({
      customer_name: '',
      phone: '',
      email: '',
      suburb: '',
      service_type: 'End of lease cleaning',
      customer_notes: '',
    });
    setState({ status: 'success', message: 'Enquiry sent. The team will contact you shortly.' });
  }

  return (
    <section className="section quote-section" id="quote">
      <div className="quote-copy" data-reveal>
        <p className="eyebrow">Make an enquiry</p>
        <h2>Tell us what needs cleaning.</h2>
        <p>
          Share a few details and they will go directly to the team. You can also
          call or email us if you prefer.
        </p>
        <div className="contact-stack">
          <a href={phoneHref}>
            <span>Call us</span>
            <strong>{phone}</strong>
          </a>
          <a href={`mailto:${email}`}>
            <span>Email us</span>
            <strong>{email}</strong>
          </a>
          <div>
            <span>Service area</span>
            <strong>Melbourne</strong>
          </div>
        </div>
      </div>

      <form className="quote-form" data-reveal onSubmit={submitQuote}>
        <label>
          Name
          <input name="customer_name" placeholder="Your name" required value={form.customer_name} onChange={updateField} />
        </label>
        <label>
          Phone
          <input name="phone" placeholder="04xx xxx xxx" required value={form.phone} onChange={updateField} />
        </label>
        <label>
          Email (optional)
          <input name="email" type="email" placeholder="you@example.com" value={form.email} onChange={updateField} />
        </label>
        <label>
          Suburb
          <input name="suburb" placeholder="Your suburb" required value={form.suburb} onChange={updateField} />
        </label>
        <label>
          Service
          <select name="service_type" value={form.service_type} onChange={updateField}>
            <option>End of lease cleaning</option>
            <option>Home cleaning</option>
            <option>Commercial cleaning</option>
            <option>Carpet steam cleaning</option>
            <option>Oven cleaning</option>
            <option>Window cleaning</option>
          </select>
        </label>
        <label className="wide">
          Property details
          <textarea
            name="customer_notes"
            placeholder="Property size, preferred date and anything we should know…"
            value={form.customer_notes}
            onChange={updateField}
          />
        </label>
        <button disabled={state.status === 'loading'} type="submit">
          {state.status === 'loading' ? 'Sending...' : 'Send my enquiry →'}
        </button>
        <p className="form-note">Your details are sent securely to 4 Sons Cleaning.</p>
        {state.message && <p className={`form-message ${state.status}`}>{state.message}</p>}
      </form>
    </section>
  );
}

function BookingPage({ navigate }) {
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('09:00');
  const [bookedSlots, setBookedSlots] = useState([]);
  const [form, setForm] = useState({
    customer_name: '',
    email: '',
    phone: '',
    suburb: '',
    job_address: '',
    service_type: 'End of lease cleaning',
    customer_notes: '',
  });
  const [state, setState] = useState({ status: 'idle', message: '' });

  const monthName = new Intl.DateTimeFormat('en-AU', { month: 'long' }).format(month);
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const calendarDays = [
    ...Array(monthStart.getDay()).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const selectedSlots = bookedSlots.filter((slot) => slot.booked_date === selectedDate);
  const selectedTimeUnavailable = selectedSlots.some(
    (slot) => slot.booked_time.slice(0, 5) === preferredTime,
  );
  const canGoBack = month > new Date(today.getFullYear(), today.getMonth(), 1);

  useEffect(() => {
    async function loadAvailability() {
      if (!supabase) return;

      const lastVisibleDate = new Date(today.getFullYear() + 1, today.getMonth() + 1, 0);
      const { data, error } = await supabase
        .from('availability_slots')
        .select('booked_date, booked_time')
        .gte('booked_date', toDateKey(today))
        .lte('booked_date', toDateKey(lastVisibleDate))
        .order('booked_date')
        .order('booked_time');

      if (!error) setBookedSlots(data ?? []);
    }

    loadAvailability();
  }, [today]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function chooseDay(day) {
    if (!day) return;
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    if (date < today) return;
    setSelectedDate(toDateKey(date));
    setState({ status: 'idle', message: '' });
  }

  function moveMonth(offset) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
    setSelectedDate('');
  }

  async function submitBooking(event) {
    event.preventDefault();
    if (!selectedDate) return;

    if (!supabase) {
      setState({ status: 'error', message: 'Online booking is temporarily unavailable. Please call or email the team.' });
      return;
    }

    const { data: latestSlots, error: availabilityError } = await supabase
      .from('availability_slots')
      .select('booked_time')
      .eq('booked_date', selectedDate);
    const timeWasTaken = latestSlots?.some((slot) => slot.booked_time.slice(0, 5) === preferredTime);

    if (availabilityError) {
      setState({ status: 'error', message: 'Availability could not be checked. Please try again.' });
      return;
    }

    if (timeWasTaken) {
      setBookedSlots((current) => [
        ...current.filter((slot) => slot.booked_date !== selectedDate),
        ...latestSlots.map((slot) => ({ booked_date: selectedDate, booked_time: slot.booked_time })),
      ]);
      setState({ status: 'error', message: 'That start time is unavailable. Please choose another time.' });
      return;
    }

    setState({ status: 'loading', message: 'Sending your booking enquiry...' });
    const { error } = await supabase.from('bookings').insert({
      ...form,
      property_type: 'Not specified',
      preferred_date: selectedDate,
      preferred_time: preferredTime,
      customer_notes: form.customer_notes || null,
    });

    if (error) {
      setState({ status: 'error', message: 'Your enquiry could not be sent. Please try again or contact the team directly.' });
      return;
    }

    setForm({
      customer_name: '',
      email: '',
      phone: '',
      suburb: '',
      job_address: '',
      service_type: 'End of lease cleaning',
      customer_notes: '',
    });
    setState({ status: 'success', message: 'Booking enquiry sent. The team will contact you to confirm the time and final price.' });
  }

  return (
    <main className="booking-shell">
      <nav className="booking-nav">
        <Brand navigate={navigate} />
        <button type="button" onClick={() => navigate('home')}>&larr; Back to website</button>
      </nav>

      <section className="booking-intro">
        <div>
          <p className="eyebrow">Booking request</p>
          <h1>Choose your preferred<br />cleaning date.</h1>
          <p>
            Booked start times are shown on each date. Your selection is still a
            request—the team will contact you to confirm the final time and price.
          </p>
        </div>
        <aside>
          <strong>Privacy by design</strong>
          <span>Only booked times appear publicly. Customer names, contacts and addresses stay private.</span>
        </aside>
      </section>

      <section className="booking-layout">
        <div className="calendar-panel">
          <div className="booking-panel-head">
            <div>
              <p className="eyebrow">Step 1</p>
              <h2>Preferred day and time</h2>
            </div>
          </div>

          <div className="month-switcher">
            <button type="button" aria-label="Previous month" disabled={!canGoBack} onClick={() => moveMonth(-1)}>&larr;</button>
            <div><strong>{monthName}</strong><span>{month.getFullYear()}</span></div>
            <button type="button" aria-label="Next month" onClick={() => moveMonth(1)}>&rarr;</button>
          </div>

          <div className="calendar-weekdays" aria-hidden="true">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="calendar-grid">
            {calendarDays.map((day, index) => {
              if (!day) return <span className="calendar-blank" key={`blank-${index}`} />;
              const date = new Date(month.getFullYear(), month.getMonth(), day);
              const dateKey = toDateKey(date);
              const slots = bookedSlots.filter((slot) => slot.booked_date === dateKey);
              const disabled = date < today;
              return (
                <button
                  className={`${selectedDate === dateKey ? 'selected' : ''} ${slots.length ? 'has-booking' : ''}`}
                  disabled={disabled}
                  key={dateKey}
                  type="button"
                  onClick={() => chooseDay(day)}
                >
                  <strong>{day}</strong>
                  {slots.map((slot) => <em key={`${dateKey}-${slot.booked_time}`}>Booked · {formatTime(slot.booked_time)}</em>)}
                </button>
              );
            })}
          </div>

          {selectedDate && (
            <div className="time-picker">
              <div>
                <h3>Your preferred start time</h3>
                <p>Choose any exact minute. Existing bookings for this date are listed beside it.</p>
              </div>
              <label>
                Preferred start time
                <input
                  aria-invalid={selectedTimeUnavailable}
                  type="time"
                  value={preferredTime}
                  onChange={(event) => {
                    setPreferredTime(event.target.value);
                    setState({ status: 'idle', message: '' });
                  }}
                />
              </label>
              <div className="booked-list">
                <span>Already booked</span>
                <strong>{selectedSlots.length ? selectedSlots.map((slot) => formatTime(slot.booked_time)).join(', ') : 'No booked times'}</strong>
              </div>
              {selectedTimeUnavailable && <p className="time-warning">That exact start time is unavailable.</p>}
            </div>
          )}
        </div>

        <form className="booking-form" onSubmit={submitBooking}>
          <p className="eyebrow">Step 2</p>
          <h2>Your enquiry</h2>
          <div className="booking-fields">
            <label>Name<input name="customer_name" required value={form.customer_name} onChange={updateField} /></label>
            <label>Email<input name="email" type="email" required value={form.email} onChange={updateField} /></label>
            <label>Phone<input name="phone" required value={form.phone} onChange={updateField} /></label>
            <label>Suburb<input name="suburb" required value={form.suburb} onChange={updateField} /></label>
            <label className="wide">Address<input name="job_address" placeholder="Street number and street name" required value={form.job_address} onChange={updateField} /></label>
            <label className="wide">Service
              <select name="service_type" value={form.service_type} onChange={updateField}>
                <option>End of lease cleaning</option>
                <option>Home cleaning</option>
                <option>Commercial cleaning</option>
                <option>Carpet steam cleaning</option>
                <option>Oven cleaning</option>
                <option>Window cleaning</option>
              </select>
            </label>
            <label className="wide">Property details
              <textarea name="customer_notes" placeholder="Size, condition, access notes…" value={form.customer_notes} onChange={updateField} />
            </label>
          </div>

          <div className="booking-summary">
            <span>Preferred date<strong>{selectedDate ? new Intl.DateTimeFormat('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${selectedDate}T00:00:00`)) : 'Choose a date'}</strong></span>
            <span>Preferred start<strong>{formatTime(preferredTime)}</strong></span>
          </div>
          <button className="booking-submit" disabled={!selectedDate || selectedTimeUnavailable || state.status === 'loading'} type="submit">
            {state.status === 'loading' ? 'Sending…' : 'Send booking enquiry →'}
          </button>
          {state.message && <p className={`form-message ${state.status}`}>{state.message}</p>}
        </form>
      </section>
    </main>
  );
}

function Footer({ navigate }) {
  return (
    <footer className="site-footer">
      <Brand light navigate={navigate} />
      <p>Professional cleaning across Melbourne.</p>
      <nav aria-label="Footer navigation">
        <a href="#services">Services</a>
        <a href="#pricing">Pricing</a>
        <button type="button" onClick={() => navigate('booking')}>Availability</button>
      </nav>
      <small>© 2026 4 Sons Cleaning & Maintenance Services. *Offers and bond-back guarantee are subject to conditions.</small>
    </footer>
  );
}

export default App;
