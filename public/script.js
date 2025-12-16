
// API Configuration
const API_URL = '/cats';

// DOM Elements
const gallery = document.getElementById('gallery');
const catForm = document.getElementById('cat-form');
const catModal = document.getElementById('cat-modal');
const confirmModal = document.getElementById('confirm-modal');
const modalTitle = document.getElementById('modal-title');
const catCountElement = document.getElementById('cat-count');

// State Variables
let currentCatId = null;
let catToDeleteId = null;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    fetchCats('', 1);
    fetchTags();
    setupEventListeners();
});

// --- API FUNCTIONS ---

// Pagination State
let currentPage = 1;
const itemsPerPage = 6;

function fetchCats(searchTerm = '', page = 1) {
    gallery.innerHTML = '<p style="text-align:center; grid-column:1/-1;">Loading cats...</p>';
    currentPage = page;

    let url = API_URL;
    let params = [];

    // Always add pagination params
    params.push(`page=${page}`);
    params.push(`limit=${itemsPerPage}`);

    if (searchTerm) {
        params.push(`search=${encodeURIComponent(searchTerm)}`);
    }

    const tagFilter = document.getElementById('tag-filter').value;
    if (tagFilter) {
        params.push(`tag=${encodeURIComponent(tagFilter)}`);
    }

    if (params.length > 0) {
        url += `?${params.join('&')}`;
    }

    fetch(url)
        .then(res => res.json())
        .then(response => {
            // Handle both old array format (fallback) and new object format
            let data = response;
            let meta = null;

            if (!Array.isArray(response) && response.data) {
                data = response.data;
                meta = response.meta;
            }

            if (Array.isArray(data)) {
                renderCats(data);
                if (meta) {
                    renderPagination(meta);
                    updateCatCount(meta.totalItems);
                } else {
                    // Fallback if no meta (e.g. old API) or empty
                    document.getElementById('pagination-controls').style.display = 'none';
                    updateCatCount(data.length);
                }
            } else {
                console.error('Invalid data:', response);
                gallery.innerHTML = '<p class="error">Error loading cats from database.</p>';
            }
        })
        .catch(err => {
            console.error('Fetch error:', err);
            gallery.innerHTML = '<p class="error">Could not connect to database.</p>';
        });
}

function renderPagination(meta) {
    const controls = document.getElementById('pagination-controls');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');

    if (meta.totalPages <= 1) {
        controls.style.display = 'none';
        return;
    }

    controls.style.display = 'flex';
    pageInfo.textContent = `Page ${meta.currentPage} sur ${meta.totalPages}`;

    prevBtn.disabled = meta.currentPage <= 1;
    nextBtn.disabled = meta.currentPage >= meta.totalPages;
}

// Fetch distinct tags and populate dropdown

// Fetch distinct tags and populate dropdown
function fetchTags() {
    fetch('/tags')
        .then(res => res.json())
        .then(tags => {
            const tagFilter = document.getElementById('tag-filter');
            // Keep the first option (Tous les tags)
            const defaultOption = tagFilter.firstElementChild;
            tagFilter.innerHTML = '';
            tagFilter.appendChild(defaultOption);

            if (Array.isArray(tags)) {
                tags.forEach(tag => {
                    const option = document.createElement('option');
                    option.value = tag;
                    option.textContent = tag.charAt(0).toUpperCase() + tag.slice(1); // Capitalize
                    tagFilter.appendChild(option);
                });
            }
        })
        .catch(err => console.error('Error fetching tags:', err));
}

function addCat(catData) {
    fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(catData)
    })
        .then(res => res.json())
        .then(() => {
            showNotification('Cat added successfully!', 'success');
            fetchCats();
            closeModals();
        })
        .catch(err => {
            console.error('Error adding cat:', err);
            showNotification('Error adding cat.', 'error');
        });
}

function updateCat(id, catData) {
    fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(catData)
    })
        .then(res => res.json())
        .then(() => {
            showNotification('Cat updated successfully!', 'success');
            fetchCats();
            closeModals();
        })
        .catch(err => {
            console.error('Error updating cat:', err);
            showNotification('Error updating cat.', 'error');
        });
}

function deleteCat(id) {
    fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
    })
        .then(() => {
            showNotification('Cat deleted successfully!', 'info');
            fetchCats();
            closeModals();
        })
        .catch(err => {
            console.error('Error deleting cat:', err);
            showNotification('Error deleting cat.', 'error');
        });
}

// --- RENDER FUNCTIONS ---

function renderCats(cats) {
    gallery.innerHTML = '';

    if (cats.length === 0) {
        gallery.innerHTML = '<p style="text-align:center; grid-column:1/-1;">No cats found in database. Add one!</p>';
        return;
    }

    cats.forEach(cat => {
        const card = createCatCard(cat);
        gallery.appendChild(card);
    });
}

function createCatCard(cat) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = cat.id;

    // Backend: name, descreption, tag, img
    const imgSrc = cat.img || '';
    const name = escapeHtml(cat.name);
    const desc = escapeHtml(cat.descreption);
    const tag = escapeHtml(cat.tag);

    let imageHTML = '';
    if (imgSrc) {
        // Safe onerror handler that replaces the image with the icon placeholder if loading fails
        const fallbackHTML = `<div class="image-placeholder"><i class="fas fa-cat"></i><div>${name}</div></div>`;
        // We use a function for onerror to handle the DOM manipulation cleanly
        imageHTML = `
            <div class="cat-image">
                <img src="${imgSrc}" alt="${name}" loading="lazy" 
                onerror="this.parentElement.innerHTML='<div class=\\'image-placeholder\\'><i class=\\'fas fa-cat\\'></i><div>${escapeHtml(name)}</div></div>'">
            </div>
        `;
    } else {
        imageHTML = `
             <div class="cat-image">
                <div class="image-placeholder">
                    <i class="fas fa-cat"></i>
                    <div>${name}</div>
                </div>
             </div>
        `;
    }

    card.innerHTML = `
        ${imageHTML}
        <div class="card-header">
            <h2 class="card-title">${name}</h2>
            <p class="card-description">${desc}</p>
            <span class="card-tag">${tag}</span>
        </div>
        <div class="card-body">
            <div class="card-actions">
                <button class="btn btn-edit" data-id="${cat.id}" 
                    data-name="${name}" data-desc="${desc}" data-tag="${tag}" data-img="${escapeHtml(imgSrc)}">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-delete" data-id="${cat.id}">
                    <i class="fas fa-trash-alt"></i> Delete
                </button>
            </div>
        </div>
    `;

    return card;
}

// --- EVENT HANDLERS ---

function setupEventListeners() {
    document.getElementById('add-cat-btn').addEventListener('click', () => {
        openCatModal();
    });

    // Search listeners
    const searchInput = document.getElementById('cat-search');
    const searchBtn = document.getElementById('search-btn');
    const tagFilter = document.getElementById('tag-filter');

    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    tagFilter.addEventListener('change', () => {
        const searchTerm = searchInput.value.trim();
        fetchCats(searchTerm, 1); // Reset to page 1
    });

    document.getElementById('reset-btn').addEventListener('click', () => {
        searchInput.value = '';
        tagFilter.value = '';
        fetchCats('', 1);
    }); // Re-fetch from DB

    // Pagination Listeners
    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            const searchTerm = searchInput.value.trim();
            fetchCats(searchTerm, currentPage - 1);
        }
    });

    document.getElementById('next-page').addEventListener('click', () => {
        const searchTerm = searchInput.value.trim();
        fetchCats(searchTerm, currentPage + 1);
    });

    document.querySelectorAll('.close-btn, .btn-cancel').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    window.addEventListener('click', (event) => {
        if (event.target === catModal || event.target === confirmModal) {
            closeModals();
        }
    });

    catForm.addEventListener('submit', handleFormSubmit);

    document.querySelector('.btn-delete-confirm').addEventListener('click', () => {
        if (catToDeleteId) {
            deleteCat(catToDeleteId);
        }
    });

    gallery.addEventListener('click', (event) => {
        const target = event.target;

        const editBtn = target.closest('.btn-edit');
        if (editBtn) {
            const id = editBtn.dataset.id;
            const catData = {
                id: id,
                name: editBtn.dataset.name,
                descreption: editBtn.dataset.desc,
                tag: editBtn.dataset.tag,
                img: editBtn.dataset.img
            };
            openCatModal(catData);
        }

        const deleteBtn = target.closest('.btn-delete');
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            openDeleteConfirm(id);
        }
    });
}

function handleSearch() {
    const searchTerm = document.getElementById('cat-search').value.trim();
    fetchCats(searchTerm, 1);
}

function handleFormSubmit(event) {
    event.preventDefault();
    const formData = new FormData(catForm);

    // Map form fields to backend schema
    const catData = {
        name: formData.get('name'),
        descreption: formData.get('description'),
        tag: formData.get('tag'),
        img: formData.get('image')
    };

    if (currentCatId) {
        updateCat(currentCatId, catData);
    } else {
        addCat(catData);
    }
}

function openCatModal(cat = null) {
    if (cat) {
        currentCatId = cat.id;
        modalTitle.textContent = 'Modifier le chat';
        document.getElementById('cat-name').value = cat.name;
        document.getElementById('cat-description').value = cat.descreption;
        document.getElementById('cat-tag').value = cat.tag;
        document.getElementById('cat-image').value = cat.img;
    } else {
        currentCatId = null;
        modalTitle.textContent = 'Ajouter un nouveau chat';
        catForm.reset();
    }
    catModal.style.display = 'flex';
}

function openDeleteConfirm(id) {
    catToDeleteId = id;
    confirmModal.style.display = 'flex';
}

function closeModals() {
    catModal.style.display = 'none';
    confirmModal.style.display = 'none';
    currentCatId = null;
    catToDeleteId = null;
}

function updateCatCount(count) {
    catCountElement.textContent = count;
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Afficher une notification
function showNotification(message, type) {
    // Supprimer les notifications existantes
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Créer la notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    // Style de la notification
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.padding = '15px 20px';
    notification.style.borderRadius = '6px';
    notification.style.color = 'white';
    notification.style.fontWeight = '600';
    notification.style.zIndex = '2000';
    notification.style.boxShadow = '0 5px 15px rgba(0,0,0,0.2)';
    notification.style.animation = 'slideIn 0.3s ease';

    // Couleurs selon le type
    if (type === 'success') {
        notification.style.backgroundColor = '#2ecc71';
    } else if (type === 'error') {
        notification.style.backgroundColor = '#e74c3c';
    } else {
        notification.style.backgroundColor = '#3498db';
    }

    // Ajouter au DOM
    document.body.appendChild(notification);

    // Supprimer après 3 secondes
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);

    // Ajouter les animations CSS si elles n'existent pas déjà
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}
