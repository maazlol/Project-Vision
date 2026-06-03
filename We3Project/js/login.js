// Firebase references
const auth = firebase.auth();
const db   = firebase.firestore();

// 1. AUTH STATE CHECK
auth.onAuthStateChanged(async (user) => {
    // If user exists, but we are on login page, only redirect if they are fully set up
    if (user && user.emailVerified) {
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists && userDoc.data().username) {
                // If they have a username, go to home
                window.location.href = 'index.html';
            } else if (!userDoc.exists || !userDoc.data().username) {
                // If Google user has no username yet, show modal (if not already showing)
                const modalEl = document.getElementById('usernameModal');
                if (modalEl && !document.querySelector('.modal.show')) {
                    new bootstrap.Modal(modalEl).show();
                }
            }
        } catch (e) {
            console.error("Error checking user doc:", e);
        }
    }
});

// 2. INITIALIZE ON LOAD
document.addEventListener('DOMContentLoaded', () => {
    // Tab switching
    const tabLogin = document.getElementById('tabLogin');
    const tabSignup = document.getElementById('tabSignup');
    
    if (tabLogin) tabLogin.onclick = () => switchTab('login');
    if (tabSignup) tabSignup.onclick = () => switchTab('signup');

    // Button clicks
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const googleBtn = document.getElementById('googleLoginBtn');
    const saveGoogleBtn = document.getElementById('saveGoogleUsernameBtn');
    const forgotBtn = document.getElementById('forgotBtn');

    if (loginBtn) loginBtn.onclick = loginWithEmail;
    if (signupBtn) signupBtn.onclick = registerUser;
    if (googleBtn) googleBtn.onclick = loginWithGoogle;
    if (saveGoogleBtn) saveGoogleBtn.onclick = saveGoogleUsername;
    if (forgotBtn) forgotBtn.onclick = handleForgotPassword;

    // Password toggles
    const tglLogin = document.getElementById('toggleLoginPass');
    const tglSignup = document.getElementById('toggleSignupPass');

    if (tglLogin) tglLogin.onclick = () => togglePass('loginPassword', 'toggleLoginPass');
    if (tglSignup) tglSignup.onclick = () => togglePass('signupPassword', 'toggleSignupPass');

    // Real-time username check
    const signupUserField = document.getElementById('signupUsername');
    if (signupUserField) {
        signupUserField.addEventListener('input', debounce(async (e) => {
            const val = e.target.value.trim().toLowerCase();
            const statusEl = document.getElementById('usernameStatus');
            if (val.length < 3) {
                statusEl.classList.add('d-none');
                return;
            }
            statusEl.classList.remove('d-none');
            statusEl.innerHTML = '<span class="text-muted">Checking...</span>';
            
            const isUnique = await checkUsernameUnique(val);
            if (isUnique) {
                statusEl.innerHTML = '<span class="username-available">✅ Username available</span>';
            } else {
                statusEl.innerHTML = '<span class="username-taken">❌ Username already taken</span>';
            }
        }, 500));
    }
});

// 3. VALIDATION HELPERS
function validatePassword(pw) {
    // Min 8 Chars, 1 Letter, 1 Number
    return pw.length >= 8 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw);
}

async function checkUsernameUnique(username) {
    const res = await db.collection('users').where('username', '==', username).get();
    return res.empty;
}

// 4. SIGNUP LOGIC
async function registerUser() {
    const username = document.getElementById('signupUsername')?.value.trim().toLowerCase();
    const email = document.getElementById('signupEmail')?.value.trim();
    const password = document.getElementById('signupPassword')?.value;
    const agreed = document.getElementById('agreeTerms')?.checked;

    clearStatus();
    if (!username || !email || !password) return showError('signupError', 'Please fill all fields.');
    if (username.length < 3) return showError('signupError', 'Username too short (min 3 chars).');
    if (!validatePassword(password)) return showError('signupError', 'Password must be 8+ chars with letters & numbers.');
    if (!agreed) return showError('signupError', 'Please agree to the Terms.');

    setLoading('signup', true);
    try {
        const isUnique = await checkUsernameUnique(username);
        if (!isUnique) throw new Error('Username already taken!');

        const res = await auth.createUserWithEmailAndPassword(email, password);
        await res.user.sendEmailVerification();
        
        await db.collection('users').doc(res.user.uid).set({
            uid: res.user.uid,
            email: email,
            username: username,
            credits: 0,
            joinedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showSuccess('signupSuccess', "Account created! Please verify your email. Check your inbox.");
        setTimeout(() => switchTab('login'), 3000);
    } catch (err) {
        showError('signupError', err.message);
    }
    setLoading('signup', false);
}

// 5. LOGIN LOGIC
async function loginWithEmail() {
    const email = document.getElementById('loginEmail')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;

    clearStatus();
    if (!email || !password) return showError('loginError', 'Enter email and password.');

    setLoading('login', true);
    try {
        const res = await auth.signInWithEmailAndPassword(email, password);
        if (!res.user.emailVerified) {
            showError('loginError', "Email not verified! Check your inbox.");
            // Add resend link
            const errEl = document.getElementById('loginError');
            if (errEl) {
                const resendLink = document.createElement('a');
                resendLink.href = '#';
                resendLink.className = 'ms-2 text-decoration-underline fw-bold';
                resendLink.textContent = 'Resend?';
                resendLink.onclick = (e) => {
                    e.preventDefault();
                    resendVerification(res.user);
                };
                errEl.appendChild(resendLink);
            }
            await auth.signOut();
        } else {
            // Explicitly redirect after successful login
            const userDoc = await db.collection('users').doc(res.user.uid).get();
            if (userDoc.exists && userDoc.data().username) {
                window.location.href = 'index.html';
            } else {
                // If for some reason username is missing, show modal (rare for email users)
                const modalEl = document.getElementById('usernameModal');
                if (modalEl) new bootstrap.Modal(modalEl).show();
            }
        }
    } catch (err) {
        showError('loginError', "Invalid login details or account not found.");
    }
    setLoading('login', false);
}

async function resendVerification(user) {
    try {
        await user.sendEmailVerification();
        showSuccess('loginError', "Verification email sent again! Please check your inbox.");
    } catch (err) {
        showError('loginError', "Too many requests. Please try again later.");
    }
}

// 6. FORGOT PASSWORD
async function handleForgotPassword(e) {
    if (e) e.preventDefault();
    const email = document.getElementById('loginEmail')?.value.trim();
    
    clearStatus();
    if (!email) return showError('loginError', 'Please enter your email above first.');

    try {
        await auth.sendPasswordResetEmail(email);
        showSuccess('loginError', "Reset link sent! Please check your email."); 
        // Note: reusing error box for success to keep it simple, or I could add loginSuccess
    } catch (err) {
        showError('loginError', err.message);
    }
}

// 7. GOOGLE LOGIN
async function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    clearStatus();
    try {
        const res = await auth.signInWithPopup(provider);
        const doc = await db.collection('users').doc(res.user.uid).get();
        if (!doc.exists || !doc.data().username) {
            const modalEl = document.getElementById('usernameModal');
            if (modalEl) new bootstrap.Modal(modalEl).show();
        } else {
            window.location.href = 'index.html';
        }
    } catch (err) {
        showError('loginError', err.message);
    }
}

async function saveGoogleUsername() {
    const user = auth.currentUser;
    const username = document.getElementById('googleUsername')?.value.trim().toLowerCase();
    const errorEl = document.getElementById('googleUsernameError');
    
    if (!username || username.length < 3) {
        errorEl.textContent = "Username must be 3+ chars.";
        errorEl.classList.remove('d-none');
        return;
    }

    try {
        const isUnique = await checkUsernameUnique(username);
        if (isUnique) {
            await db.collection('users').doc(user.uid).set({
                uid: user.uid,
                email: user.email,
                username: username,
                credits: 0,
                joinedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            window.location.href = 'index.html';
        } else {
            errorEl.textContent = "Username already taken!";
            errorEl.classList.remove('d-none');
        }
    } catch (e) {
        console.error(e);
        errorEl.textContent = "Error saving username.";
        errorEl.classList.remove('d-none');
    }
}

// UI HELPERS
function switchTab(tab) {
    const lForm = document.getElementById('loginForm');
    const sForm = document.getElementById('signupForm');
    const tLog = document.getElementById('tabLogin');
    const tSign = document.getElementById('tabSignup');

    clearStatus();
    if (lForm && sForm) {
        lForm.classList.toggle('d-none', tab !== 'login');
        sForm.classList.toggle('d-none', tab !== 'signup');
    }
    if (tLog && tSign) {
        tLog.classList.toggle('active', tab === 'login');
        tSign.classList.toggle('active', tab === 'signup');
    }
}

function togglePass(id, btnId) {
    const input = document.getElementById(id);
    const btn = document.getElementById(btnId);
    if (input) {
        const isPass = input.type === 'password';
        input.type = isPass ? 'text' : 'password';
        if (btn) btn.innerHTML = isPass ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
    }
}

function showError(id, msg) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = msg;
        el.classList.remove('d-none');
        el.classList.replace('auth-success', 'auth-error'); // just in case
    }
}

function showSuccess(id, msg) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = msg;
        el.classList.remove('d-none');
        // Ensure it uses the success style
        if (id.includes('Error')) {
             el.classList.replace('auth-error', 'auth-success');
        } else {
             el.classList.add('auth-success');
        }
    }
}

function clearStatus() {
    const ids = ['loginError', 'signupError', 'signupSuccess', 'googleUsernameError'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('d-none');
            if (id.includes('Error')) el.classList.replace('auth-success', 'auth-error');
        }
    });
}

function setLoading(form, loading) {
    const btnText = document.getElementById(form + 'BtnText');
    const spinner = document.getElementById(form + 'Spinner');
    if (spinner) spinner.classList.toggle('d-none', !loading);
    if (btnText) btnText.style.opacity = loading ? '0.5' : '1';
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}