import { supabase } from '../lib/supabase';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const SANITIZE_RE = /[^a-zA-Z0-9._-]/g;

export async function uploadRoomImage(file) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Allowed: JPEG, PNG, WebP, GIF');
  }
  if (file.size > MAX_SIZE) {
    throw new Error('File too large. Maximum 5MB');
  }

  const ext = file.name.split('.').pop();
  const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `room_images/${safeName}`;

  const { error } = await supabase.storage
    .from('rooms')
    .upload(path, file, { upsert: false, contentType: file.type });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('rooms')
    .getPublicUrl(path);

  return publicUrl;
}

export async function deleteRoomImage(url) {
  const path = url.split('/rooms/').pop();
  if (!path || /\.\./.test(path)) return;
  await supabase.storage.from('rooms').remove([path]);
}
