import { supabase } from '../lib/supabase';

async function fetchRole(userId) {
  // Use security-definer RPC (bypasses RLS) to get the user's role from the DB
  try {
    const { data } = await supabase.rpc('get_my_role');
    if (data) return data;
  } catch (e) {
    console.warn('get_my_role RPC failed:', e);
  }
  // Fallback: direct profile query (requires appropriate RLS)
  try {
    const { data: p } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    if (p?.role) return p.role;
  } catch (e) {
    console.warn('Profile role query failed:', e);
  }
  return 'user';
}

async function fetchProfile(userId) {
  try {
    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    return p;
  } catch (e) {
    console.warn('Failed to fetch profile from profiles table:', e);
    return null;
  }
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data?.user) return null;

  const user = data.user;
  let profile = await fetchProfile(user.id);
  let role = await fetchRole(user.id);

  console.log('signIn result:', { profile, role });

  return {
    id: user.id,
    name: profile?.full_name || user.email?.split('@')[0] || 'User',
    email: user.email,
    role
  };
}

export async function signUp(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } }
  });
  if (error || !data?.user) return null;

  try {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      full_name: fullName || email.split('@')[0],
      email,
      role: 'user'
    }, { onConflict: 'id' });
  } catch (e) {
    console.warn('Failed to upsert profile into profiles table:', e);
  }

  return {
    id: data.user.id,
    name: fullName || email.split('@')[0],
    email,
    role: 'user'
  };
}

export async function logOut() {
  await supabase.auth.signOut();
}

export function onAuthChange(callback) {
  let subscription = null;

  try {
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = session.user;
        let profile = await fetchProfile(user.id);
        let role = await fetchRole(user.id);

        console.log('onAuthChange result:', { event, profile, role });

        callback({
          id: user.id,
          name: profile?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email,
          role
        });
      } else {
        callback(null);
      }
    });
    subscription = data.subscription;
  } catch (e) {
    console.warn('Failed to set up Supabase auth listener:', e);
    callback(null);
  }

  return () => {
    if (subscription) subscription?.unsubscribe();
  };
}

export async function getUserProfile(uid) {
  let profile = await fetchProfile(uid);
  if (profile) return { id: profile.id, name: profile.full_name, email: profile.email, role: profile.role };
  return null;
}

export async function getAllProfiles() {
  const { data } = await supabase.from('profiles').select('*');
  return data || [];
}
