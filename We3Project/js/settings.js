// ================================================
//   FREEHUNGER — settings.js
//   Profile Management & Unique Username System
// ================================================

const db = firebase.firestore();
let currentUser = null;
let currentUsername = "";
let selectedEmoji = "😊";
let selectedColor = "#f3f4f6";
let selectedImgBase64 = null;

// ================================================
// 1. AUTH & DATA INITIALIZATION
// ================================================
firebase.auth().onAuthStateChanged(user => {
    if (!user) {
        window.location.href = 'login.html';
    } else {
        currentUser = user;
        loadUserProfile();
    }
});

async function loadUserProfile() {
    const doc = await db.collection('users').doc(currentUser.uid).get();
    if (doc.exists) {
        const data = doc.data();
        currentUsername = data.username || "";
        
        // Populate inputs
        document.getElementById('usernameInput').value = currentUsername;
        document.getElementById('cityInput').value = data.city || "";
        document.getElementById('bioInput').value = data.bio || "";
        document.getElementById('emailDisplay').textContent = currentUser.email;
        
        if (data.joinedAt) {
            document.getElementById('joinedDisplay').textContent = data.joinedAt.toDate().toLocaleDateString();
        }

        // Bio counter init
        updateBioCounter(data.bio || "");

        // Avatar init
        if (data.avatarType === 'image') {
            showImagePreview(data.avatarValue);
            selectedImgBase64 = data.avatarValue;
        } else {
            selectedEmoji = data.avatarValue || "😊";
            selectedColor = data.avatarBg || "#f3f4f6";
            showEmojiPreview(selectedEmoji, selectedColor);
        }

        // Highlight active choices in grid
        highlightActiveEmoji(selectedEmoji);
        highlightActiveColor(selectedColor);
    }
}

// ================================================
// 2. USERNAME UNIQUENESS SYSTEM
// ================================================
let usernameTimeout = null;
document.getElementById('usernameInput').addEventListener('input', function(e) {
    const username = e.target.value.trim().toLowerCase();
    const statusEl = document.getElementById('usernameStatus');
    
    // Clear previous timeout
    if (usernameTimeout) clearTimeout(usernameTimeout);
    
    if (username === "") {
        statusEl.innerHTML = "";
        return;
    }

    if (username === currentUsername) {
        statusEl.innerHTML = '<span class="text-success">This is your current username.</span>';
        return;
    }

    if (username.length < 3) {
        statusEl.innerHTML = '<span class="text-danger">Username must be at least 3 characters.</span>';
        return;
    }

    statusEl.innerHTML = '<span class="text-muted"><i class="spinner-border spinner-border-sm me-1"></i>Checking availability...</span>';

    usernameTimeout = setTimeout(async () => {
        const isAvailable = await checkUsernameAvailability(username);
        if (isAvailable) {
            statusEl.innerHTML = `<span class="text-success">@${username} is available!</span>`;
        } else {
            statusEl.innerHTML = `<span class="text-danger">@${username} is already taken.</span>`;
        }
    }, 500);
});

async function checkUsernameAvailability(username) {
    const snapshot = await db.collection('users').where('username', '==', username).get();
    return snapshot.empty;
}

// ================================================
// 3. AVATAR CUSTOMIZATION
// ================================================
const emojis = ["😊", "😎", "🐱", "🐶", "🦁", "🐼", "🦊", "🐯", "🤖", "🚀", "🍕", "🍔"];
const colors = ["#f3f4f6", "#fee2e2", "#fef3c7", "#d1fae5", "#dbeafe", "#ede9fe", "#fae8ff", "#ffedd5", "#ecfdf5", "#f0fdf4", "#fff7ed", "#fff1f2"];

const emojiGrid = document.getElementById('emojiGrid');
const colorGrid = document.getElementById('colorGrid');

emojis.forEach(emoji => {
    const el = document.createElement('div');
    el.className = 'emoji-item';
    el.textContent = emoji;
    el.onclick = () => {
        selectedEmoji = emoji;
        selectedImgBase64 = null; // Clear image if emoji is picked
        showEmojiPreview(selectedEmoji, selectedColor);
        highlightActiveEmoji(emoji);
    };
    emojiGrid.appendChild(el);
});

colors.forEach(color => {
    const el = document.createElement('div');
    el.className = 'color-item';
    el.style.backgroundColor = color;
    el.onclick = () => {
        selectedColor = color;
        showEmojiPreview(selectedEmoji, selectedColor);
        highlightActiveColor(color);
    };
    colorGrid.appendChild(el);
});

function showEmojiPreview(emoji, color) {
    const preview = document.getElementById('avatarPreview');
    const emojiEl = document.getElementById('previewEmoji');
    const imgEl = document.getElementById('previewImg');
    
    preview.style.backgroundColor = color;
    emojiEl.textContent = emoji;
    emojiEl.style.display = 'block';
    imgEl.style.display = 'none';
}

function showImagePreview(base64) {
    const emojiEl = document.getElementById('previewEmoji');
    const imgEl = document.getElementById('previewImg');
    const preview = document.getElementById('avatarPreview');
    
    preview.style.backgroundColor = 'white';
    emojiEl.style.display = 'none';
    imgEl.src = base64;
    imgEl.style.display = 'block';
}

function highlightActiveEmoji(emoji) {
    document.querySelectorAll('.emoji-item').forEach(el => {
        el.classList.toggle('active', el.textContent === emoji);
    });
}

function highlightActiveColor(color) {
    document.querySelectorAll('.color-item').forEach(el => {
        el.classList.toggle('active', el.style.backgroundColor === color || rgbToHex(el.style.backgroundColor) === color);
    });
}

// Handle Image Upload
document.getElementById('avatarUpload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            selectedImgBase64 = event.target.result;
            showImagePreview(selectedImgBase64);
            // Clear emoji highlighting
            highlightActiveEmoji(null);
        };
        reader.readAsDataURL(file);
    }
});

// ================================================
// 4. FORM LOGIC (SAVE & LOGOUT)
// ================================================
document.getElementById('bioInput').addEventListener('input', function(e) {
    updateBioCounter(e.target.value);
});

function updateBioCounter(text) {
    document.getElementById('bioCounter').textContent = `${text.length} / 120`;
}

document.getElementById('settingsForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('saveBtn');
    const username = document.getElementById('usernameInput').value.trim().toLowerCase();
    const city = document.getElementById('cityInput').value.trim();
    const bio = document.getElementById('bioInput').value.trim();
    
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

    // 1. Final check for username uniqueness
    if (username !== currentUsername) {
        const isAvailable = await checkUsernameAvailability(username);
        if (!isAvailable) {
            alert("This username is already taken. Please choose another one.");
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i> Save Profile';
            return;
        }
    }

    // 2. Prepare Data
    const updateData = {
        username: username,
        name: username, // Use username as the primary display name
        city: city,
        bio: bio,
        avatarType: selectedImgBase64 ? 'image' : 'emoji',
        avatarValue: selectedImgBase64 || selectedEmoji,
        avatarBg: selectedColor
    };

    try {
        await db.collection('users').doc(currentUser.uid).update(updateData);
        
        // Also update Firebase Auth profile (displayName)
        await currentUser.updateProfile({
            displayName: username
        });

        currentUsername = username;
        alert("Profile updated successfully!");
        window.location.href = 'dashboard.html';
    } catch (error) {
        console.error("Save failed:", error);
        alert("Error saving profile: " + error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i> Save Profile';
    }
});

window.handleLogout = function() {
    if (confirm("Are you sure you want to logout?")) {
        firebase.auth().signOut().then(() => {
            window.location.href = 'index.html';
        });
    }
};

// HELPER: Convert RGB to Hex
function rgbToHex(rgb) {
    if (!rgb) return "";
    const res = rgb.match(/\d+/g);
    if (!res) return rgb;
    return "#" + res.map(x => {
        const hex = parseInt(x).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }).join("");
}
