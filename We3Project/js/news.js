// news.js (Bina import wala version)

// Initialize Firestore
const db = firebase.firestore();

// News container ID
const newsContainer = document.getElementById('news-container');

// Functions (Same logic, no change)
function getBadgeClass(category) {
    const categories = {
        'Food Rescue': 'badge-food',
        'Education': 'badge-education',
        'Water Project': 'badge-water',
        'Emergency': 'badge-emergency',
        'Success Story': 'badge-success'
    };
    return categories[category] || 'badge-food';
}

function getIconForCategory(category) {
    const icons = {
        'Food Rescue': 'cup-straw',
        'Education': 'book',
        'Water Project': 'droplet',
        'Emergency': 'megaphone',
        'Success Story': 'star'
    };
    return icons[category] || 'newspaper';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(timestamp) {
    if (!timestamp) return 'Just now';
    // Firestore timestamp ko JS Date mein convert karna
    let date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000 || timestamp);
    return date.toLocaleDateString('en-PK', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
    });
}

// Main function
async function fetchNews() {
    if (!newsContainer) return;
    
    newsContainer.innerHTML = `<div class="col-12 text-center"><p>Loading...</p></div>`;
    
    try {
        // Humne compat version use kiya hai (v8 style)
        const querySnapshot = await db.collection("news")
            .orderBy("timestamp", "desc")
            .limit(20)
            .get();
        
        if (querySnapshot.empty) {
            newsContainer.innerHTML = '<div class="col-12 text-center"><p>No news updates found.</p></div>';
            return;
        }

        let allCards = '';
        querySnapshot.forEach((doc) => {
            const news = doc.data();
            allCards += `
                <div class="col-lg-4 col-md-6 mb-4">
                    <div class="news-card">
                        <div class="news-card-body">
                            <span class="news-badge ${getBadgeClass(news.category)}">
                                <i class="bi bi-${getIconForCategory(news.category)} me-1"></i>
                                ${news.category || 'Update'}
                            </span>
                            <h4 class="news-title">${escapeHtml(news.title)}</h4>
                            <p class="news-description">${escapeHtml(news.description)}</p>
                            <div class="news-meta">
                                <span class="news-date"><i class="bi bi-calendar3"></i> ${formatDate(news.timestamp)}</span>
                                ${news.location ? `<span><i class="bi bi-geo-alt"></i> ${escapeHtml(news.location)}</span>` : ''}
                            </div>
                        </div>
                    </div>
                </div>`;
        });
        newsContainer.innerHTML = allCards;

    } catch (error) {
        console.error("Error fetching news:", error);
        newsContainer.innerHTML = `<div class="col-12 text-center"><p class="text-danger">Error loading data. ${error.message}</p></div>`;
    }
}

document.addEventListener('DOMContentLoaded', fetchNews);