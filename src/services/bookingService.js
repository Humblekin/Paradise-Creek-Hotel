import { supabase } from '../lib/supabase';
import * as local from '../lib/localData';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function generateBookingRef() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `HTL-${y}${m}${day}-${rand}`;
}

function mapBooking(b) {
  if (!b) return null;
  return {
    id: b.id,
    bookingRef: b.booking_reference || '',
    userId: b.user_id || null,
    roomId: b.room_id,
    roomName: b.room_name || '',
    guestName: b.guest_name || '',
    guestEmail: b.guest_email || '',
    guestPhone: b.guest_phone || '',
    country: b.country || '',
    specialRequests: b.special_requests || '',
    checkIn: b.check_in,
    checkOut: b.check_out,
    guests: b.guests,
    totalPrice: Number(b.total_price) || 0,
    status: b.status || 'pending',
    paystackRef: b.paystack_ref || '',
    paymentRef: b.payment_ref || b.paystack_ref || '',
    createdAt: b.created_at,
    paidAt: b.paid_at,
    checkedInAt: b.checked_in_at,
    checkedOutAt: b.checked_out_at
  };
}

function isLocalRoomId(roomId) {
  return roomId && typeof roomId === 'string' && !UUID_RE.test(roomId);
}

// ---------- Supabase connectivity check ----------
// Re-check periodically instead of caching forever, so transient failures don't
// permanently lock users into localStorage mode.
let supabaseReady = false;
let lastCheckTime = 0;
const CHECK_INTERVAL_MS = 30_000; // re-check every 30 seconds after a failure

async function checkSupabase() {
  const now = Date.now();
  // If we already know it's ready and checked recently, skip
  if (supabaseReady && (now - lastCheckTime) < CHECK_INTERVAL_MS) return true;

  try {
    const { data, error } = await supabase.from('rooms').select('id').limit(1);
    if (error) {
      console.warn('[bookingService] checkSupabase error:', error.message);
      supabaseReady = false;
    } else {
      supabaseReady = Array.isArray(data);
    }
  } catch (e) {
    console.warn('[bookingService] checkSupabase exception:', e);
    supabaseReady = false;
  }
  lastCheckTime = now;
  return supabaseReady;
}

async function sb(op) {
  try {
    if (await checkSupabase()) return await op();
  } catch (e) {
    console.error('[bookingService] Supabase operation failed:', e);
  }
  return { __fallback: true };
}

function isFallback(r) {
  return r && r.__fallback === true;
}

// ---------- Helpers ----------

function toSnakeBooking(data, bookingRef) {
  return {
    user_id: data.userId || null,
    room_id: data.roomId,
    room_name: data.roomName || '',
    user_email: data.guestEmail || '',
    guest_name: data.guestName || '',
    guest_email: data.guestEmail || '',
    guest_phone: data.guestPhone || '',
    country: data.country || '',
    special_requests: data.specialRequests || '',
    booking_reference: bookingRef,
    check_in: data.checkIn,
    check_out: data.checkOut,
    guests: Number(data.guests) || 1,
    total_price: Number(data.totalPrice) || 0,
    status: data.status || 'pending',
    paystack_ref: data.paystackRef || '',
    payment_ref: data.paystackRef || '',
  };
}

function mapInsertResult(inserted, data, bookingRef) {
  if (!inserted) return null;
  return {
    id: inserted.id,
    bookingRef: inserted.booking_reference || bookingRef,
    userId: inserted.user_id || data.userId || null,
    roomId: inserted.room_id,
    roomName: inserted.room_name || '',
    guestName: inserted.guest_name || '',
    guestEmail: inserted.guest_email || '',
    guestPhone: inserted.guest_phone || '',
    country: inserted.country || '',
    specialRequests: inserted.special_requests || '',
    checkIn: inserted.check_in,
    checkOut: inserted.check_out,
    guests: inserted.guests,
    totalPrice: Number(inserted.total_price) || 0,
    status: inserted.status || 'pending',
    paystackRef: inserted.paystack_ref || '',
    paymentRef: inserted.payment_ref || inserted.paystack_ref || '',
  };
}

// ---------- Get the current Supabase auth user ID ----------
async function getAuthUserId() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  } catch {
    return null;
  }
}

// ---------- Direct insert (for authenticated users) ----------
async function tryDirectInsert(data, bookingRef, authUserId) {
  const record = toSnakeBooking(data, bookingRef);

  // Ensure user_id matches the actual Supabase session user
  // This is critical: RLS policy requires auth.uid() = user_id
  if (authUserId) {
    record.user_id = authUserId;
  }

  console.log('[createBooking] Attempting direct insert with record:', {
    ...record,
    user_id: record.user_id ? record.user_id.substring(0, 8) + '...' : null,
  });

  const { data: inserted, error } = await supabase
    .from('bookings')
    .insert(record)
    .select()
    .maybeSingle();

  if (error) {
    console.error('[createBooking] Direct insert error:', error.message, error.details, error.hint);
    throw error;
  }
  return mapInsertResult(inserted, data, bookingRef);
}

// ---------- RPC insert (uses security definer, handles conflict prevention) ----------
async function tryRpc(data, bookingRef) {
  const params = {
    p_room_id: data.roomId,
    p_room_name: data.roomName || '',
    p_guest_name: data.guestName || '',
    p_guest_email: data.guestEmail || '',
    p_guest_phone: data.guestPhone || '',
    p_country: data.country || '',
    p_special_requests: data.specialRequests || '',
    p_booking_reference: bookingRef,
    p_check_in: data.checkIn,
    p_check_out: data.checkOut,
    p_guests: Number(data.guests) || 1,
    p_total_price: Number(data.totalPrice) || 0,
    p_status: data.status || 'pending',
    p_paystack_ref: data.paystackRef || '',
  };

  console.log('[createBooking] Attempting RPC create_booking_safe');

  const { data: result, error } = await supabase.rpc('create_booking_safe', params);
  if (error) {
    console.error('[createBooking] RPC error:', error.message, error.details, error.hint);
    throw error;
  }
  if (!result || !result.success) {
    const errMsg = result?.error || 'Booking failed';
    console.error('[createBooking] RPC returned failure:', errMsg);
    throw new Error(errMsg);
  }

  console.log('[createBooking] RPC succeeded:', result);

  return {
    id: result.booking_id,
    bookingRef: result.booking_reference || bookingRef,
    userId: data.userId || null,
    roomId: data.roomId,
    roomName: data.roomName || '',
    guestName: data.guestName || '',
    guestEmail: data.guestEmail || '',
    guestPhone: data.guestPhone || '',
    country: data.country || '',
    specialRequests: data.specialRequests || '',
    checkIn: data.checkIn,
    checkOut: data.checkOut,
    guests: Number(data.guests) || 1,
    totalPrice: Number(data.totalPrice) || 0,
    status: result.status || data.status || 'pending',
    paystackRef: data.paystackRef || '',
    paymentRef: data.paystackRef || '',
  };
}

// ================================================================
// CREATE BOOKING — main entry point
// ================================================================
export async function createBooking(data) {
  const bookingRef = generateBookingRef();

  // If the room ID is a short localStorage-style ID, skip Supabase entirely
  if (isLocalRoomId(data.roomId)) {
    console.log('[createBooking] Local room ID detected, saving to localStorage');
    return local.createBooking({ ...data, bookingRef });
  }

  // Check if Supabase is reachable
  const isConnected = await checkSupabase();
  if (!isConnected) {
    console.warn('[createBooking] Supabase not reachable, saving to localStorage');
    return local.createBooking({ ...data, bookingRef });
  }

  // Get the current authenticated user ID from the actual Supabase session
  const authUserId = await getAuthUserId();
  console.log('[createBooking] Auth user ID:', authUserId ? authUserId.substring(0, 8) + '...' : 'none (guest)');

  // Ensure the data.userId matches the session — this prevents RLS mismatches
  const bookingData = { ...data };
  if (authUserId) {
    bookingData.userId = authUserId;
  } else {
    // Guest booking — user_id must be null
    bookingData.userId = null;
  }

  // 1. Try RPC first — it's safer (row-level locking, conflict prevention)
  try {
    const result = await tryRpc(bookingData, bookingRef);
    console.log('[createBooking] ✅ RPC succeeded — booking saved to Supabase');
    return result;
  } catch (e) {
    console.warn('[createBooking] RPC failed:', e?.message || e);
  }

  // 2. Fallback: try direct insert
  try {
    const result = await tryDirectInsert(bookingData, bookingRef, authUserId);
    console.log('[createBooking] ✅ Direct insert succeeded — booking saved to Supabase');
    return result;
  } catch (e) {
    console.warn('[createBooking] Direct insert failed:', e?.message || e);
  }

  // 3. Last resort: localStorage
  console.warn('[createBooking] ⚠️ All Supabase methods failed — saving to localStorage as fallback');
  return local.createBooking({ ...bookingData, bookingRef });
}

// ================================================================
// READ OPERATIONS
// ================================================================

export async function getBookings(userId) {
  // Also get the real auth user ID to query correctly
  const authUserId = await getAuthUserId();
  const queryId = authUserId || userId;

  const r = await sb(async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', queryId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[getBookings] error:', error.message);
      throw error;
    }
    return (data || []).map(mapBooking);
  });
  if (isFallback(r)) return local.getBookings(userId);
  return r;
}

export async function getBookingsByEmail(email) {
  const r = await sb(async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('guest_email', email)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[getBookingsByEmail] error:', error.message);
      throw error;
    }
    return (data || []).map(mapBooking);
  });
  if (isFallback(r)) return [];
  return r;
}

export async function getBookingByRef(ref) {
  const r = await sb(async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('booking_reference', ref)
      .maybeSingle();
    if (error) {
      console.error('[getBookingByRef] error:', error.message);
      throw error;
    }
    return mapBooking(data);
  });
  if (isFallback(r)) return null;
  return r;
}

export async function getAllBookings() {
  const r = await sb(async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[getAllBookings] error:', error.message);
      throw error;
    }
    const supabaseData = (data || []).map(mapBooking);
    // Merge with localStorage data (covers fallback bookings)
    const localData = local.getAllBookings();
    if (!localData.length) return supabaseData;
    const seen = new Set(supabaseData.map((b) => b.id));
    return [...supabaseData, ...localData.filter((b) => !seen.has(b.id))];
  });
  if (isFallback(r)) return local.getAllBookings();
  return r;
}

export async function searchBookings(query) {
  const term = `%${query}%`;
  const r = await sb(async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .or(`booking_reference.ilike.${term},guest_email.ilike.${term},guest_phone.ilike.${term},guest_name.ilike.${term}`)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[searchBookings] error:', error.message);
      throw error;
    }
    return (data || []).map(mapBooking);
  });
  if (isFallback(r)) return local.getAllBookings().filter(b =>
    b.bookingRef?.includes(query) ||
    b.guestEmail?.includes(query) ||
    b.guestPhone?.includes(query) ||
    b.guestName?.includes(query)
  );
  return r;
}

// ================================================================
// UPDATE OPERATIONS
// ================================================================

export async function updateBookingStatus(id, status) {
  const r = await sb(async () => {
    const updates = { status };
    if (status === 'checked_in') updates.checked_in_at = new Date().toISOString();
    if (status === 'checked_out') updates.checked_out_at = new Date().toISOString();
    const { error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', id);
    if (error) {
      console.error('[updateBookingStatus] error:', error.message);
      throw error;
    }
    return true;
  });
  if (isFallback(r)) return local.updateBookingStatus(id, status);
  return r;
}

export async function payBooking(id, paymentRef) {
  const r = await sb(async () => {
    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'paid',
        payment_ref: paymentRef,
        paid_at: new Date().toISOString()
      })
      .eq('id', id);
    if (error) {
      console.error('[payBooking] error:', error.message);
      throw error;
    }
    return true;
  });
  if (isFallback(r)) return local.payBooking(id, paymentRef);
  return r;
}

// ================================================================
// CONTACTS
// ================================================================

export async function submitContact(data) {
  const r = await sb(async () => {
    const { error } = await supabase.from('contacts').insert({
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message
    });
    if (error) {
      console.error('[submitContact] error:', error.message);
      throw error;
    }
    return true;
  });
  if (isFallback(r)) return local.submitContact(data);
  return r;
}
