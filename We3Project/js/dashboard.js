// ================================================
//   FREEHUNGER — dashboard.js
//   Real-time Firebase Firestore Implementation
// ================================================

const db = firebase.firestore();
let currentUser = null;
let userData = null;
let ngoData = [];

// ================================================
// AUTH GUARD & REAL-TIME USER DATA
// ================================================
firebase.auth().onAuthStateChanged(user => {
    if (!user) {
        window.location.href = 'login.html';
    } else {
        currentUser = user;
        // Real-time listener for user profile
        db.collection('users').doc(user.uid).onSnapshot(async doc => {
            if (doc.exists) {
                userData = doc.data();
                
                const now = new Date();

                // 1. Monthly Reset Check
                const currentMonth = `${now.getFullYear()}-${now.getMonth() + 1}`;
                if (userData.lastResetMonth !== currentMonth) {
                    await db.collection('users').doc(user.uid).update({
                        donatedThisMonth: 0,
                        lastResetMonth: currentMonth
                    });
                    return;
                }

                // 2. 6-Hour Ad Reset Check
                const lastAdReset = userData.lastAdReset ? userData.lastAdReset.toDate() : new Date(0);
                const hoursSinceReset = (now - lastAdReset) / (1000 * 60 * 60);

                if (hoursSinceReset >= 6) {
                    await db.collection('users').doc(user.uid).update({
                        videosToday: 0,
                        lastAdReset: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    return;
                }

                // 3. 24-Hour Streak Reset Check
                const lastVideoDate = userData.lastVideoDate ? userData.lastVideoDate.toDate() : null;
                if (lastVideoDate) {
                    const hoursSinceLastVideo = (now - lastVideoDate) / (1000 * 60 * 60);
                    if (hoursSinceLastVideo > 24 && userData.streak > 0) {
                        await db.collection('users').doc(user.uid).update({
                            streak: 0
                        });
                        return;
                    }
                }

                updateDashboardUI();
                updateMissions();
                updateImpactSection();
                updateProfileModal();
            } else {
                createUserProfile(user);
            }
        });

        // Real-time listener for user's donations
        db.collection('users').doc(user.uid).collection('donations')
          .orderBy('timestamp', 'desc')
          .limit(10)
          .onSnapshot(snap => {
              renderDonationHistory(snap);
          });
    }
});

async function createUserProfile(user) {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${now.getMonth() + 1}`;
    await db.collection('users').doc(user.uid).set({
        uid: user.uid,
        name: user.displayName || 'Guest User',
        email: user.email || '',
        credits: 0,
        streak: 0,
        totalDonated: 0,
        donatedThisMonth: 0,
        lastResetMonth: currentMonth,
        videosToday: 0,
        lastAdReset: firebase.firestore.FieldValue.serverTimestamp(),
        lastVideoDate: null,
        joinedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
}

// ================================================
// UI UPDATES (REAL-TIME)
// ================================================

function updateDashboardUI() {
    if (!userData) return;

    // Basic Stats
    safeSetText('userName', userData.username || userData.name || 'User');
    safeSetText('userCredits', (userData.credits || 0).toLocaleString());
    safeSetText('donateBalance', (userData.credits || 0).toLocaleString());
    safeSetText('userStreak', userData.streak || 0);
    safeSetText('totalDonated', (userData.totalDonated || 0).toLocaleString());
    safeSetText('videosWatched', `${userData.videosToday || 0} / 10`);

    // Impact section (Total Donated / 100 = meals)
    const donated = userData.totalDonated || 0;
    safeSetText('impactMeals', Math.floor(donated / 100).toLocaleString());
    safeSetText('impactRupees', donated.toLocaleString());
    safeSetText('impactNGOs', donated > 0 ? '1' : '0');
    safeSetText('impactChildren', Math.floor(donated / 50).toLocaleString());

    // Update Avatar Display
    const avatarIcon = document.getElementById('userAvatarIcon');
    const avatarImg = document.getElementById('userAvatarImg');
    const avatarContainer = document.getElementById('userAvatarDisplay');

    if (userData.avatarType === 'image') {
        if (avatarIcon) avatarIcon.style.display = 'none';
        if (avatarImg) {
            avatarImg.src = userData.avatarValue;
            avatarImg.style.display = 'block';
        }
    } else if (userData.avatarType === 'emoji') {
        if (avatarImg) avatarImg.style.display = 'none';
        if (avatarIcon) {
            avatarIcon.className = '';
            avatarIcon.textContent = userData.avatarValue || '😊';
            avatarIcon.style.fontSize = '2.2rem';
            avatarIcon.style.display = 'block';
        }
        if (avatarContainer) {
            avatarContainer.style.backgroundColor = userData.avatarBg || '#f3f4f6';
        }
    }

    // Update Rank Info
    safeSetText('userRank', userData.rank || '—');

    // Progress Bar
    const vCount = userData.videosToday || 0;
    const vPct = Math.min((vCount / 10) * 100, 100);
    const progressEl = document.getElementById('videoProgress');
    if (progressEl) progressEl.style.width = vPct + '%';

    // Update Reward Rows visually
    const r3 = document.getElementById('reward-3');
    const r5 = document.getElementById('reward-5');
    const r10 = document.getElementById('reward-10');

    if (r3) {
        r3.classList.toggle('text-success', vCount >= 3);
        r3.querySelector('i')?.classList.replace(vCount >= 3 ? 'bi-circle' : 'bi-check-circle-fill', vCount >= 3 ? 'bi-check-circle-fill' : 'bi-circle');
        if (vCount >= 3) r3.querySelector('i').style.color = '#10b981';
    }
    if (r5) {
        r5.classList.toggle('text-success', vCount >= 5);
        r5.querySelector('i')?.classList.replace(vCount >= 5 ? 'bi-circle' : 'bi-check-circle-fill', vCount >= 5 ? 'bi-check-circle-fill' : 'bi-circle');
        if (vCount >= 5) r5.querySelector('i').style.color = '#10b981';
    }
    if (r10) {
        r10.classList.toggle('text-success', vCount >= 10);
        r10.querySelector('i')?.classList.replace(vCount >= 10 ? 'bi-circle' : 'bi-check-circle-fill', vCount >= 10 ? 'bi-check-circle-fill' : 'bi-circle');
        if (vCount >= 10) r10.querySelector('i').style.color = '#10b981';
    }

    // Video Limit Display
    const limitMsg = document.getElementById('videoLimitMsg');
    const watchBtn = document.getElementById('watchBtn');
    if (vCount >= 10) {
        limitMsg?.classList.add('show');
        if (watchBtn) {
            watchBtn.disabled = true;
            watchBtn.style.opacity = '0.5';
            watchBtn.style.cursor = 'not-allowed';
        }
        startResetTimer();
    } else {
        limitMsg?.classList.remove('show');
        if (watchBtn && !videoWatching) {
            watchBtn.disabled = false;
            watchBtn.style.opacity = '1';
            watchBtn.style.cursor = 'pointer';
        }
    }

    // Missions
    const missionVPct = Math.min((vCount / 3) * 100, 100);
    safeSetText('missionVideoCount', `${vCount} / 3`);
    const missionVBar = document.getElementById('missionVideoBar');
    if (missionVBar) missionVBar.style.width = missionVPct + '%';
    
    if (vCount >= 3) {
        document.getElementById('mission-videos')?.classList.add('completed');
        safeSetText('missionVideoStatus', 'Completed');
    }

    if (donated > 0) {
        document.getElementById('mission-donate')?.classList.add('completed');
        safeSetText('missionDonateStatus', 'Completed');
        const dBar = document.getElementById('missionDonateBar');
        if (dBar) dBar.style.width = '100%';
        safeSetText('missionDonateCount', '1 / 1');
    }
}

function updateMissions() {
    // Handled in updateDashboardUI for real-time reactivity
}

function updateImpactSection() {
    // Handled in updateDashboardUI for real-time reactivity
}

function renderDonationHistory(snap) {
    const list = document.getElementById('donationHistory');
    if (!list) return;

    if (snap.empty) {
        list.innerHTML = '<p class="text-muted text-center small py-3">No donations yet. Watch videos and donate!</p>';
        return;
    }

    list.innerHTML = '';
    snap.forEach(doc => {
        const data = doc.data();
        const date = data.timestamp ? data.timestamp.toDate().toLocaleDateString('en-GB', { day:'numeric', month:'short' }) : 'Just now';
        
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <div class="history-left">
                <span class="history-dot verified"></span>
                <div>
                    <strong>${data.ngoName}</strong>
                    <p class="text-muted small mb-0">${date}</p>
                </div>
            </div>
            <strong class="text-success">Rs. ${data.amount.toLocaleString()}</strong>
        `;
        list.appendChild(item);
    });
}

// ================================================
// REAL-TIME NGO LIST
// ================================================

function initRealtimeNGOs() {
    db.collection('Ngos').onSnapshot(snap => {
        ngoData = [];
        snap.forEach(doc => {
            ngoData.push({ id: doc.id, ...doc.data() });
        });        
        // Smart Distribution Sort
        ngoData.sort((a, b) => {
            if (a.urgent && !b.urgent) return -1;
            if (!a.urgent && b.urgent) return 1;
            const pctA = (a.received || 0) / (a.goal || 1);
            const pctB = (b.received || 0) / (b.goal || 1);
            return pctA - pctB;
        });

        renderNGOs();
        updateDonateSelect();
    });
}

function renderNGOs() {
    const grid = document.getElementById('ngoGrid');
    if (!grid) return;

    if (ngoData.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2">Loading NGOs...</p></div>';
        return;
    }

    grid.innerHTML = '';
    const filter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';

    let filtered = ngoData;
    if (filter === 'school') filtered = ngoData.filter(n => (n.category === 'Education' || n.type === 'school'));
    if (filter === 'ngo') filtered = ngoData.filter(n => (n.category !== 'Education' && n.type !== 'school'));
    if (filter === 'verified') filtered = ngoData.filter(n => n.verified === true);

    filtered.forEach((ngo, i) => {
        const received = ngo.received || 0;
        const goal = ngo.goal || 500000; 
        const pct = Math.round((received / goal) * 100);
        const fillCls = pct < 20 ? 'urgent' : pct < 50 ? 'medium' : '';
        const isSchool = (ngo.category === 'Education' || ngo.type === 'school');

        const card = document.createElement('div');
        card.className = 'col-md-6 col-lg-4 reveal active';
        card.innerHTML = `
            <div class="ngo-card">
                <div class="ngo-card-header">
                    <div>
                        <span class="ngo-type-badge ${isSchool ? 'school' : 'ngo'}">
                            ${isSchool ? '🏫 School' : '🏢 NGO'}
                        </span>
                        ${ngo.urgent ? '<br><span class="urgent-tag mt-1 d-inline-block">🆘 Urgent</span>' : ''}
                    </div>
                    <span class="ngo-status-badge ${ngo.verified ? 'verified' : 'demo'}">
                        <span>${ngo.verified ? '🟢' : '🟡'}</span> ${ngo.verified ? 'Verified' : 'Demo'}
                    </span>
                </div>
                <h6 class="ngo-title">${ngo.name}</h6>
                <p class="ngo-city"><i class="bi bi-geo-alt-fill me-1"></i>${ngo.city || 'Pakistan'}</p>
                <p class="text-muted small mb-3" style="font-size:0.82rem;">${ngo.description || 'Verified organization making a local impact.'}</p>
                <div class="ngo-progress-label">
                    <span>Received</span>
                    <strong>Rs. ${received.toLocaleString()} / Rs. ${goal.toLocaleString()}</strong>
                </div>
                <div class="ngo-progress-bar">
                    <div class="ngo-progress-fill ${fillCls}" style="width:${pct}%"></div>
                </div>
                <div class="ngo-footer">
                    <span class="text-muted small">${pct}% funded</span>
                    <button class="ngo-donate-btn" onclick="quickDonate('${ngo.id}')">
                        <i class="bi bi-heart me-1"></i>Donate
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function updateDonateSelect() {
    const sel = document.getElementById('donateNGO');
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = '<option value="">-- Choose an NGO --</option>';
    ngoData.forEach(n => {
        const opt = document.createElement('option');
        opt.value = n.id;
        opt.textContent = n.name;
        sel.appendChild(opt);
    });
    sel.value = currentVal;
}

// ================================================
// ACTIONS (WATCH & DONATE)
// ================================================

let videoWatching = false;
let timerInterval = null;

function startResetTimer() {
    if (timerInterval) return;
    const timerEl = document.getElementById('resetTimer');
    if (!timerEl) return;

    timerInterval = setInterval(() => {
        if (!userData || !userData.lastAdReset) return;
        
        const now = new Date();
        const lastReset = userData.lastAdReset.toDate();
        const nextReset = new Date(lastReset.getTime() + 6 * 60 * 60 * 1000);
        const diff = nextReset - now;

        if (diff <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            timerEl.textContent = "00:00:00";
            // The onSnapshot listener will handle the actual reset
            return;
        }

        const h = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
        const s = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');
        timerEl.textContent = `${h}:${m}:${s}`;
    }, 1000);
}

window.watchVideo = function () {
    if (!userData || videoWatching) return;
    if (userData.videosToday >= 10) {
        // Limit reached UI is already shown by updateDashboardUI
        return;
    }

    videoWatching = true;
    const btn = document.getElementById('watchBtn');
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i>';
    btn.style.cursor = 'not-allowed';

    let count = 3;
    btn.innerHTML = `<span style="font-size:1.2rem;font-weight:700">${count}</span>`;
    const countdown = setInterval(() => {
        count--;
        if (count > 0) {
            btn.innerHTML = `<span style="font-size:1.2rem;font-weight:700">${count}</span>`;
        } else {
            clearInterval(countdown);
            completeVideoWatch();
        }
    }, 1000);
};

async function completeVideoWatch() {
    let baseCredits = 10;
    let bonusCredits = 0;
    const newVideosToday = (userData.videosToday || 0) + 1;

    // Bonus Logic
    if (newVideosToday === 3) bonusCredits = 30;
    else if (newVideosToday === 5) bonusCredits = 50;
    else if (newVideosToday === 10) bonusCredits = 150;

    const totalEarned = baseCredits + bonusCredits;
    const newCredits = (userData.credits || 0) + totalEarned;
    
    // Streak Logic
    let newStreak = userData.streak || 0;
    const now = new Date();
    const lastVideoDate = userData.lastVideoDate ? userData.lastVideoDate.toDate() : null;

    if (!lastVideoDate) {
        newStreak = 1;
    } else {
        const hoursSinceLast = (now - lastVideoDate) / (1000 * 60 * 60);
        if (hoursSinceLast > 24) {
            newStreak = 1;
        } else if (hoursSinceLast >= 12) {
            newStreak += 1;
        }
    }

    try {
        await db.collection('users').doc(currentUser.uid).update({
            credits: newCredits,
            videosToday: newVideosToday,
            streak: newStreak,
            lastVideoDate: firebase.firestore.FieldValue.serverTimestamp()
        });

        const toast = document.getElementById('creditsEarned');
        if (toast) {
            toast.innerHTML = `<i class="bi bi-check-circle-fill me-1"></i> +Rs. ${totalEarned} Earned!${bonusCredits > 0 ? ' (Bonus included)' : ''}`;
            toast.classList.remove('d-none');
            setTimeout(() => toast.classList.add('d-none'), 3000);
        }

        const btn = document.getElementById('watchBtn');
        if (btn) {
            btn.innerHTML = '<i class="bi bi-play-fill"></i>';
            btn.style.cursor = 'pointer';
        }
        videoWatching = false;
    } catch (error) {
        console.error("Watch failed:", error);
        videoWatching = false;
    }
}

window.processDonation = async function () {
    const ngoId = document.getElementById('donateNGO').value;
    const amount = parseInt(document.getElementById('donateAmount').value);

    if (!ngoId) { alert('Please select an NGO or school first.'); return; }
    if (!amount || amount < 50) { alert('The minimum donation amount is Rs. 50.'); return; }
    if (amount > userData.credits) { alert("You don't have enough credits. Please watch more ads to earn credits."); return; }

    const ngo = ngoData.find(n => n.id === ngoId);
    if (!ngo) return;

    try {
        const batch = db.batch();
        const userRef = db.collection('users').doc(currentUser.uid);
        
        // Atomic update for User
        batch.update(userRef, {
            credits: userData.credits - amount,
            totalDonated: (userData.totalDonated || 0) + amount,
            donatedThisMonth: (userData.donatedThisMonth || 0) + amount
        });

        // Atomic update for NGO (FIXED: Case-sensitive 'Ngos')
        const ngoRef = db.collection('Ngos').doc(ngoId);
        batch.update(ngoRef, {
            received: (ngo.received || 0) + amount
        });

        // Atomic creation of donation history
        const historyRef = db.collection('users').doc(currentUser.uid).collection('donations').doc();
        batch.set(historyRef, {
            ngoName: ngo.name,
            amount: amount,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();
        console.log("Donation successful, batch committed.");

        document.getElementById('modalMessage').textContent = `Rs. ${amount.toLocaleString()} donated to ${ngo.name}.`;
        document.getElementById('modalMeals').textContent = `${Math.floor(amount/100)} meals`;
        new bootstrap.Modal(document.getElementById('donationModal')).show();

        document.getElementById('donateAmount').value = '';
        document.getElementById('donateNGO').value = '';
    } catch (error) {
        console.error("Donation process failed:", error);
        alert("Donation failed! Error: " + error.message);
    }
};

// ================================================
// LEADERBOARD (REAL-TIME)
// ================================================

function initRealtimeLeaderboard() {
    db.collection('users')
      .orderBy('donatedThisMonth', 'desc')
      .limit(10)
      .onSnapshot(snap => {
          const list = document.getElementById('leaderboardList');
          if (!list) return;

          list.innerHTML = '';
          let rank = 1;
          
          snap.forEach(doc => {
              const u = doc.data();
              const isMe = currentUser && u.uid === currentUser.uid;
              
              const item = document.createElement('div');
              item.className = `leaderboard-item ${isMe ? 'is-me' : ''}`;
              item.innerHTML = `
                  <div class="leader-left">
                      <div class="leader-rank">${rank}</div>
                      <div class="leader-info">
                          <strong class="leader-name">${u.name} ${isMe ? '(You)' : ''}</strong>
                          <p class="text-muted small mb-0">${u.city || 'Pakistan'}</p>
                      </div>
                  </div>
                  <div class="leader-right text-end">
                      <strong class="text-success">Rs. ${u.donatedThisMonth?.toLocaleString() || 0}</strong>
                      <p class="text-muted small mb-0">this month</p>
                  </div>
              `;
              list.appendChild(item);

              if (isMe) {
                  safeSetText('userRank', rank);
                  // Optionally update userData.rank in Firestore if you want it persistent
              }
              rank++;
          });
      });
}

// ================================================
// PROFILE SETTINGS
// ================================================

function updateProfileModal() {
    if (!userData) return;
    safeSetVal('profileFirstName', userData.name?.split(' ')[0] || '');
    safeSetVal('profileLastName', userData.name?.split(' ').slice(1).join(' ') || '');
    safeSetVal('profileCity', userData.city || '');
    safeSetVal('profileBio', userData.bio || '');
    safeSetText('profileEmailDisplay', userData.email || '—');
    
    if (userData.joinedAt) {
        safeSetText('profileJoinedDate', userData.joinedAt.toDate().toLocaleDateString());
    }
}

window.saveProfile = async function() {
    if (!currentUser) return;
    
    const fName = document.getElementById('profileFirstName').value.trim();
    const lName = document.getElementById('profileLastName').value.trim();
    const city = document.getElementById('profileCity').value.trim();
    const bio = document.getElementById('profileBio').value.trim();
    
    const btn = document.getElementById('saveProfileBtn');
    const text = document.getElementById('saveProfileBtnText');
    const spinner = document.getElementById('saveProfileSpinner');
    
    text.textContent = 'Saving...';
    spinner.classList.remove('d-none');
    btn.disabled = true;

    try {
        await db.collection('users').doc(currentUser.uid).update({
            name: `${fName} ${lName}`.trim(),
            city: city,
            bio: bio
        });
        
        const msg = document.getElementById('profileSaveMsg');
        msg.textContent = '✅ Profile updated successfully!';
        msg.classList.remove('d-none');
        setTimeout(() => msg.classList.add('d-none'), 3000);
    } catch (error) {
        console.error("Save failed:", error);
    } finally {
        text.textContent = 'Save Profile';
        spinner.classList.add('d-none');
        btn.disabled = false;
    }
};

window.openProfileSettings = function() {
    const modal = new bootstrap.Modal(document.getElementById('profileSettingsModal'));
    modal.show();
};

// ================================================
// HELPERS
// ================================================

function safeSetText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function safeSetVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}

window.setAmount = function (amt) {
    const input = document.getElementById('donateAmount');
    if (input) {
        input.value = amt;
        // Trigger impact preview
        const meals = Math.floor(amt / 100);
        safeSetText('impactAmt', amt.toLocaleString());
        safeSetText('mealCount', meals.toLocaleString());
    }
};

// Update impact preview in real-time
document.getElementById('donateAmount')?.addEventListener('input', function() {
    const amt = parseInt(this.value) || 0;
    const meals = Math.floor(amt / 100);
    safeSetText('impactAmt', amt.toLocaleString());
    safeSetText('mealCount', meals.toLocaleString());
});

window.quickDonate = function (ngoId) {
    const sel = document.getElementById('donateNGO');
    if (sel) {
        sel.value = ngoId;
        window.setAmount(100);
        document.getElementById('donate-section').scrollIntoView({ behavior: 'smooth' });
    }
};

window.scrollToNGO = function() {
    document.getElementById('ngo-list')?.scrollIntoView({ behavior: 'smooth' });
};

// ================================================
// INIT
// ================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("Dashboard Loaded. Initializing...");
    initRealtimeNGOs();
    initRealtimeLeaderboard();

    // ── SCROLL REVEAL LOGIC (Fixes blank page) ──
    const reveals = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });

    reveals.forEach(el => revealObserver.observe(el));

    // Fallback: If intersection observer fails, show everything after 2s
    setTimeout(() => {
        reveals.forEach(el => el.classList.add('active'));
    }, 2000);

    // Filter Buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderNGOs();
        });
    });

    // Bio character count
    document.getElementById('profileBio')?.addEventListener('input', function() {
        safeSetText('bioCharCount', `${this.value.length} / 120`);
    });
});
