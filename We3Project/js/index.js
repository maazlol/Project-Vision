// ================================================
//   FREEHUNGER — index.js
//   GSAP Hero Animations + Canvas Particles +
//   Live Donation Feed + All existing features
// ================================================

document.addEventListener('DOMContentLoaded', () => {

  // ================================================
    // 1. CANVAS PARTICLES — Hero Background (Ultra Optimized)
    // ================================================
    (function initParticles() {
        const canvas = document.getElementById('hero-particles');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let W, H, particles = [];

        // COLORS aur COUNT ko set kiya
        const COLORS = ['#10b981', '#34d399', '#6ee7b7', '#f59e0b', '#fcd34d'];
        const COUNT = window.innerWidth < 768 ? 30 : 50; 

        function resize() {
            // Resolution thori kam ki taake GPU pe bojh na pare[cite: 1]
            W = canvas.width = canvas.offsetWidth / 1.2; 
            H = canvas.height = canvas.offsetHeight / 1.2;
        }

        function createParticle() {
            return {
                x: Math.random() * W,
                y: Math.random() * H,
                r: Math.random() * 2 + 1,
                dx: (Math.random() - 0.5) * 0.6,
                dy: (Math.random() - 0.5) * 0.6,
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                alpha: Math.random() * 0.4 + 0.2
            };
        }

        function init() {
            resize();
            particles = Array.from({ length: COUNT }, createParticle);
        }

        function draw() {
            ctx.clearRect(0, 0, W, H);
            
            for (let i = 0; i < particles.length; i++) {
                let p = particles[i];
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.alpha;
                ctx.fill();

                // Lines ka radius mazeed kam kar diya taake calculation fast ho[cite: 1]
                for (let j = i + 1; j < particles.length; j++) {
                    let p2 = particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const distSq = dx * dx + dy * dy;

                    if (distSq < 5000) { // Sirf kareebi particles connect honge[cite: 1]
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = '#10b981';
                        ctx.globalAlpha = 0.05;
                        ctx.stroke();
                    }
                }
                p.x += p.dx; p.y += p.dy;
                if (p.x < 0 || p.x > W) p.dx *= -1;
                if (p.y < 0 || p.y > H) p.dy *= -1;
            }
            // 40 FPS pe lock kiya taake scroll makkhan jaisa chale[cite: 1]
            setTimeout(() => {
                requestAnimationFrame(draw);
            }, 1000 / 40); 
        }

        init();
        draw();
        window.addEventListener('resize', init);
    })();

    // ================================================
    // 2. GSAP HERO ANIMATIONS
    // ================================================
    (function initGSAP() {
        if (typeof gsap === 'undefined') return;

        // Register ScrollTrigger if available
        if (typeof ScrollTrigger !== 'undefined') {
            gsap.registerPlugin(ScrollTrigger);
        }

        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        // Badge
        tl.to('#hero-badge', {
            opacity: 1, y: 0, duration: 0.6, delay: 0.2
        })
        // Hero lines — staggered one by one
        .to(['#hero-line-1', '#hero-line-2', '#hero-line-3'], {
            opacity: 1, y: 0, duration: 0.7, stagger: 0.18
        }, '-=0.2')
        // Subtitle
        .to('#hero-subtitle', {
            opacity: 1, y: 0, duration: 0.6
        }, '-=0.3')
        // Buttons
        .to('#hero-btns', {
            opacity: 1, y: 0, duration: 0.5
        }, '-=0.3')
        // Social proof
        .to('#hero-social-proof', {
            opacity: 1, y: 0, duration: 0.5
        }, '-=0.2')
        // Image — slides in from right
        .to('#hero-image-wrap', {
            opacity: 1, x: 0, duration: 0.8, ease: 'power2.out'
        }, '-=0.7')
        // Float cards
        .to('#hero-float-1', {
            opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)'
        }, '-=0.4')
        .to('#hero-float-2', {
            opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)'
        }, '-=0.3')
        // Live feed
        .to('#hero-live-feed', {
            opacity: 1, y: 0, duration: 0.5
        }, '-=0.2');

        // Set initial states for image (comes from right)
        gsap.set('#hero-image-wrap', { x: 60 });
        // Float cards start small
        gsap.set(['#hero-float-1', '#hero-float-2'], { scale: 0.8 });

        // Floating animation (up-down) after entrance
        gsap.to('#hero-float-1', {
            y: -8, duration: 2.5, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 1.5
        });
        gsap.to('#hero-float-2', {
            y: 8, duration: 3, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 1.8
        });

        // ScrollTrigger for sections
        if (typeof ScrollTrigger !== 'undefined') {
            gsap.utils.toArray('.reveal').forEach((el) => {
                gsap.fromTo(el,
                    { opacity: 0, y: 40 },
                    {
                        opacity: 1, y: 0, duration: 0.8, ease: 'power2.out',
                        scrollTrigger: {
                            trigger: el,
                            start: 'top 88%',
                            toggleActions: 'play none none none'
                        }
                    }
                );
            });
        }
    })();

    // ================================================
    // 3. LIVE DONATION FEED — cycles every 4s
    // ================================================
    (function initLiveFeed() {
        const el = document.getElementById('live-feed-text');
        if (!el) return;

        const feeds = [
            'Fatima K. donated Rs. 200 to Edhi Foundation',
            'Ali R. donated Rs. 500 to TCF School',
            'Sara M. donated Rs. 100 to Thar Girls School',
            'Ahmed Z. donated Rs. 300 to Akhuwat Foundation',
            'Nadia T. donated Rs. 150 to HANDS Pakistan',
            'Omar S. donated Rs. 250 to Sudhaar School',
            'Bilal Q. donated Rs. 400 to Alkhidmat Foundation',
        ];

        let i = 0;
        setInterval(() => {
            i = (i + 1) % feeds.length;
            el.style.opacity = '0';
            el.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                el.textContent = feeds[i];
                el.style.opacity = '1';
            }, 300);
        }, 4000);
    })();

    // ================================================
    // 4. STATS COUNTER ANIMATION
    // ================================================
    const stats        = document.querySelectorAll('.stat-number');
    const statsSection = document.querySelector('.stats-section');
    let animated = false;

    const animateStats = () => {
        stats.forEach(stat => {
            const target    = parseInt(stat.getAttribute('data-target'));
            const increment = target / 50;
            let current = 0;
            const update = () => {
                if (current < target) {
                    current += increment;
                    stat.innerText = Math.ceil(current).toLocaleString();
                    setTimeout(update, 20);
                } else {
                    stat.innerText = target.toLocaleString();
                }
            };
            update();
        });
    };

    const statsObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !animated) {
            animateStats();
            animated = true;
        }
    }, { threshold: 0.5 });

    if (statsSection) statsObserver.observe(statsSection);

    // ================================================
    // 5. REVEAL ON SCROLL (Fallback if no GSAP)
    // ================================================
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        const reveals = document.querySelectorAll('.reveal');
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) entry.target.classList.add('active');
            });
        }, { threshold: 0.1 });
        reveals.forEach(r => revealObserver.observe(r));
    }

    // ================================================
    // 6. HERO START BUTTON — Auth check
    // ================================================
    const heroStartBtn = document.getElementById('hero-start-btn');
    if (heroStartBtn) {
        heroStartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof firebase !== 'undefined' && firebase.auth().currentUser) {
                window.location.href = 'dashboard.html';
            } else {
                window.location.href = 'login.html';
            }
        });
    }

    // ================================================
    // 7. REAL-TIME NGO MAP (Leaflet + Firebase)
    // ================================================
    const mapElement  = document.getElementById('map');
    const nearbyList  = document.getElementById('nearby-list');

    let map, userMarker;
    let allNGOs   = [];
    let userCoords = null;
    const markersGroup = typeof L !== 'undefined' ? L.layerGroup() : null;

    if (mapElement && typeof L !== 'undefined') {
        initMap();
        initRealtimeNGOs();
    }

    function initMap() {
        const pakistanCenter = [30.3753, 69.3451];
        map = L.map('map').setView(pakistanCenter, 5);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        markersGroup.addTo(map);
    }

    function initRealtimeNGOs() {
        if (typeof firebase === 'undefined') return;
        const db = firebase.firestore();

        // One-time cleanup and seeding
        const seedDone = localStorage.getItem('ngo_seed_v2');
        if (!seedDone) {
            console.log("Cleaning up old NGO data...");
            
            // Delete lowercase 'ngos' collection documents (client-side limit: 500)
            db.collection('ngos').get().then(snap => {
                snap.forEach(doc => doc.ref.delete());
            });

            // Re-seed uppercase 'Ngos'
            const samples = [
                // VERIFIED REAL NGOS / SCHOOLS (12)
                { name: "Edhi Foundation (Karachi)", latitude: 24.8607, longitude: 67.0011, category: "Emergency", city: "Karachi", description: "Pakistan's largest non-profit social welfare organization.", verified: true, received: 1250000, goal: 5000000, urgent: true, type: "ngo" },
                { name: "The Citizens Foundation (TCF)", latitude: 24.8500, longitude: 67.0100, category: "Education", city: "Karachi", description: "Providing quality education to the less privileged.", verified: true, received: 3400000, goal: 10000000, urgent: false, type: "school" },
                { name: "Shaukat Khanum Hospital", latitude: 31.4725, longitude: 74.2212, category: "Healthcare", city: "Lahore", description: "Specialized cancer hospital providing free treatment.", verified: true, received: 8900000, goal: 20000000, urgent: true, type: "ngo" },
                { name: "Saylani Welfare Trust", latitude: 24.8827, longitude: 67.0681, category: "Humanitarian", city: "Karachi", description: "Fighting hunger and providing vocational training.", verified: true, received: 2100000, goal: 5000000, urgent: false, type: "ngo" },
                { name: "Akhuwat Foundation", latitude: 31.5204, longitude: 74.3587, category: "Microfinance", city: "Lahore", description: "World's largest interest-free microfinance program.", verified: true, received: 1500000, goal: 4000000, urgent: false, type: "ngo" },
                { name: "Kashf Foundation", latitude: 31.4800, longitude: 74.3200, category: "Microfinance", city: "Lahore", description: "Empowering women through micro-loans.", verified: true, received: 950000, goal: 2500000, urgent: false, type: "ngo" },
                { name: "Al-Khidmat Foundation", latitude: 31.5500, longitude: 74.3400, category: "Humanitarian", city: "Lahore", description: "Vast network of social services and disaster relief.", verified: true, received: 4500000, goal: 8000000, urgent: true, type: "ngo" },
                { name: "Care Foundation Schools", latitude: 31.5000, longitude: 74.3000, category: "Education", city: "Lahore", description: "Managing government schools to ensure quality.", verified: true, received: 1200000, goal: 3000000, urgent: false, type: "school" },
                { name: "Indus Hospital & Health", latitude: 24.8500, longitude: 67.1200, category: "Healthcare", city: "Karachi", description: "Quality healthcare absolutely free for all.", verified: true, received: 6700000, goal: 15000000, urgent: true, type: "ngo" },
                { name: "Hands Pakistan", latitude: 24.9000, longitude: 67.1000, category: "Rural Development", city: "Karachi", description: "Working for healthy, educated and prosperous Pakistan.", verified: true, received: 800000, goal: 2000000, urgent: false, type: "ngo" },
                { name: "Bunyad Foundation", latitude: 31.5400, longitude: 74.3600, category: "Education", city: "Lahore", description: "Literacy and non-formal basic education.", verified: true, received: 550000, goal: 1500000, urgent: false, type: "school" },
                { name: "Zindagi Trust", latitude: 24.8400, longitude: 67.0300, category: "Education", city: "Karachi", description: "Transforming government schools and education policy.", verified: true, received: 1800000, goal: 4000000, urgent: false, type: "school" },

                // DEMO / FAKE NGOS (13)
                { name: "Bright Future Academy (Demo)", latitude: 24.9500, longitude: 67.1500, category: "Education", city: "Karachi", description: "Demo school project for testing fund allocation.", verified: false, received: 15000, goal: 50000, urgent: false, type: "school" },
                { name: "Unity Relief Fund (Demo)", latitude: 31.4500, longitude: 74.4000, category: "Humanitarian", city: "Lahore", description: "Simulated emergency relief operation.", verified: false, received: 5000, goal: 20000, urgent: true, type: "ngo" },
                { name: "Green Earth Initiative (Demo)", latitude: 33.6844, longitude: 73.0479, category: "Environment", city: "Islamabad", description: "Testing environmental donation flows.", verified: false, received: 8500, goal: 15000, urgent: false, type: "ngo" },
                { name: "Hope Clinic (Demo)", latitude: 30.1575, longitude: 71.5249, category: "Healthcare", city: "Multan", description: "Sample healthcare clinic for UI testing.", verified: false, received: 12000, goal: 30000, urgent: false, type: "ngo" },
                { name: "Pathway Primary School (Demo)", latitude: 34.0151, longitude: 71.5249, category: "Education", city: "Peshawar", description: "Testing school category filters.", verified: false, received: 22000, goal: 45000, urgent: false, type: "school" },
                { name: "City Shelter (Demo)", latitude: 25.3960, longitude: 68.3578, category: "Social Welfare", city: "Hyderabad", description: "Homeless shelter simulation.", verified: false, received: 3000, goal: 10000, urgent: true, type: "ngo" },
                { name: "Tech For Kids (Demo)", latitude: 31.5820, longitude: 74.3294, category: "Education", city: "Lahore", description: "Bridging the digital divide simulation.", verified: false, received: 18000, goal: 40000, urgent: false, type: "school" },
                { name: "Safe Water Project (Demo)", latitude: 30.1833, longitude: 66.9967, category: "Humanitarian", city: "Quetta", description: "Testing water project donations.", verified: false, received: 9000, goal: 25000, urgent: false, type: "ngo" },
                { name: "Animal Rescue Hub (Demo)", latitude: 33.6000, longitude: 73.0600, category: "Animal Welfare", city: "Rawalpindi", description: "Simulated animal rescue organization.", verified: false, received: 4500, goal: 12000, urgent: false, type: "ngo" },
                { name: "Scholarship Plus (Demo)", latitude: 32.1877, longitude: 74.1945, category: "Education", city: "Gujranwala", description: "Testing scholarship fund management.", verified: false, received: 35000, goal: 60000, urgent: false, type: "school" },
                { name: "Oxygen Aid (Demo)", latitude: 30.3753, longitude: 69.3451, category: "Healthcare", city: "Central PK", description: "Simulated oxygen supply network.", verified: false, received: 2000, goal: 15000, urgent: true, type: "ngo" },
                { name: "Skill Center (Demo)", latitude: 32.4945, longitude: 74.5229, category: "Education", city: "Sialkot", description: "Testing vocational training UI.", verified: false, received: 11000, goal: 28000, urgent: false, type: "school" },
                { name: "Winter Blanket Drive (Demo)", latitude: 34.1986, longitude: 73.2351, category: "Humanitarian", city: "Abbottabad", description: "Seasonal drive simulation.", verified: false, received: 6000, goal: 10000, urgent: true, type: "ngo" }
            ];

            // Clear 'Ngos' and re-add
            db.collection('Ngos').get().then(snap => {
                const batch = db.batch();
                snap.forEach(doc => batch.delete(doc.ref));
                samples.forEach(s => {
                    const newDoc = db.collection('Ngos').doc();
                    batch.set(newDoc, s);
                });
                return batch.commit();
            }).then(() => {
                localStorage.setItem('ngo_seed_v2', 'true');
                console.log("Seeding complete with 25 NGOs.");
            });
        }

        db.collection('Ngos').onSnapshot((snapshot) => {
            allNGOs = [];
            snapshot.forEach(doc => allNGOs.push({ id: doc.id, ...doc.data() }));
            updateMapAndList();
        });
    }

    function updateMapAndList() {
        if (!map || !markersGroup) return;
        markersGroup.clearLayers();

        let displayNGOs = allNGOs;
        if (userCoords) {
            displayNGOs = allNGOs.map(n => ({
                ...n,
                distance: calculateDistance(userCoords.lat, userCoords.lng, n.latitude, n.longitude)
            })).sort((a, b) => a.distance - b.distance);
            renderNearbyList(displayNGOs.slice(0, 5));
        }

        displayNGOs.forEach(ngo => {
            const statusBadge = ngo.verified 
                ? '<span style="color:#10b981; font-size:0.7rem;">🟢 Verified</span>' 
                : '<span style="color:#f59e0b; font-size:0.7rem;">🟡 Demo</span>';

            const marker = L.marker([ngo.latitude, ngo.longitude])
                .bindPopup(`
                    <div style="min-width:160px;">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <h6 class="fw-bold mb-0" style="font-size:0.9rem;">${ngo.name}</h6>
                        </div>
                        <div class="mb-2">${statusBadge}</div>
                        <p class="small text-muted mb-2" style="font-size:0.75rem; line-height:1.2;">${ngo.description || 'Organization making an impact.'}</p>
                        ${ngo.distance ? `<p class="small mb-2" style="font-size:0.75rem;"><b>${ngo.distance.toFixed(1)} km</b> away</p>` : ''}
                        <a href="login.html" class="btn btn-sm btn-primary w-100 text-white py-1" style="font-size:0.75rem;">Donate Credits</a>
                    </div>
                `);
            markersGroup.addLayer(marker);
        });
    }

    function renderNearbyList(ngos) {
        if (!nearbyList) return;
        if (!ngos.length) {
            nearbyList.innerHTML = '<p class="text-muted small mb-0">No NGOs found.</p>';
            return;
        }
        nearbyList.innerHTML = ngos.map(ngo => `
            <div class="list-group-item list-group-item-action border-0 px-0 py-2">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-0 small fw-bold">${ngo.name}</h6>
                        <div class="d-flex align-items-center gap-2">
                            <span class="text-muted" style="font-size:0.65rem;">${ngo.category || 'Humanitarian'}</span>
                            <span style="font-size:0.65rem;">${ngo.verified ? '🟢 Verified' : '🟡 Demo'}</span>
                        </div>
                    </div>
                    <span class="badge rounded-pill bg-light text-primary border" style="font-size:0.65rem;">${ngo.distance.toFixed(1)} km</span>
                </div>
                <button class="btn btn-link p-0 small mt-1" style="font-size:0.75rem;text-decoration:none;"
                    onclick="focusNGO(${ngo.latitude},${ngo.longitude})">
                    <i class="bi bi-geo-alt me-1"></i>View on Map
                </button>
            </div>
        `).join('');
    }

    window.focusNGO = (lat, lng) => { if (map) map.setView([lat, lng], 14); };

    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R    = 6371;
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a    = Math.sin(dLat/2)**2 +
                     Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function deg2rad(deg) { return deg * (Math.PI / 180); }

    // ================================================
    // 8. DONATION MODAL & LOCATION
    // ================================================
    const openDonationBtn      = document.getElementById('open-donation-btn');
    const donationForm         = document.getElementById('donation-form');
    const ngoSelect            = document.getElementById('ngo-select');
    const donationTypeSelect   = document.getElementById('donation-type');
    const otherContainer       = document.getElementById('other-donation-container');

    if (openDonationBtn) {
        openDonationBtn.addEventListener('click', () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    ({ coords: { latitude, longitude } }) => {
                        userCoords = { lat: latitude, lng: longitude };
                        if (map) {
                            map.setView([latitude, longitude], 12);
                            if (userMarker) map.removeLayer(userMarker);
                            userMarker = L.marker([latitude, longitude], {
                                icon: L.icon({
                                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                                    iconSize: [25, 41], iconAnchor: [12, 41],
                                    popupAnchor: [1, -34], shadowSize: [41, 41]
                                })
                            }).addTo(map).bindPopup('<b>Your Location</b>').openPopup();
                        }
                        updateMapAndList();
                        populateNGODropdown();
                    },
                    () => populateNGODropdown()
                );
            } else {
                populateNGODropdown();
            }
        });
    }

    if (donationTypeSelect) {
        donationTypeSelect.addEventListener('change', (e) => {
            otherContainer?.classList.toggle('d-none', e.target.value !== 'Other');
        });
    }

    function populateNGODropdown() {
        if (!ngoSelect) return;
        let sorted = [...allNGOs];
        if (userCoords) {
            sorted = allNGOs.map(n => ({
                ...n,
                distance: calculateDistance(userCoords.lat, userCoords.lng, n.latitude, n.longitude)
            })).sort((a, b) => a.distance - b.distance);
        }
        ngoSelect.innerHTML = '<option value="" disabled selected>Choose an NGO...</option>' +
            sorted.map(n => `<option value="${n.id}" data-lat="${n.latitude}" data-lng="${n.longitude}">
                ${n.name}${n.distance ? ` (${n.distance.toFixed(1)} km)` : ''}
            </option>`).join('');
    }

    if (donationForm) {
        donationForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const opt      = ngoSelect.options[ngoSelect.selectedIndex];
            const destLat  = opt.getAttribute('data-lat');
            const destLng  = opt.getAttribute('data-lng');
            const transport = document.getElementById('transport-option').value;
            if (!destLat) { alert('Please select an NGO.'); return; }
            handleTransport(transport, destLat, destLng);
        });
    }

    function handleTransport(option, lat, lng) {
        const urls = {
            google_maps: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
            indrive:     `indriver://`,
            careem:      `careem://pickup?d=${lat},${lng}`,
            bykea:       `bykea://`
        };
        const fallbacks = {
            indrive: 'https://indrive.com',
            careem:  'https://www.careem.com',
            bykea:   'https://www.bykea.com'
        };
        window.open(urls[option] || urls.google_maps, '_blank');
        if (fallbacks[option]) setTimeout(() => { window.location.href = fallbacks[option]; }, 500);
    }

    setTimeout(populateNGODropdown, 2000);

}); // end DOMContentLoaded