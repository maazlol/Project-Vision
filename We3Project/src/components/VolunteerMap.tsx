import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { Navigation } from 'lucide-react';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { showToast } = useToast();

  // Helper to calculate distance in km
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          console.log('Location access denied');
        }
      );
    }

    // Fetch NGOs
    const q = query(collection(db, 'ngos'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ngoList = snapshot.docs.map(doc => {
        const data = doc.data();
        const lat = typeof data.latitude === 'number' ? data.latitude : 24.8607;
        const lng = typeof data.longitude === 'number' ? data.longitude : 67.0011;
        
        return {
          id: doc.id,
          ...data,
          latitude: lat,
          longitude: lng
        };
      }) as NGO[];

      let mergedNgos = ngoList.length ? ngoList : fallbackNgos;

      // Sort by proximity if user location is available
      if (userLocation) {
        mergedNgos = [...mergedNgos].sort((a, b) => {
          const distA = getDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude);
          const distB = getDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude);
          return distA - distB;
        });
      }

      setNgos(mergedNgos);

      if (!selectedNgo && mergedNgos.length) {
        setSelectedNgo(mergedNgos[0]);
      }
    });

    return () => unsubscribe();
  }, [userLocation]);

  const handleDonationRequest = (payload: Record<string, string>) => {
    showToast(`Request sent for ${payload.ngoLabel ?? 'your selected NGO'}. We will contact you soon.`, 'success');
    setIsModalOpen(false);
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

          <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-6 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm shadow-slate-200/60">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-500">Nearest Organizations</p>
                <h3 className="mt-2 text-2xl font-black text-slate-900">Use your location to find nearby verified NGOs.</h3>
                <p className="mt-2 text-sm text-slate-600">We've sorted the list by proximity to your current location. You can also manually choose an NGO from the map and open the donation form below.</p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Quick options</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                  <li>Choose a verified NGO from the list</li>
                  <li>Open donation form when you are ready</li>
                  <li>Use Google Maps / InDrive / Careem for the trip</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700"
              >
                Open donation form
              </button>

              <DonationRequestForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                ngos={(ngos.length ? ngos : fallbackNgos)}
                selectedNgo={selectedNgo}
                onSubmit={handleDonationRequest}
              />
            </div>

            <div className="space-y-6">
              <div className="h-[360px] rounded-[2.5rem] border-8 border-white shadow-2xl shadow-slate-200/70 relative z-0 overflow-hidden lg:h-[420px]">
                <MapContainer
                  center={[24.8607, 67.0011]}
                  zoom={12}
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

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
                <p className="font-black">Tip</p>
                <p className="mt-1 text-emerald-700/90">Use the map to pick a destination, then open the form when you are ready to send the donation request.</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default VolunteerMap;
