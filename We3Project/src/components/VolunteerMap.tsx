import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { Navigation, Car, Bike, ArrowRight, MapPinned, HeartHandshake } from 'lucide-react';
import DonationRequestForm from './VolunteerMap/DonationRequestForm';
import { useToast } from './Toast';

// Fix for Leaflet marker icons in React
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface NGO {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  type?: string;
  verified?: boolean;
}

const fallbackNgos: NGO[] = [
  { id: 'saylani', name: 'Saylani Welfare Trust', latitude: 24.8825, longitude: 67.0673, city: 'Karachi', address: 'Bahadurabad, Karachi', type: 'ngo', verified: true },
  { id: 'edhi', name: 'Edhi Foundation', latitude: 24.8519, longitude: 67.0011, city: 'Karachi', address: 'Mithadar, Karachi', type: 'ngo', verified: true },
  { id: 'jdc', name: 'JDC Foundation', latitude: 24.8938, longitude: 67.0781, city: 'Karachi', address: 'Numaish, Karachi', type: 'ngo', verified: true },
  { id: 'alkhidmat', name: 'Al-Khidmat Foundation', latitude: 24.8628, longitude: 67.0402, city: 'Karachi', address: 'Gulshan-e-Iqbal, Karachi', type: 'ngo', verified: true },
  { id: 'redcrescent', name: 'Pakistan Red Crescent', latitude: 24.8714, longitude: 67.0524, city: 'Karachi', address: 'Garden, Karachi', type: 'ngo', verified: true },
  { id: 'shaukat', name: 'Shaukat Khanum Hospital', latitude: 31.5204, longitude: 74.3587, city: 'Lahore', address: 'Shaukat Khanum, Lahore', type: 'hospital', verified: true },
  { id: 'sundus', name: 'Sundus Foundation', latitude: 24.8621, longitude: 67.0332, city: 'Karachi', address: 'North Nazimabad, Karachi', type: 'ngo', verified: true },
  { id: 'ripple', name: 'Ripple of Hope', latitude: 33.6844, longitude: 73.0479, city: 'Islamabad', address: 'F-6, Islamabad', type: 'school', verified: true },
];

const RecenterMap = ({ lat, lng }: { lat: number, lng: number }) => {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], 13);
    }
  }, [lat, lng, map]);
  return null;
};

const VolunteerMap: React.FC = () => {
  const [ngos, setNgos] = useState<NGO[]>([]);
  const [selectedNgo, setSelectedNgo] = useState<NGO | null>(fallbackNgos[0]);
  const [transport, setTransport] = useState('google_maps');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    // Fetch NGOs
    const q = query(collection(db, 'ngos'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ngoList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as NGO[];

      const mergedNgos = ngoList.length ? ngoList : fallbackNgos;
      setNgos(mergedNgos);

      if (!selectedNgo && mergedNgos.length) {
        setSelectedNgo(mergedNgos[0]);
      }
    });

    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
      });
    }

    return () => unsubscribe();
  }, []);

  const handleDonationRequest = (payload: Record<string, string>) => {
    showToast(`Request sent for ${payload.ngoLabel ?? 'your selected NGO'}. We will contact you soon.`, 'success');
  };

  const handleTransportGo = () => {
    if (!selectedNgo) return;
    
    const { latitude: lat, longitude: lng } = selectedNgo;
    const urls: Record<string, string> = {
      google_maps: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      indrive: `indriver://`,
      careem: `careem://pickup?d=${lat},${lng}`,
      bykea: `bykea://`
    };
    
    const fallbacks: Record<string, string> = {
      indrive: 'https://indrive.com',
      careem: 'https://www.careem.com',
      bykea: 'https://www.bykea.com'
    };

    window.open(urls[transport] || urls.google_maps, '_blank');
    if (fallbacks[transport]) {
      setTimeout(() => {
        if (!document.hidden) {
            window.location.href = fallbacks[transport];
        }
      }, 1000);
    }
  };

  return (
    <section className="py-24 bg-white" id="volunteer-map">
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-12">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 mb-4">
                <Navigation size={14} /> Self-Drive & Volunteer
              </span>
              <h2 className="text-4xl font-black tracking-tighter text-slate-900 mb-4">Find & Visit <span className="text-emerald-500">Local NGOs</span></h2>
              <p className="max-w-2xl text-slate-600 font-medium">Choose an NGO, plan your route, and send a donation request with food, clothes, books, or medicines in one clean flow.</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
              <strong>{(ngos.length || fallbackNgos.length)}</strong> NGO / school locations are available for visit and support.
            </div>
          </div>

          <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-8">
              <div className="grid gap-4 md:grid-cols-2">
                {(ngos.length ? ngos : fallbackNgos).slice(0, 6).map((ngo) => (
                  <button
                    key={ngo.id}
                    type="button"
                    onClick={() => setSelectedNgo(ngo)}
                    className={`rounded-[1.5rem] border p-4 text-left shadow-sm transition ${selectedNgo?.id === ngo.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/40'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-500">{ngo.type ?? 'ngo'}</p>
                        <h3 className="mt-1 text-base font-black text-slate-900">{ngo.name}</h3>
                        <p className="mt-1 text-xs text-slate-500">{ngo.city ?? 'Pakistan'} · {ngo.address ?? 'Community support'}</p>
                      </div>
                      <MapPinned size={16} className="text-emerald-500" />
                    </div>
                  </button>
                ))}
              </div>

              <div className="rounded-[2rem] border border-slate-100 bg-slate-50 p-6 shadow-sm">
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Select Destination</label>
                    <select
                      className="w-full rounded-2xl border border-transparent bg-white py-3 px-4 text-sm font-bold text-slate-700 shadow-sm outline-none transition focus:border-emerald-500"
                      onChange={(e) => {
                        const ngo = (ngos.length ? ngos : fallbackNgos).find((item) => item.id === e.target.value);
                        if (ngo) setSelectedNgo(ngo);
                      }}
                      value={selectedNgo?.id || ''}
                    >
                      <option value="" disabled>Choose an NGO...</option>
                      {(ngos.length ? ngos : fallbackNgos).map((ngo) => (
                        <option key={ngo.id} value={ngo.id}>{ngo.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Choose Transport</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'google_maps', label: 'Google Maps', icon: <Navigation size={18} /> },
                        { id: 'indrive', label: 'InDrive', icon: <Car size={18} /> },
                        { id: 'careem', label: 'Careem', icon: <Car size={18} /> },
                        { id: 'bykea', label: 'Bykea', icon: <Bike size={18} /> },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setTransport(opt.id)}
                          className={`flex items-center gap-2 rounded-xl border-2 p-3 text-xs font-bold transition-all ${transport === opt.id ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-white bg-white text-slate-500 shadow-sm hover:border-slate-200'}`}
                        >
                          {opt.icon}
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleTransportGo}
                    disabled={!selectedNgo}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-lg font-black text-white shadow-xl transition-all hover:bg-emerald-600 disabled:opacity-50 group"
                  >
                    Go to Destination <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex items-start gap-3">
                  <HeartHandshake size={18} className="mt-0.5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-black text-slate-900">Ready for sharing</p>
                    <p className="text-xs text-slate-600">The NGO card list and donation request form are now separated, so the page stays clean and easy to reuse in screenshots or Git uploads.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="h-[420px] rounded-[2.5rem] border-8 border-white shadow-2xl shadow-slate-200/70 relative z-0 overflow-hidden lg:h-[500px]">
                <MapContainer
                  center={userLocation || [30.3753, 69.3451]}
                  zoom={5}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  {(ngos.length ? ngos : fallbackNgos).map((ngo) => (
                    <Marker
                      key={ngo.id}
                      position={[ngo.latitude, ngo.longitude]}
                      eventHandlers={{ click: () => setSelectedNgo(ngo) }}
                    >
                      <Popup>
                        <div className="p-1">
                          <h3 className="m-0 font-black text-slate-900">{ngo.name}</h3>
                          <p className="mt-1 text-xs text-slate-500">{ngo.address}</p>
                          <button
                            onClick={() => setSelectedNgo(ngo)}
                            className="mt-2 text-xs font-black text-emerald-600 hover:underline"
                          >
                            Select this NGO
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                  {selectedNgo && <RecenterMap lat={selectedNgo.latitude} lng={selectedNgo.longitude} />}
                </MapContainer>

                <div className="absolute top-4 right-4 z-[1000] rounded-full border border-white/20 bg-white/90 px-4 py-2 shadow-lg backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">Live NGO Map</span>
                  </div>
                </div>
              </div>

              <DonationRequestForm ngos={(ngos.length ? ngos : fallbackNgos)} selectedNgo={selectedNgo} onSubmit={handleDonationRequest} />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default VolunteerMap;
