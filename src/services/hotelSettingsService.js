import { supabase } from '../lib/supabase';

function mapSettings(s) {
  if (!s) return null;
  return {
    id: s.id,
    hotelName: s.hotel_name,
    tagline: s.tagline,
    location: s.location,
    airportDistance: s.airport_distance,
    phone: s.phone,
    email: s.email,
    checkInTime: s.check_in_time,
    checkOutTime: s.check_out_time,
    parkingInfo: s.parking_info,
    wifiInfo: s.wifi_info,
    restaurantHours: s.restaurant_hours,
    roomService: s.room_service,
    sinceYear: s.since_year,
    description: s.description,
    amenities: s.amenities || [],
    socialFacebook: s.social_facebook,
    socialInstagram: s.social_instagram,
    subaccountCode: s.subaccount_code || '',
    subaccountStatus: s.subaccount_status || '',
    settlementType: s.settlement_type || 'bank',
    settlementBank: s.settlement_bank || '',
    settlementAccountNumber: s.settlement_account_number || '',
    settlementAccountName: s.settlement_account_name || '',
    mobileMoneyNumber: s.mobile_money_number || '',
    mobileMoneyProvider: s.mobile_money_provider || '',
  };
}

export async function getHotelSettings() {
  try {
    const { data, error } = await supabase
      .from('hotel_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (error) throw error;
    return mapSettings(data);
  } catch (e) {
    console.error('[hotelSettings] get failed:', e);
    return null;
  }
}

export async function updateHotelSettings(settings) {
  try {
    const { error } = await supabase
      .from('hotel_settings')
      .update({
        hotel_name: settings.hotelName,
        tagline: settings.tagline,
        location: settings.location,
        airport_distance: settings.airportDistance,
        phone: settings.phone,
        email: settings.email,
        check_in_time: settings.checkInTime,
        check_out_time: settings.checkOutTime,
        parking_info: settings.parkingInfo,
        wifi_info: settings.wifiInfo,
        restaurant_hours: settings.restaurantHours,
        room_service: settings.roomService,
        since_year: settings.sinceYear,
        description: settings.description,
        amenities: settings.amenities,
        social_facebook: settings.socialFacebook,
        social_instagram: settings.socialInstagram,
        subaccount_code: settings.subaccountCode,
        subaccount_status: settings.subaccountStatus,
        settlement_type: settings.settlementType,
        settlement_bank: settings.settlementBank,
        settlement_account_number: settings.settlementAccountNumber,
        settlement_account_name: settings.settlementAccountName,
        mobile_money_number: settings.mobileMoneyNumber,
        mobile_money_provider: settings.mobileMoneyProvider,
      })
      .eq('id', 1);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[hotelSettings] update failed:', e);
    throw e;
  }
}

export async function createSubaccount(settings) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const payload = {
    settlement_type: settings.settlementType,
    settlement_bank: settings.settlementBank,
    settlement_account_number: settings.settlementAccountNumber,
    settlement_account_name: settings.settlementAccountName,
    mobile_money_number: settings.mobileMoneyNumber,
    mobile_money_provider: settings.mobileMoneyProvider,
    existing_subaccount_code: settings.subaccountCode || '',
  };

  const res = await fetch(`${supabaseUrl}/functions/v1/create-subaccount`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to create subaccount');
  }
  return data;
}
