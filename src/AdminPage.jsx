import { useEffect, useMemo, useState } from 'react';
import { LogOut, ShieldCheck } from 'lucide-react';
import { supabase } from './lib/supabase';

const serviceOptions = [
  'End of lease cleaning',
  'Home cleaning',
  'Commercial cleaning',
  'Carpet steam cleaning',
  'Oven cleaning',
  'Window cleaning',
];

const statusOptions = [
  ['pending', 'Pending'],
  ['confirmed', 'Confirmed'],
  ['rejected', 'Rejected'],
  ['cancelled', 'Cancelled'],
  ['completed', 'Completed'],
  ['new', 'New'],
  ['contacted', 'Contacted'],
];

const emptyBooking = {
  customer_name: '',
  phone: '',
  email: '',
  suburb: '',
  job_address: '',
  service_type: '',
  add_ons: '',
  property_type: '',
  customer_notes: '',
  staff_notes: '',
  scheduled_date: '',
  scheduled_time: '09:00',
};

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(value) {
  if (!value) return 'Time not set';
  const [hours, minutes] = value.slice(0, 5).split(':').map(Number);
  return new Intl.DateTimeFormat('en-AU', { hour: 'numeric', minute: '2-digit' })
    .format(new Date(2000, 0, 1, hours, minutes));
}

function formatLongDate(value) {
  if (!value) return 'Select a date';
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function scheduledDate(booking) {
  return booking.scheduled_date || (booking.status === 'confirmed' ? booking.preferred_date : '');
}

function scheduledTime(booking) {
  return booking.scheduled_time || (booking.status === 'confirmed' ? booking.preferred_time : '');
}

function displayStatus(status) {
  if (status === 'new') return 'Pending';
  return status ? `${status.charAt(0).toUpperCase()}${status.slice(1)}` : 'Pending';
}

function adminErrorMessage(error) {
  return error?.code === '23505'
    ? 'That start time is already booked or blocked. Choose another time.'
    : error.message;
}

function bookingPayload(values) {
  const nullableFields = [
    'customer_name', 'phone', 'email', 'suburb', 'job_address', 'service_type',
    'add_ons', 'property_type', 'customer_notes', 'staff_notes', 'scheduled_date',
    'scheduled_time',
  ];
  return nullableFields.reduce((result, key) => ({
    ...result,
    [key]: values[key]?.trim?.() || null,
  }), {});
}

function AdminBookingCard({ booking, onSaved }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => ({
    ...booking,
    scheduled_date: scheduledDate(booking),
    scheduled_time: scheduledTime(booking),
  }));
  const [saveState, setSaveState] = useState('idle');
  const [actionState, setActionState] = useState({ status: 'idle', message: '' });

  function updateField(event) {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));
  }

  async function saveChanges(event) {
    event.preventDefault();
    setSaveState('saving');
    const payload = { ...bookingPayload(draft), status: draft.status };
    const { data, error } = await supabase
      .from('bookings')
      .update(payload)
      .eq('id', booking.id)
      .select()
      .single();

    if (error) {
      setSaveState(adminErrorMessage(error));
      return;
    }

    setSaveState('saved');
    onSaved(data);
  }

  async function setDecision(status) {
    const scheduleDate = draft.scheduled_date || booking.scheduled_date || booking.preferred_date;
    const scheduleTime = draft.scheduled_time || booking.scheduled_time || booking.preferred_time;

    if (status === 'confirmed' && (!scheduleDate || !scheduleTime)) {
      setActionState({ status: 'error', message: 'Set a date and time before approving.' });
      setOpen(true);
      return;
    }

    setActionState({ status: 'loading', message: '' });
    const payload = status === 'confirmed'
      ? { status, scheduled_date: scheduleDate, scheduled_time: scheduleTime }
      : { status };
    const { data, error } = await supabase
      .from('bookings')
      .update(payload)
      .eq('id', booking.id)
      .select()
      .single();

    if (error) {
      setActionState({ status: 'error', message: adminErrorMessage(error) });
      return;
    }

    setDraft((current) => ({
      ...current,
      ...data,
      scheduled_date: scheduledDate(data),
      scheduled_time: scheduledTime(data),
    }));
    setActionState({
      status: 'success',
      message: status === 'confirmed' ? 'Booking approved.' : 'Booking disapproved.',
    });
    onSaved(data);
  }

  return (
    <article className="enquiry-card">
      <div className="enquiry-summary">
        <div>
          <span className={`status-chip status-${booking.status}`}>{displayStatus(booking.status)}</span>
          <h3>{booking.customer_name || 'Unnamed customer'}</h3>
          <p>{booking.service_type || 'Service not specified'}{booking.suburb ? ` · ${booking.suburb}` : ''}</p>
        </div>
        <div className="enquiry-requested">
          <small>Requested</small>
          <strong>{booking.preferred_date ? formatLongDate(booking.preferred_date) : 'No preferred date'}</strong>
          <span>{formatTime(booking.preferred_time)}</span>
        </div>
        <div className="enquiry-actions">
          {scheduledDate(booking) && (
            <span className="scheduled-chip">Scheduled {formatTime(scheduledTime(booking))}</span>
          )}
          {!['completed', 'cancelled'].includes(booking.status) && (
            <div className="approval-actions">
              <button
                className="approve-booking"
                disabled={booking.status === 'confirmed' || actionState.status === 'loading'}
                type="button"
                onClick={() => setDecision('confirmed')}
              >
                {booking.status === 'confirmed' ? 'Approved' : 'Approve'}
              </button>
              <button
                className="disapprove-booking"
                disabled={booking.status === 'rejected' || actionState.status === 'loading'}
                type="button"
                onClick={() => setDecision('rejected')}
              >
                {booking.status === 'rejected' ? 'Disapproved' : 'Disapprove'}
              </button>
            </div>
          )}
          {actionState.message && (
            <small className={`decision-message ${actionState.status}`}>{actionState.message}</small>
          )}
        </div>
      </div>
      <button className="manage-toggle" type="button" onClick={() => setOpen((current) => !current)}>
        {open ? 'Close details ↑' : 'View and manage ↓'}
      </button>

      {open && (
        <form className="manage-form" onSubmit={saveChanges}>
          <div className="admin-fields two-col">
            <label>Name<input name="customer_name" value={draft.customer_name || ''} onChange={updateField} /></label>
            <label>Phone<input name="phone" value={draft.phone || ''} onChange={updateField} /></label>
            <label>Email<input name="email" type="email" value={draft.email || ''} onChange={updateField} /></label>
            <label>Suburb / area<input name="suburb" value={draft.suburb || ''} onChange={updateField} /></label>
            <label className="full">Address<input name="job_address" value={draft.job_address || ''} onChange={updateField} /></label>
            <label>Type of cleaning<input list="admin-services" name="service_type" value={draft.service_type || ''} onChange={updateField} /></label>
            <label>Add-ons<input name="add_ons" value={draft.add_ons || ''} onChange={updateField} /></label>
            <label className="full">House / property details<textarea name="customer_notes" value={draft.customer_notes || ''} onChange={updateField} /></label>
            <label className="full">Private staff notes<textarea name="staff_notes" value={draft.staff_notes || ''} onChange={updateField} /></label>
          </div>
          <div className="schedule-fields">
            <label>Status
              <select name="status" value={draft.status} onChange={updateField}>
                {statusOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
            </label>
            <label>Scheduled date<input name="scheduled_date" type="date" value={draft.scheduled_date || ''} onChange={updateField} /></label>
            <label>Exact start time<input name="scheduled_time" type="time" value={draft.scheduled_time || ''} onChange={updateField} /></label>
          </div>
          <div className="admin-form-actions">
            <button className="admin-primary" disabled={saveState === 'saving'} type="submit">
              {saveState === 'saving' ? 'Saving...' : 'Save all changes'}
            </button>
            {saveState === 'saved' && <span>Saved</span>}
            {!['idle', 'saving', 'saved'].includes(saveState) && <span className="admin-error-inline">{saveState}</span>}
          </div>
        </form>
      )}
    </article>
  );
}

function GeneralEnquiryCard({ enquiry, onSaved }) {
  const [status, setStatus] = useState(enquiry.status);
  const [adminNotes, setAdminNotes] = useState(enquiry.admin_notes || '');
  const [saveState, setSaveState] = useState('idle');

  async function saveEnquiry(event) {
    event.preventDefault();
    setSaveState('saving');
    const { data, error } = await supabase
      .from('enquiries')
      .update({ status, admin_notes: adminNotes.trim() || null })
      .eq('id', enquiry.id)
      .select()
      .single();

    if (error) {
      setSaveState(error.message);
      return;
    }

    setSaveState('saved');
    onSaved(data);
  }

  return (
    <article className="general-enquiry-card">
      <div className="general-enquiry-head">
        <div>
          <span className={`status-chip status-${enquiry.status}`}>{displayStatus(enquiry.status)}</span>
          <h3>{enquiry.customer_name}</h3>
          <p>{enquiry.service_type}{enquiry.suburb ? ` · ${enquiry.suburb}` : ''}</p>
        </div>
        <time>{formatLongDate(enquiry.created_at.slice(0, 10))}</time>
      </div>
      <div className="general-enquiry-contact">
        <a href={`tel:${enquiry.phone}`}>{enquiry.phone}</a>
        {enquiry.email && <a href={`mailto:${enquiry.email}`}>{enquiry.email}</a>}
      </div>
      {enquiry.details && <p className="general-enquiry-details">{enquiry.details}</p>}
      <form className="general-enquiry-manage" onSubmit={saveEnquiry}>
        <label>Status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <label>Private notes
          <input value={adminNotes} onChange={(event) => setAdminNotes(event.target.value)} />
        </label>
        <button className="admin-primary" disabled={saveState === 'saving'} type="submit">
          {saveState === 'saving' ? 'Saving...' : 'Save'}
        </button>
        {saveState === 'saved' && <span className="admin-saved">Saved</span>}
        {!['idle', 'saving', 'saved'].includes(saveState) && <span className="admin-error-inline">{saveState}</span>}
      </form>
    </article>
  );
}

export default function AdminPage({ navigate }) {
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const [adminEmail, setAdminEmail] = useState('');
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authorised, setAuthorised] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [generalEnquiries, setGeneralEnquiries] = useState([]);
  const [blockedTimes, setBlockedTimes] = useState([]);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [manualBooking, setManualBooking] = useState({ ...emptyBooking, scheduled_date: todayKey });
  const [blockedForm, setBlockedForm] = useState({ blocked_date: todayKey, blocked_time: '09:00', reason: '' });
  const [state, setState] = useState({ status: 'idle', message: '' });

  const calendarBookings = useMemo(
    () => bookings.filter((booking) => scheduledDate(booking) && !['rejected', 'cancelled'].includes(booking.status)),
    [bookings],
  );
  const selectedBookings = calendarBookings
    .filter((booking) => scheduledDate(booking) === selectedDate)
    .sort((a, b) => scheduledTime(a).localeCompare(scheduledTime(b)));
  const selectedBlocked = blockedTimes
    .filter((slot) => slot.blocked_date === selectedDate)
    .sort((a, b) => a.blocked_time.localeCompare(b.blocked_time));
  const pendingCount = bookings.filter((booking) => ['new', 'pending'].includes(booking.status)).length;
  const newEnquiryCount = generalEnquiries.filter((enquiry) => enquiry.status === 'new').length;
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const calendarDays = [
    ...Array(monthStart.getDay()).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const monthLabel = new Intl.DateTimeFormat('en-AU', { month: 'long', year: 'numeric' }).format(month);

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return undefined;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadWorkspace();
    else {
      setAuthorised(false);
      setBookings([]);
      setGeneralEnquiries([]);
      setBlockedTimes([]);
    }
  }, [session]);

  async function sendMagicLink(event) {
    event.preventDefault();
    if (!supabase) {
      setState({ status: 'error', message: 'Supabase is not configured yet.' });
      return;
    }

    setState({ status: 'loading', message: 'Sending sign-in link...' });
    const { error } = await supabase.auth.signInWithOtp({
      email: adminEmail,
      options: { emailRedirectTo: window.location.href },
    });
    setState(error
      ? { status: 'error', message: error.message }
      : { status: 'success', message: 'Check your email for the sign-in link.' });
  }

  async function loadWorkspace() {
    setState({ status: 'loading', message: 'Loading private workspace...' });
    const { data: adminRow, error: adminError } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (adminError || !adminRow) {
      setAuthorised(false);
      setState({ status: 'error', message: 'This email does not have admin access yet.' });
      return;
    }

    const [bookingResult, enquiryResult, blockedResult] = await Promise.all([
      supabase.from('bookings').select('*').order('created_at', { ascending: false }),
      supabase.from('enquiries').select('*').order('created_at', { ascending: false }),
      supabase.from('blocked_times').select('*').order('blocked_date').order('blocked_time'),
    ]);
    const error = bookingResult.error || enquiryResult.error || blockedResult.error;
    if (error) {
      setState({ status: 'error', message: adminErrorMessage(error) });
      return;
    }

    setAuthorised(true);
    setBookings(bookingResult.data ?? []);
    setGeneralEnquiries(enquiryResult.data ?? []);
    setBlockedTimes(blockedResult.data ?? []);
    setState({ status: 'idle', message: '' });
  }

  function updateManual(event) {
    const { name, value } = event.target;
    setManualBooking((current) => ({ ...current, [name]: value }));
  }

  async function addManualBooking(event) {
    event.preventDefault();
    setState({ status: 'loading', message: 'Adding booking...' });
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        ...bookingPayload(manualBooking),
        preferred_date: manualBooking.scheduled_date,
        preferred_time: manualBooking.scheduled_time,
        status: 'confirmed',
      })
      .select()
      .single();

    if (error) {
      setState({ status: 'error', message: error.message });
      return;
    }

    setBookings((current) => [data, ...current]);
    setSelectedDate(data.scheduled_date);
    setManualBooking({ ...emptyBooking, scheduled_date: data.scheduled_date });
    setState({ status: 'success', message: 'Booking added to the calendar.' });
  }

  function updateBlockedForm(event) {
    const { name, value } = event.target;
    setBlockedForm((current) => ({ ...current, [name]: value }));
  }

  async function addBlockedTime(event) {
    event.preventDefault();
    setState({ status: 'loading', message: 'Blocking time...' });
    const { data, error } = await supabase.from('blocked_times').insert(blockedForm).select().single();
    if (error) {
      setState({ status: 'error', message: adminErrorMessage(error) });
      return;
    }
    setBlockedTimes((current) => [...current, data]);
    setSelectedDate(data.blocked_date);
    setBlockedForm((current) => ({ ...current, reason: '' }));
    setState({ status: 'success', message: 'Time blocked.' });
  }

  async function removeBlockedTime(id) {
    const { error } = await supabase.from('blocked_times').delete().eq('id', id);
    if (error) {
      setState({ status: 'error', message: error.message });
      return;
    }
    setBlockedTimes((current) => current.filter((slot) => slot.id !== id));
  }

  function updateBooking(savedBooking) {
    setBookings((current) => current.map((booking) => (
      booking.id === savedBooking.id ? savedBooking : booking
    )));
  }

  function updateGeneralEnquiry(savedEnquiry) {
    setGeneralEnquiries((current) => current.map((enquiry) => (
      enquiry.id === savedEnquiry.id ? savedEnquiry : enquiry
    )));
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (!authReady) return <main className="admin-loading">Loading...</main>;
  if (session && !authorised && state.status === 'loading') {
    return <main className="admin-loading">Loading private workspace...</main>;
  }

  if (!session || !authorised) {
    return (
      <main className="admin-signin-page">
        <button className="admin-back" type="button" onClick={() => navigate('home')}>&larr; Public website</button>
        <form className="admin-login" onSubmit={sendMagicLink}>
          <ShieldCheck />
          <p className="admin-kicker">Private workspace</p>
          <h1>Booking manager</h1>
          <p>Sign in with an approved admin email to manage bookings.</p>
          <label>Admin email<input type="email" required value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} /></label>
          <button className="admin-primary" disabled={state.status === 'loading'} type="submit">Send sign-in link</button>
          {session && <button className="admin-secondary" type="button" onClick={signOut}>Sign out</button>}
          {state.message && <p className={`form-message ${state.status}`}>{state.message}</p>}
        </form>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <aside className="admin-side">
        <div className="admin-mini-brand"><strong>4 SONS</strong><span>Booking manager</span></div>
        <nav aria-label="Admin sections">
          <a href="#calendar">Private calendar</a>
          <a href="#add-booking">Add booking</a>
          <a href="#booking-requests">Booking requests</a>
          <a href="#general-enquiries">General enquiries</a>
          <a href="#blocked-times">Blocked times</a>
          <button type="button" onClick={() => navigate('home')}>Public website</button>
        </nav>
        <div className="admin-user">
          <span>Signed in as</span>
          <strong>{session.user.email}</strong>
          <button type="button" onClick={signOut}><LogOut /> Sign out</button>
        </div>
      </aside>

      <section className="admin-main">
        <header className="admin-heading">
          <div><p className="admin-kicker">Private workspace</p><h1>Bookings</h1></div>
          <div className="admin-stats">
            <div className="admin-stat"><strong>{pendingCount}</strong><span>Booking requests</span></div>
            <div className="admin-stat"><strong>{newEnquiryCount}</strong><span>New enquiries</span></div>
          </div>
        </header>

        {state.status === 'error' && (
          <div className="admin-alert"><strong>Something needs attention</strong><span>{state.message}</span></div>
        )}
        {state.status === 'success' && <div className="admin-success">{state.message}</div>}

        <section className="admin-section" id="calendar">
          <div className="admin-section-head">
            <div><p className="admin-kicker">Staff only</p><h2>Booking calendar</h2></div>
            <p>Customer details stay inside this private workspace.</p>
          </div>
          <div className="admin-calendar-layout">
            <div className="admin-calendar-scroll">
              <div className="admin-calendar">
                <div className="admin-month-switcher">
                  <button type="button" aria-label="Previous month" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>&larr;</button>
                  <strong>{monthLabel}</strong>
                  <button type="button" aria-label="Next month" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>&rarr;</button>
                </div>
                <div className="admin-weekdays">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}</div>
                <div className="admin-calendar-grid">
                  {calendarDays.map((day, index) => {
                    if (!day) return <span className="admin-calendar-blank" key={`blank-${index}`} />;
                    const dateKey = toDateKey(new Date(month.getFullYear(), month.getMonth(), day));
                    const dayBookings = calendarBookings.filter((booking) => scheduledDate(booking) === dateKey);
                    const dayBlocked = blockedTimes.filter((slot) => slot.blocked_date === dateKey);
                    return (
                      <button className={selectedDate === dateKey ? 'selected' : ''} type="button" key={dateKey} onClick={() => setSelectedDate(dateKey)}>
                        <strong>{day}</strong>
                        {dayBookings.slice(0, 3).map((booking) => (
                          <em key={booking.id}>{formatTime(scheduledTime(booking))} · {booking.customer_name || 'Booking'}</em>
                        ))}
                        {dayBlocked.length > 0 && <small>{dayBlocked.length} blocked time{dayBlocked.length === 1 ? '' : 's'}</small>}
                        {dayBookings.length > 3 && <small>+{dayBookings.length - 3} more</small>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <aside className="selected-day">
              <p className="admin-kicker">Selected day</p>
              <h3>{formatLongDate(selectedDate)}</h3>
              {selectedBookings.length === 0 && selectedBlocked.length === 0 && <p className="admin-empty-copy">No bookings or blocked times.</p>}
              {selectedBookings.map((booking) => (
                <article className="day-booking" key={booking.id}>
                  <div><strong>{formatTime(scheduledTime(booking))}</strong><span className={`status-chip status-${booking.status}`}>{displayStatus(booking.status)}</span></div>
                  <h4>{booking.customer_name || 'Unnamed customer'}</h4>
                  {booking.job_address && <p>{booking.job_address}{booking.suburb ? `, ${booking.suburb}` : ''}</p>}
                  {booking.service_type && <p>{booking.service_type}</p>}
                  {booking.add_ons && <p><b>Add-ons:</b> {booking.add_ons}</p>}
                  {booking.customer_notes && <p>{booking.customer_notes}</p>}
                  {booking.phone && <a href={`tel:${booking.phone}`}>{booking.phone}</a>}
                  {booking.email && <a href={`mailto:${booking.email}`}>{booking.email}</a>}
                  {booking.staff_notes && <div className="staff-note"><b>Staff notes</b>{booking.staff_notes}</div>}
                  <a className="manage-link" href={`#booking-${booking.id}`}>Manage booking ↓</a>
                </article>
              ))}
              {selectedBlocked.map((slot) => (
                <article className="day-blocked" key={slot.id}><strong>{formatTime(slot.blocked_time)}</strong><span>Blocked</span>{slot.reason && <p>{slot.reason}</p>}</article>
              ))}
            </aside>
          </div>
        </section>

        <section className="admin-section" id="add-booking">
          <div className="admin-section-head">
            <div><p className="admin-kicker">Manual entry</p><h2>Add a booking</h2></div>
            <p>Only the date and exact time are required. Everything else may be left blank.</p>
          </div>
          <form className="admin-form" onSubmit={addManualBooking}>
            <div className="schedule-fields required-schedule">
              <label>Date<input name="scheduled_date" type="date" required value={manualBooking.scheduled_date} onChange={updateManual} /></label>
              <label>Exact start time<input name="scheduled_time" type="time" required value={manualBooking.scheduled_time} onChange={updateManual} /></label>
            </div>
            <h3>Optional details</h3>
            <div className="admin-fields two-col">
              <label>Name<input name="customer_name" value={manualBooking.customer_name} onChange={updateManual} /></label>
              <label>Phone<input name="phone" value={manualBooking.phone} onChange={updateManual} /></label>
              <label>Email<input name="email" type="email" value={manualBooking.email} onChange={updateManual} /></label>
              <label>Suburb / area<input name="suburb" value={manualBooking.suburb} onChange={updateManual} /></label>
              <label className="full">Address<input name="job_address" value={manualBooking.job_address} onChange={updateManual} /></label>
              <label>Type of cleaning<input list="admin-services" name="service_type" value={manualBooking.service_type} onChange={updateManual} /></label>
              <label>Add-ons<input name="add_ons" value={manualBooking.add_ons} onChange={updateManual} /></label>
              <label className="full">House / property details<textarea name="customer_notes" value={manualBooking.customer_notes} onChange={updateManual} /></label>
              <label className="full">Private staff notes<textarea name="staff_notes" value={manualBooking.staff_notes} onChange={updateManual} /></label>
            </div>
            <button className="admin-primary" disabled={state.status === 'loading'} type="submit">Add booking to calendar</button>
          </form>
        </section>

        <section className="admin-section" id="booking-requests">
          <div className="admin-section-head">
            <div><p className="admin-kicker">Bookings</p><h2>Booking requests</h2></div>
            <p>Approve or disapprove requested cleaning dates.</p>
          </div>
          <div className="enquiry-list">
            {bookings.length === 0 ? <p className="admin-empty-copy">No booking requests yet.</p> : bookings.map((booking) => (
              <div id={`booking-${booking.id}`} key={booking.id}><AdminBookingCard booking={booking} onSaved={updateBooking} /></div>
            ))}
          </div>
        </section>

        <section className="admin-section" id="general-enquiries">
          <div className="admin-section-head">
            <div><p className="admin-kicker">Inbox</p><h2>General enquiries</h2></div>
            <p>Messages sent from the public enquiry form.</p>
          </div>
          <div className="general-enquiry-list">
            {generalEnquiries.length === 0 ? <p className="admin-empty-copy">No general enquiries yet.</p> : generalEnquiries.map((enquiry) => (
              <GeneralEnquiryCard enquiry={enquiry} key={enquiry.id} onSaved={updateGeneralEnquiry} />
            ))}
          </div>
        </section>

        <section className="admin-section" id="blocked-times">
          <div className="admin-section-head"><div><p className="admin-kicker">Availability</p><h2>Block an exact start time</h2></div></div>
          <form className="blocked-form" onSubmit={addBlockedTime}>
            <label>Date<input name="blocked_date" type="date" required value={blockedForm.blocked_date} onChange={updateBlockedForm} /></label>
            <label>Time<input name="blocked_time" type="time" required value={blockedForm.blocked_time} onChange={updateBlockedForm} /></label>
            <label>Private reason<input name="reason" value={blockedForm.reason} onChange={updateBlockedForm} /></label>
            <button className="admin-primary" type="submit">Block time</button>
          </form>
          <div className="blocked-list">
            {blockedTimes.length === 0 && <p className="admin-empty-copy">No blocked times.</p>}
            {blockedTimes.map((slot) => (
              <article key={slot.id}><div><strong>{formatLongDate(slot.blocked_date)} · {formatTime(slot.blocked_time)}</strong><span>{slot.reason || 'No private reason'}</span></div><button type="button" onClick={() => removeBlockedTime(slot.id)}>Remove</button></article>
            ))}
          </div>
        </section>

        <datalist id="admin-services">{serviceOptions.map((service) => <option value={service} key={service} />)}</datalist>
      </section>
    </main>
  );
}
