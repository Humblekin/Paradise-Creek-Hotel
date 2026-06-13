import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY') || ''
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || ''
const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL') || ADMIN_EMAIL

function buildHtml(record: Record<string, unknown>) {
  const fields: Record<string, string> = {
    'Booking Ref': (record.booking_reference as string) || '',
    'Guest Name': (record.guest_name as string) || '',
    'Guest Email': (record.guest_email as string) || '',
    'Guest Phone': (record.guest_phone as string) || '',
    'Room': (record.room_name as string) || '',
    'Check In': (record.check_in as string) || '',
    'Check Out': (record.check_out as string) || '',
    'Guests': String(record.guests ?? ''),
    'Total': `GHS ${record.total_price ?? ''}`,
    'Status': (record.status as string) || '',
  }

  const rows = Object.entries(fields)
    .filter(([_, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:6px 12px;border:1px solid #ddd;font-weight:600">${k}</td><td style="padding:6px 12px;border:1px solid #ddd">${v}</td></tr>`)
    .join('')

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:24px;text-align:center">
        <h1 style="color:#d4a853;margin:0">Paradise Creek Hotel</h1>
      </div>
      <div style="padding:24px;background:#fff">
        <h2 style="margin-top:0">New Booking Received</h2>
        <table style="width:100%;border-collapse:collapse">${rows}</table>
        <p style="margin-top:24px;color:#666;font-size:13px">
          <a href="${Deno.env.get('PUBLIC_SITE_URL') || ''}/dashboard" style="color:#d4a853">View in Dashboard</a>
        </p>
      </div>
    </div>
  `
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  try {
    const body: unknown = await req.json()

    const record = body && typeof body === 'object' && 'record' in (body as object)
      ? (body as { record: Record<string, unknown> }).record
      : (body as Record<string, unknown>)

    if (!BREVO_API_KEY) {
      console.error('[notify-booking] BREVO_API_KEY not set')
      return new Response(JSON.stringify({ error: 'BREVO_API_KEY not configured' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    if (!ADMIN_EMAIL) {
      console.error('[notify-booking] ADMIN_EMAIL not set')
      return new Response(JSON.stringify({ error: 'ADMIN_EMAIL not configured' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    const html = buildHtml(record)
    const ref = (record.booking_reference as string) || 'New Booking'

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Paradise Creek Hotel', email: SENDER_EMAIL },
        to: [{ email: ADMIN_EMAIL, name: 'Admin' }],
        subject: `New Booking: ${ref}`,
        htmlContent: html,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[notify-booking] Brevo error:', res.status, err)
      return new Response(JSON.stringify({ error: 'Email send failed' }), { status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    console.log('[notify-booking] Email sent for', ref)
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } })
  } catch (err) {
    console.error('[notify-booking] Error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
  }
})
