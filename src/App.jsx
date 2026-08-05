import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Home,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from './lib/supabase';

const initialBooking = {
  customer_name: '',
  phone: '',
  email: '',
  job_address: '',
  suburb: '',
  service_type: 'General house cleaning',
  property_type: 'House',
  preferred_date: '',
  preferred_time: '',
  customer_notes: '',
};

const statusLabels = {
  new: 'New',
  contacted: 'Contacted',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function formatDate(value) {
  if (!value) return 'Flexible';
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function App() {
  const [view, setView] = useState('book');
  const [form, setForm] = useState(initialBooking);
  const [submitState, setSubmitState] = useState({ status: 'idle', message: '' });
  const [adminEmail, setAdminEmail] = useState('');
  const [session, setSession] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [workspaceState, setWorkspaceState] = useState({
    status: 'idle',
    message: '',
  });

  const sortedBookings = useMemo(
    () =>
      [...bookings].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [bookings],
  );

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (view === 'workspace' && session) {
      fetchBookings();
    }
  }, [view, session]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submitBooking(event) {
    event.preventDefault();
    setSubmitState({ status: 'loading', message: 'Sending booking request...' });

    if (!supabase) {
      setSubmitState({
        status: 'error',
        message: 'Supabase is not configured yet. Add the VITE_SUPABASE values first.',
      });
      return;
    }

    const payload = {
      ...form,
      email: form.email || null,
      preferred_date: form.preferred_date || null,
      preferred_time: form.preferred_time || null,
      customer_notes: form.customer_notes || null,
    };

    const { error } = await supabase.from('bookings').insert(payload);

    if (error) {
      setSubmitState({
        status: 'error',
        message: `Could not send booking: ${error.message}`,
      });
      return;
    }

    setForm(initialBooking);
    setSubmitState({
      status: 'success',
      message: 'Booking request sent. The team can now see it in the workspace.',
    });
  }

  async function sendMagicLink(event) {
    event.preventDefault();
    setWorkspaceState({ status: 'loading', message: 'Sending sign-in link...' });

    if (!supabase) {
      setWorkspaceState({
        status: 'error',
        message: 'Supabase is not configured yet. Add the VITE_SUPABASE values first.',
      });
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: adminEmail,
      options: {
        emailRedirectTo: window.location.origin + window.location.pathname,
      },
    });

    if (error) {
      setWorkspaceState({ status: 'error', message: error.message });
      return;
    }

    setWorkspaceState({
      status: 'success',
      message: 'Check that email for the sign-in link.',
    });
  }

  async function fetchBookings() {
    setWorkspaceState({ status: 'loading', message: 'Loading bookings...' });

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setWorkspaceState({
        status: 'error',
        message:
          error.code === '42501'
            ? 'Signed in, but this user is not in admin_users yet.'
            : error.message,
      });
      setBookings([]);
      return;
    }

    setBookings(data ?? []);
    setWorkspaceState({
      status: 'success',
      message: `${data?.length ?? 0} booking request${data?.length === 1 ? '' : 's'} loaded.`,
    });
  }

  async function updateStatus(id, status) {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id);

    if (error) {
      setWorkspaceState({ status: 'error', message: error.message });
      return;
    }

    setBookings((current) =>
      current.map((booking) =>
        booking.id === id ? { ...booking, status } : booking,
      ),
    );
  }

  async function signOut() {
    await supabase.auth.signOut();
    setBookings([]);
  }

  return (
    <main>
      <section className="hero">
        <nav className="topbar">
          <a className="brand" href="#top" aria-label="4 Sons Cleaning home">
            <span>4</span>
            <strong>Sons Cleaning</strong>
          </a>
          <div className="nav-actions" aria-label="View switcher">
            <button
              className={view === 'book' ? 'active' : ''}
              type="button"
              onClick={() => setView('book')}
            >
              Book
            </button>
            <button
              className={view === 'workspace' ? 'active' : ''}
              type="button"
              onClick={() => setView('workspace')}
            >
              Workspace
            </button>
          </div>
        </nav>

        <div className="hero-grid" id="top">
          <div className="hero-copy">
            <p className="eyebrow">Melbourne residential and commercial cleaning</p>
            <h1>Book a cleaning job without the message chaos.</h1>
            <p>
              Customers send one clear request with the job address, preferred time,
              and service type. The private workspace keeps every booking in one place.
            </p>
            <div className="hero-pills" aria-label="Services">
              <span>House cleaning</span>
              <span>Office cleaning</span>
              <span>End-of-lease</span>
              <span>Post-build</span>
            </div>
          </div>

          <div className="hero-panel" aria-label="Booking workflow summary">
            <div>
              <Sparkles />
              <span>Customer sends request</span>
            </div>
            <div>
              <ClipboardList />
              <span>Workspace receives booking</span>
            </div>
            <div>
              <ShieldCheck />
              <span>Admin confirms details</span>
            </div>
          </div>
        </div>
      </section>

      {view === 'book' ? (
        <BookingForm
          form={form}
          submitState={submitState}
          updateField={updateField}
          submitBooking={submitBooking}
        />
      ) : (
        <Workspace
          adminEmail={adminEmail}
          setAdminEmail={setAdminEmail}
          session={session}
          workspaceState={workspaceState}
          bookings={sortedBookings}
          sendMagicLink={sendMagicLink}
          fetchBookings={fetchBookings}
          updateStatus={updateStatus}
          signOut={signOut}
        />
      )}
    </main>
  );
}

function BookingForm({ form, submitState, updateField, submitBooking }) {
  return (
    <section className="section-grid">
      <div className="section-copy">
        <p className="eyebrow">Booking request</p>
        <h2>Send the job details once.</h2>
        <p>
          The job address is where the cleaning team goes. Contact details are used
          only to confirm the booking.
        </p>
        {!isSupabaseConfigured && (
          <div className="notice error">
            Supabase env vars are missing, so submissions are paused.
          </div>
        )}
      </div>

      <form className="booking-form" onSubmit={submitBooking}>
        <label>
          Full name
          <input
            required
            name="customer_name"
            autoComplete="name"
            value={form.customer_name}
            onChange={updateField}
            placeholder="Customer name"
          />
        </label>

        <div className="field-row">
          <label>
            Phone
            <input
              required
              name="phone"
              autoComplete="tel"
              value={form.phone}
              onChange={updateField}
              placeholder="04..."
            />
          </label>
          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={updateField}
              placeholder="Optional"
            />
          </label>
        </div>

        <label>
          Job address
          <input
            required
            name="job_address"
            autoComplete="street-address"
            value={form.job_address}
            onChange={updateField}
            placeholder="Street address for the cleaning job"
          />
        </label>

        <div className="field-row">
          <label>
            Suburb
            <input
              required
              name="suburb"
              autoComplete="address-level2"
              value={form.suburb}
              onChange={updateField}
              placeholder="Melton"
            />
          </label>
          <label>
            Property type
            <select name="property_type" value={form.property_type} onChange={updateField}>
              <option>House</option>
              <option>Apartment</option>
              <option>Office</option>
              <option>Shop</option>
              <option>Other</option>
            </select>
          </label>
        </div>

        <label>
          Service type
          <select name="service_type" value={form.service_type} onChange={updateField}>
            <option>General house cleaning</option>
            <option>Deep cleaning</option>
            <option>Office cleaning</option>
            <option>End-of-lease cleaning</option>
            <option>Post-build cleaning</option>
            <option>Custom cleaning job</option>
          </select>
        </label>

        <div className="field-row">
          <label>
            Preferred date
            <input
              name="preferred_date"
              type="date"
              value={form.preferred_date}
              onChange={updateField}
            />
          </label>
          <label>
            Preferred time
            <input
              name="preferred_time"
              value={form.preferred_time}
              onChange={updateField}
              placeholder="Morning, afternoon, or exact time"
            />
          </label>
        </div>

        <label>
          Notes
          <textarea
            name="customer_notes"
            value={form.customer_notes}
            onChange={updateField}
            placeholder="Rooms, parking, access notes, preferred products..."
          />
        </label>

        <button className="primary" type="submit" disabled={submitState.status === 'loading'}>
          {submitState.status === 'loading' ? 'Sending...' : 'Send booking request'}
        </button>

        {submitState.message && (
          <div className={`notice ${submitState.status}`}>{submitState.message}</div>
        )}
      </form>
    </section>
  );
}

function Workspace({
  adminEmail,
  setAdminEmail,
  session,
  workspaceState,
  bookings,
  sendMagicLink,
  fetchBookings,
  updateStatus,
  signOut,
}) {
  if (!session) {
    return (
      <section className="section-grid workspace-login">
        <div className="section-copy">
          <p className="eyebrow">Private workspace</p>
          <h2>Sign in to review bookings.</h2>
          <p>
            Use the admin email added in Supabase. This keeps customer addresses
            and contact details behind Auth instead of sitting in the open.
          </p>
        </div>

        <form className="booking-form compact" onSubmit={sendMagicLink}>
          <LockKeyhole className="form-icon" />
          <label>
            Admin email
            <input
              required
              type="email"
              value={adminEmail}
              onChange={(event) => setAdminEmail(event.target.value)}
              placeholder="admin@example.com"
            />
          </label>
          <button className="primary" type="submit">
            Send sign-in link
          </button>
          {workspaceState.message && (
            <div className={`notice ${workspaceState.status}`}>{workspaceState.message}</div>
          )}
        </form>
      </section>
    );
  }

  return (
    <section className="workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Private workspace</p>
          <h2>Bookings</h2>
          <p>{session.user.email}</p>
        </div>
        <div className="workspace-actions">
          <button type="button" onClick={fetchBookings}>
            <RefreshCw />
            Refresh
          </button>
          <button type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      {workspaceState.message && (
        <div className={`notice ${workspaceState.status}`}>{workspaceState.message}</div>
      )}

      {bookings.length === 0 ? (
        <div className="empty-state">
          <ClipboardList />
          <h3>No bookings shown yet</h3>
          <p>
            If bookings exist, make sure this signed-in email was added to
            `public.admin_users`.
          </p>
        </div>
      ) : (
        <div className="booking-list">
          {bookings.map((booking) => (
            <article className="booking-card" key={booking.id}>
              <div className="booking-card-head">
                <div>
                  <p>{booking.service_type}</p>
                  <h3>{booking.customer_name}</h3>
                </div>
                <select
                  aria-label={`Status for ${booking.customer_name}`}
                  value={booking.status}
                  onChange={(event) => updateStatus(booking.id, event.target.value)}
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="booking-meta">
                <span>
                  <Phone /> {booking.phone}
                </span>
                {booking.email && (
                  <span>
                    <Mail /> {booking.email}
                  </span>
                )}
                <span>
                  <MapPin /> {booking.job_address}, {booking.suburb}
                </span>
                <span>
                  <Home /> {booking.property_type}
                </span>
                <span>
                  <CalendarDays /> {formatDate(booking.preferred_date)}
                  {booking.preferred_time ? `, ${booking.preferred_time}` : ''}
                </span>
              </div>

              {booking.customer_notes && <p className="notes">{booking.customer_notes}</p>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default App;
