import { supabase } from '../lib/supabase';
import * as local from '../lib/localData';

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

let supabaseReady = false;
let readyChecked = false;

async function checkSupabase() {
  if (readyChecked) return supabaseReady;
  readyChecked = true;
  try {
    // Use rooms table (always publicly readable) instead of bookings (RLS-restricted)
    const { data, error } = await supabase.from('rooms').select('id').limit(1);
    if (error) { console.error('[bookingService] checkSupabase error:', error); supabaseReady = false; return false; }
    supabaseReady = Array.isArray(data);
  } catch (e) {
    console.error('[bookingService] checkSupabase exception:', e);
    supabaseReady = false;
  }
  return supabaseReady;
}

async function sb(op) {
  try {
    if (supabaseReady || await checkSupabase()) return await op();
  } catch (e) { console.error('[bookingService] Supabase operation failed:', e); }
  return { __fallback: true };
}

function isFallback(r) {
  return r && r.__fallback === true;
}

export async function createBooking(data) {
  const bookingRef = generateBookingRef();
  const r = await sb(async () => {
    const { data: result, error } = await supabase.rpc('create_booking_safe', {
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
    });
    if (error) throw error;
    if (!result || !result.success) throw new Error(result?.error || 'Booking failed');
    return {
      id: result.booking_id,
      bookingRef: result.booking_reference || bookingRef,
      userId: null,
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
      paymentRef: '',
    };
  });
  if (isFallback(r)) return local.createBooking({ ...data, bookingRef });
  return r;
}

export async function getBookings(userId) {
  const r = await sb(async () => {
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return (data || []).map(mapBooking);
  });
  if (isFallback(r)) return local.getBookings(userId);
  return r;
}

export async function getBookingsByEmail(email) {
  const r = await sb(async () => {
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('guest_email', email)
      .order('created_at', { ascending: false });
    return (data || []).map(mapBooking);
  });
  if (isFallback(r)) return [];
  return r;
}

export async function getBookingByRef(ref) {
  const r = await sb(async () => {
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('booking_reference', ref)
      .maybeSingle();
    return mapBooking(data);
  });
  if (isFallback(r)) return null;
  return r;
}

export async function getAllBookings() {
  const r = await sb(async () => {
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });
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
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .or(`booking_reference.ilike.${term},guest_email.ilike.${term},guest_phone.ilike.${term},guest_name.ilike.${term}`)
      .order('created_at', { ascending: false });
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

export async function updateBookingStatus(id, status) {
  const r = await sb(async () => {
    const updates = { status };
    if (status === 'checked_in') updates.checked_in_at = new Date().toISOString();
    if (status === 'checked_out') updates.checked_out_at = new Date().toISOString();
    const { error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
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
    if (error) throw error;
    return true;
  });
  if (isFallback(r)) return local.payBooking(id, paymentRef);
  return r;
}

export async function submitContact(data) {
  const r = await sb(async () => {
    const { error } = await supabase.from('contacts').insert({
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message
    });
    if (error) throw error;
    return true;
  });
  if (isFallback(r)) return local.submitContact(data);
  return r;
}
