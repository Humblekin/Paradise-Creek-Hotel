import { supabase } from '../lib/supabase';
import * as local from '../lib/localData';

function mapRoom(r) {
  if (!r) return null;
  return {
    id: r.id,
    title: r.title,
    description: r.description || '',
    category: r.category || 'standard',
    pricePerNight: Number(r.price_per_night) || 0,
    maxGuests: r.max_guests || 2,
    availableRooms: r.available_rooms || 1,
    images: r.images || [],
    image: (r.images && r.images[0]) || '',
    amenities: r.amenities || [],
    isAvailable: r.is_available !== false,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

function toSnake(data) {
  return {
    title: data.title,
    description: data.description,
    category: data.category,
    price_per_night: Number(data.pricePerNight),
    max_guests: Number(data.maxGuests),
    available_rooms: Number(data.availableRooms) || 1,
    images: data.images || [],
    amenities: data.amenities || [],
    is_available: data.isAvailable !== false
  };
}

let supabaseReady = false;
let lastCheckTime = 0;
const CHECK_INTERVAL_MS = 30_000;

async function checkSupabase() {
  const now = Date.now();
  if (supabaseReady && (now - lastCheckTime) < CHECK_INTERVAL_MS) return true;

  try {
    const { data, error } = await supabase.from('rooms').select('id').limit(1);
    if (error) {
      console.warn('[roomService] checkSupabase error:', error.message);
      supabaseReady = false;
    } else {
      supabaseReady = Array.isArray(data);
    }
  } catch (e) {
    console.warn('[roomService] checkSupabase exception:', e);
    supabaseReady = false;
  }
  lastCheckTime = now;
  return supabaseReady;
}

async function sb(op) {
  try {
    if (await checkSupabase()) return await op();
  } catch (e) {
    console.error('[roomService] Supabase operation failed:', e);
  }
  return { __fallback: true };
}

function isFallback(r) {
  return r && r.__fallback === true;
}

export async function getRooms() {
  const r = await sb(async () => {
    const { data } = await supabase
      .from('rooms')
      .select('*')
      .order('created_at', { ascending: false });
    return (data || []).map(mapRoom);
  });
  if (isFallback(r)) return local.getRooms();
  return r;
}

export async function getRoom(id) {
  const r = await sb(async () => {
    const { data } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', id)
      .single();
    return mapRoom(data);
  });
  if (isFallback(r)) return local.getRoom(id);
  return r;
}

export async function addRoom(data) {
  const r = await sb(async () => {
    const { data: result, error } = await supabase
      .from('rooms')
      .insert(toSnake(data))
      .select()
      .single();
    if (error) throw error;
    return mapRoom(result);
  });
  if (isFallback(r)) return local.addRoom(data);
  return r;
}

export async function updateRoom(id, data) {
  const r = await sb(async () => {
    const { data: result, error } = await supabase
      .from('rooms')
      .update(toSnake(data))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapRoom(result);
  });
  if (isFallback(r)) return local.updateRoom(id, data);
  return r;
}

export async function deleteRoom(id) {
  const r = await sb(async () => {
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  });
  if (isFallback(r)) return local.deleteRoom(id);
  return r;
}

export async function checkRoomAvailability(roomId, checkIn, checkOut) {
  const r = await sb(async () => {
    const { data } = await supabase
      .from('bookings')
      .select('id')
      .eq('room_id', roomId)
      .not('status', 'in', '("cancelled","checked_out")')
      .lt('check_in', checkOut)
      .gt('check_out', checkIn)
      .limit(1);
    return !data || data.length === 0;
  });
  if (isFallback(r)) return local.checkRoomAvailability(roomId, checkIn, checkOut);
  return r;
}
