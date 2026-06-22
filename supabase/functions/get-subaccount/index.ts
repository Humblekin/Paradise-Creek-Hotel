import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Supabase credentials not configured' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data, error } = await supabase
      .from('hotel_settings')
      .select('subaccount_code')
      .eq('id', 1)
      .maybeSingle()

    if (error) {
      console.error('[get-subaccount] DB error:', error)
      return new Response(JSON.stringify({ error: 'Database query failed' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    return new Response(
      JSON.stringify({ subaccountCode: data?.subaccount_code || '' }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (err) {
    console.error('[get-subaccount] Error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
  }
})
