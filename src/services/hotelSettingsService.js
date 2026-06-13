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
      })
      .eq('id', 1);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[hotelSettings] update failed:', e);
    throw e;
  }
}
