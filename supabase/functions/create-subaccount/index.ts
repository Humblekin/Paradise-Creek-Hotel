import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

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
      return new Response(JSON.stringify({ error: 'PAYSTACK_SECRET_KEY not configured' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    const body = await req.json()
    const {
      settlement_type,
      settlement_bank,
      settlement_account_number,
      settlement_account_name,
      mobile_money_number,
      mobile_money_provider,
      existing_subaccount_code,
    } = body

    // Validate
    if (settlement_type === 'bank') {
      if (!settlement_bank || !settlement_account_number || !settlement_account_name) {
        return new Response(JSON.stringify({ error: 'Bank name, account number, and account name are required for bank settlement' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
      }
    } else if (settlement_type === 'mobile_money') {
      if (!mobile_money_number || !mobile_money_provider) {
        return new Response(JSON.stringify({ error: 'Mobile money number and provider are required for mobile money settlement' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
      }
    } else {
      return new Response(JSON.stringify({ error: 'settlement_type must be "bank" or "mobile_money"' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    // Build the Paystack subaccount payload
    // No percentage_charge or transaction_charge — 100% goes to the hotel
    const payload: Record<string, unknown> = {
      business_name: 'Paradise Creek Hotel',
      settlement_type,
      percentage_charge: 0,
      description: 'Paradise Creek Hotel settlement account',
    }

    if (settlement_type === 'bank') {
      payload.settlement_bank = settlement_bank
      payload.account_number = settlement_account_number
      payload.account_name = settlement_account_name
    } else {
      payload.mobile_money_number = mobile_money_number
      payload.mobile_money_provider = mobile_money_provider
    }

    let subaccountCode = ''
    let paystackResponse: Response

    if (existing_subaccount_code) {
      // Update existing subaccount
      paystackResponse = await fetch(`https://api.paystack.co/subaccount/${existing_subaccount_code}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      subaccountCode = existing_subaccount_code
    } else {
      // Create new subaccount
      paystackResponse = await fetch('https://api.paystack.co/subaccount', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
    }

    const paystackResult = await paystackResponse.json()

    if (!paystackResponse.ok || !paystackResult.status) {
      console.error('[create-subaccount] Paystack error:', paystackResult)
      return new Response(
        JSON.stringify({ error: paystackResult.message || 'Failed to create/update subaccount' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // If created, get the new subaccount_code
    if (!existing_subaccount_code) {
      subaccountCode = paystackResult.data.subaccount_code
    }

    // Save subaccount_code and status to hotel_settings
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      const { error: dbError } = await supabase
        .from('hotel_settings')
        .update({
          subaccount_code: subaccountCode,
          subaccount_status: 'active',
          settlement_type,
          settlement_bank: settlement_type === 'bank' ? settlement_bank : '',
          settlement_account_number: settlement_type === 'bank' ? settlement_account_number : '',
          settlement_account_name: settlement_type === 'bank' ? settlement_account_name : '',
          mobile_money_number: settlement_type === 'mobile_money' ? mobile_money_number : '',
          mobile_money_provider: settlement_type === 'mobile_money' ? mobile_money_provider : '',
        })
        .eq('id', 1)

      if (dbError) {
        console.error('[create-subaccount] DB save failed:', dbError)
        return new Response(
          JSON.stringify({ error: 'Subaccount created but failed to save to database', subaccountCode }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        )
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        subaccountCode,
        message: existing_subaccount_code ? 'Subaccount updated successfully' : 'Subaccount created successfully',
      }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (err) {
    console.error('[create-subaccount] Error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
  }
})
