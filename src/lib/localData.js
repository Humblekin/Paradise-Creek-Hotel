const KEYS = {
  rooms: 'paradise_creek_rooms',
  bookings: 'paradise_creek_bookings',
  users: 'paradise_creek_users',
  session: 'peek_creek_session',
  seeded: 'paradise_creek_seeded'
};

const roomsData = [
  { id:'r1', title:'Royal Deluxe Suite', category:'suite', description:'A magnificent suite featuring panoramic city views, king-sized canopy bed, separate living area with Italian marble floors, and a private balcony. The en-suite bathroom includes a deep soaking tub and rain shower.', pricePerNight:1200, maxGuests:3, images:['https://picsum.photos/seed/royal1/800/500','https://picsum.photos/seed/royal2/800/500','https://picsum.photos/seed/royal3/800/500'], amenities:['King Bed','City View','Mini Bar','Wi-Fi','Smart TV','Room Service','Jacuzzi','Balcony'], isAvailable:true },
  { id:'r2', title:'Ocean Breeze Deluxe', category:'deluxe', description:'Wake up to stunning ocean views in this elegantly appointed deluxe room. Features a plush queen bed, modern workspace, and a spa-inspired bathroom with premium amenities.', pricePerNight:750, maxGuests:2, images:['https://picsum.photos/seed/ocean1/800/500','https://picsum.photos/seed/ocean2/800/500','https://picsum.photos/seed/ocean3/800/500'], amenities:['Queen Bed','Ocean View','Mini Bar','Wi-Fi','TV','Coffee Maker'], isAvailable:true },
  { id:'r3', title:'Garden View Standard', category:'standard', description:'A comfortable and stylish room overlooking our lush tropical gardens. Perfect for the discerning traveler seeking quality and value with all essential amenities.', pricePerNight:400, maxGuests:2, images:['https://picsum.photos/seed/garden1/800/500','https://picsum.photos/seed/garden2/800/500','https://picsum.photos/seed/garden3/800/500'], amenities:['Double Bed','Garden View','Wi-Fi','TV','Air Conditioning'], isAvailable:true },
  { id:'r4', title:'Presidential Penthouse', category:'penthouse', description:'The pinnacle of luxury living. This two-story penthouse spans 200sqm with a private rooftop terrace, personal butler service, gourmet kitchen, and 360-degree views of the coastline.', pricePerNight:3500, maxGuests:4, images:['https://picsum.photos/seed/pent1/800/500','https://picsum.photos/seed/pent2/800/500','https://picsum.photos/seed/pent3/800/500','https://picsum.photos/seed/pent4/800/500'], amenities:['King Bed','Panoramic View','Private Terrace','Butler','Kitchen','Jacuzzi','Sauna','Wi-Fi'], isAvailable:true },
  { id:'r5', title:'Harbor Deluxe Room', category:'deluxe', description:'Watch the boats sail by from this beautifully designed harbor-view room. Features contemporary African art, premium bedding, and a spacious marble bathroom.', pricePerNight:850, maxGuests:2, images:['https://picsum.photos/seed/harbor1/800/500','https://picsum.photos/seed/harbor2/800/500'], amenities:['King Bed','Harbor View','Mini Bar','Wi-Fi','Smart TV','Bathrobe'], isAvailable:true },
  { id:'r6', title:'Classic Comfort Room', category:'standard', description:'Our classic room combines traditional elegance with modern convenience. Thoughtfully designed with warm tones and authentic local craftsmanship throughout.', pricePerNight:350, maxGuests:2, images:['https://picsum.photos/seed/classic1/800/500','https://picsum.photos/seed/classic2/800/500'], amenities:['Double Bed','Wi-Fi','TV','Air Conditioning','Desk'], isAvailable:false }
];

const usersData = [
  { id:'u1', name:'Ama Mensah', email:'ama@example.com', role:'user' },
  { id:'u2', name:'Kofi Asante', email:'kofi@example.com', role:'user' },
  { id:'admin', name:'Admin', email:'admin@aurum.com', role:'admin' }
];

export const testimonials = [
  { name:'Sarah Johnson', location:'London, UK', text:'An absolutely magnificent experience. The Presidential Penthouse took my breath away. Every detail was perfect, from the fresh flowers to the hand-written welcome note.', rating:5, avatar:'https://picsum.photos/seed/sarah/80/80' },
  { name:'David Osei', location:'Accra, Ghana', text:'Paradise Creek Hotel redefines luxury in West Africa. The spa treatments are world-class, and the staff anticipates your every need. Truly five-star service.', rating:5, avatar:'https://picsum.photos/seed/david/80/80' },
  { name:'Marie Dupont', location:'Paris, France', text:'From the moment I arrived, I felt like royalty. The ocean view from my deluxe room was mesmerizing. I will definitely return for another stay.', rating:5, avatar:'https://picsum.photos/seed/marie/80/80' },
  { name:'Chen Wei', location:'Shanghai, China', text:'The blend of African warmth and international luxury standards is remarkable. The fine dining restaurant serves some of the best cuisine I have had anywhere.', rating:4, avatar:'https://picsum.photos/seed/chen/80/80' }
];

export function initLocalData() {
  const seedIds = new Set(roomsData.map(r => r.id));
  const existingRooms = read(KEYS.rooms);
  const filtered = existingRooms.filter(r => !seedIds.has(r.id));
  // Re-add the pristine seed rooms, keeping any user-added rooms
  write(KEYS.rooms, [...roomsData, ...filtered]);

  const existingBookings = read(KEYS.bookings);
  const filteredBookings = existingBookings.filter(b => !seedIds.has(b.roomId));
  write(KEYS.bookings, filteredBookings);

  if (localStorage.getItem(KEYS.seeded)) return;
  localStorage.setItem(KEYS.users, JSON.stringify(usersData));
  localStorage.setItem(KEYS.seeded, 'true');
}

function read(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function write(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function getRooms() { return read(KEYS.rooms); }
export function getRoom(id) { return read(KEYS.rooms).find(r => r.id === id) || null; }

export function addRoom(data) {
  const rooms = read(KEYS.rooms);
  const room = {
    id: 'r' + Date.now(),
    title: data.title || '',
    description: data.description || '',
    category: data.category || 'standard',
    pricePerNight: Number(data.pricePerNight) || 0,
    maxGuests: Number(data.maxGuests) || 2,
    availableRooms: Number(data.availableRooms) || 1,
    images: Array.isArray(data.images) ? data.images : [],
    image: data.image || (Array.isArray(data.images) ? data.images[0] : '') || '',
    amenities: Array.isArray(data.amenities) ? data.amenities : [],
    isAvailable: data.isAvailable !== false
  };
  rooms.push(room);
  write(KEYS.rooms, rooms);
  return room;
}

export function updateRoom(id, data) {
  const rooms = read(KEYS.rooms);
  const idx = rooms.findIndex(r => r.id === id);
  if (idx === -1) return null;
  Object.assign(rooms[idx], data);
  if (rooms[idx].images && rooms[idx].images.length) {
    rooms[idx].image = rooms[idx].image || rooms[idx].images[0];
  }
  write(KEYS.rooms, rooms);
  return rooms[idx];
}

export function deleteRoom(id) {
  const rooms = read(KEYS.rooms).filter(r => r.id !== id);
  write(KEYS.rooms, rooms);
}

export function getBookings(userId) {
  return read(KEYS.bookings).filter(b => b.userId === userId);
}

export function getAllBookings() {
  return read(KEYS.bookings);
}

export function createBooking(data) {
  const bookings = read(KEYS.bookings);
  const booking = {
    id: 'b' + Date.now(),
    bookingRef: data.bookingRef || '',
    userId: data.userId || null,
    roomId: data.roomId || '',
    roomName: data.roomName || '',
    guestName: data.guestName || '',
    guestEmail: data.guestEmail || '',
    guestPhone: data.guestPhone || '',
    country: data.country || '',
    specialRequests: data.specialRequests || '',
    checkIn: data.checkIn || '',
    checkOut: data.checkOut || '',
    guests: Number(data.guests) || 1,
    totalPrice: Number(data.totalPrice) || 0,
    status: data.status || 'pending',
    paystackRef: data.paystackRef || '',
    paymentRef: data.paymentRef || data.paystackRef || ''
  };
  bookings.push(booking);
  write(KEYS.bookings, bookings);
  return booking;
}

export function updateBookingStatus(id, status) {
  const bookings = read(KEYS.bookings);
  const b = bookings.find(b => b.id === id);
  if (b) { b.status = status; write(KEYS.bookings, bookings); }
}

export function payBooking(id, paymentRef) {
  const bookings = read(KEYS.bookings);
  const b = bookings.find(b => b.id === id);
  if (b) { b.status = 'paid'; b.paymentRef = paymentRef; write(KEYS.bookings, bookings); }
}

export function checkRoomAvailability(roomId, checkIn, checkOut) {
  const bookings = read(KEYS.bookings);
  const conflict = bookings.some(b =>
    b.roomId === roomId &&
    b.status !== 'cancelled' &&
    new Date(checkIn) < new Date(b.checkOut) &&
    new Date(checkOut) > new Date(b.checkIn)
  );
  return !conflict;
}

export function getUsers() { return read(KEYS.users); }

export function getUserByEmail(email) {
  return read(KEYS.users).find(u => u.email === email) || null;
}

export function getUserById(id) {
  return read(KEYS.users).find(u => u.id === id) || null;
}

export function createUser(name, email, password, role = 'user') {
  const users = read(KEYS.users);
  if (users.find(u => u.email === email)) return null;
  const user = { id: 'u' + Date.now(), name, email, password, role };
  users.push(user);
  write(KEYS.users, users);
  return user;
}

export function getTestimonials() { return testimonials; }

export function submitContact(data) {
  const contacts = JSON.parse(localStorage.getItem('paradise_creek_contacts') || '[]');
  contacts.push({ ...data, id: 'c' + Date.now(), createdAt: new Date().toISOString() });
  localStorage.setItem('paradise_creek_contacts', JSON.stringify(contacts));
}
