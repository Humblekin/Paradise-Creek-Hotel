import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY') || ''

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  try {
    if (!PAYSTACK_SECRET_KEY) {
      return new Response(JSON.stringify({ verified: false, error: 'PAYSTACK_SECRET_KEY not configured' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    const { reference } = await req.json()
    if (!reference) {
      return new Response(JSON.stringify({ verified: false, error: 'Missing payment reference' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    const result = await paystackRes.json()

    if (!paystackRes.ok || !result.status) {
      console.error('[verify-payment] Paystack error:', result)
      return new Response(
        JSON.stringify({ verified: false, error: result.message || 'Verification failed' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const tx = result.data
    const verified = tx.status === 'success'

    return new Response(
      JSON.stringify({
        verified,
        amount: tx.amount / 100,
        currency: tx.currency,
        status: tx.status,
        paidAt: tx.paid_at,
        gatewayResponse: tx.gateway_response,
        reference: tx.reference,
      }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (err) {
    console.error('[verify-payment] Error:', err)
    return new Response(JSON.stringify({ verified: false, error: 'Internal error' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
  }
})
