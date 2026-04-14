// script.js - вся логика работы с историями (с поддержкой глав)

// Хранилище историй
let stories = [];
let currentFilter = 'all';
let currentGenre = null;
let currentReadStory = null;
let currentChapterIndex = 0;
let searchQuery = '';
let currentUnsubscribe = null;
let isLoading = false;

// ========== ДОБАВЛЕНО ДЛЯ ЛАЙКОВ ==========
// Загружаем ID историй, которые пользователь уже лайкнул
let userLikedStories = new Set();

function loadUserLikes() {
    const saved = localStorage.getItem('storyhub_user_likes');
    if (saved) {
        userLikedStories = new Set(JSON.parse(saved));
    }
    console.log('Загружены лайки пользователя:', Array.from(userLikedStories));
}

function saveUserLikes() {
    localStorage.setItem('storyhub_user_likes', JSON.stringify(Array.from(userLikedStories)));
    console.log('Сохранены лайки пользователя:', Array.from(userLikedStories));
}

// Проверка, лайкнул ли пользователь эту историю
function hasUserLiked(storyId) {
    const result = userLikedStories.has(storyId);
    console.log(`Проверка лайка для истории ${storyId}: ${result}`);
    return result;
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

// Показать уведомление
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) {
        const newContainer = document.createElement('div');
        newContainer.id = 'toastContainer';
        newContainer.className = 'toast-container';
        document.body.appendChild(newContainer);
        return showToast(message, type);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Показать/скрыть индикатор загрузки
function showLoading(show) {
    const indicator = document.getElementById('loadingIndicator');
    if (indicator) {
        indicator.style.display = show ? 'block' : 'none';
    }
    isLoading = show;
}

// Валидация данных истории
function validateStoryData(data) {
    if (!data.title || data.title.trim().length < 3) {
        showToast('Название должно содержать минимум 3 символа', 'error');
        return false;
    }
    if (!data.author || data.author.trim().length < 2) {
        showToast('Укажите реальное имя автора', 'error');
        return false;
    }
    if (!data.chapters || data.chapters.length === 0) {
        showToast('Добавьте хотя бы одну главу', 'error');
        return false;
    }
    for (let i = 0; i < data.chapters.length; i++) {
        if (!data.chapters[i].content || data.chapters[i].content.trim().length < 10) {
            showToast(`Глава ${i + 1} должна содержать минимум 10 символов`, 'error');
            return false;
        }
    }
    return true;
}

// Escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Получить название жанра
function getGenreName(genre) {
    const genres = {
        romance: '💕 Романтика',
        fantasy: '🐉 Фэнтези',
        drama: '🎭 Драма',
        adventure: '🗺️ Приключения',
        horror: '👻 Ужасы',
        'sci-fi': '🚀 Научная фантастика'
    };
    return genres[genre] || genre;
}

// Получить иконку жанра
function getGenreIcon(genre) {
    const icons = {
        romance: '💕',
        fantasy: '🐉',
        drama: '🎭',
        adventure: '🗺️',
        horror: '👻',
        'sci-fi': '🚀'
    };
    return icons[genre] || '📖';
}

// Открыть/закрыть модальное окно
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// ========== ЗАГРУЗКА И ОТОБРАЖЕНИЕ ИСТОРИЙ ==========

// Загрузка историй из Firebase
function loadStories() {
    showLoading(true);
    
    if (currentUnsubscribe) {
        currentUnsubscribe();
    }
    
    currentUnsubscribe = db.collection("stories")
        .orderBy("date", "desc")
        .onSnapshot((snapshot) => {
            stories = snapshot.docs.map(doc => ({
                docId: doc.id,
                ...doc.data(),
                id: doc.data().id || parseInt(doc.id)
            }));
            renderStories();
            showLoading(false);
        }, (error) => {
            console.error("Ошибка загрузки:", error);
            showToast('Ошибка загрузки историй', 'error');
            showLoading(false);
        });
}

// Рендер историй
function renderStories() {
    const grid = document.getElementById('storiesGrid');
    if (!grid) return;

    let filtered = [...stories];

    if (currentFilter === 'my') {
        filtered = filtered.filter(s => s.isMine === true);
    } else if (currentFilter === 'popular') {
        filtered = [...filtered].sort((a, b) => (b.likes || 0) - (a.likes || 0));
    } else if (currentFilter === 'new') {
        filtered = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (currentFilter === 'favorites') {
        const favorites = JSON.parse(localStorage.getItem('storyhub_favorites') || '[]');
        filtered = filtered.filter(s => favorites.includes(s.id));
    }

    if (currentGenre) {
        filtered = filtered.filter(s => s.genre === currentGenre);
    }

    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(s => 
            (s.title && s.title.toLowerCase().includes(query)) ||
            (s.author && s.author.toLowerCase().includes(query))
        );
    }

    if (filtered.length === 0) {
        grid.innerHTML = '<div class="empty-state">📖 Нет историй. Создайте свою первую историю!</div>';
        return;
    }

    const gradients = {
        gradient1: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        gradient2: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        gradient3: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        gradient4: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    };

    const favorites = JSON.parse(localStorage.getItem('storyhub_favorites') || '[]');

    grid.innerHTML = filtered.map(story => `
        <div class="story-card ${story.isMine ? 'my-story' : ''}" data-id="${story.id}" data-docid="${story.docId}">
            <div class="story-cover" style="background: ${gradients[story.cover] || gradients.gradient1};">
                <span class="story-icon">${getGenreIcon(story.genre)}</span>
                ${story.isMine ? '<button class="delete-story-card" data-id="' + story.id + '" data-docid="' + story.docId + '">🗑️</button>' : ''}
            </div>
            <h3 class="story-title">${escapeHtml(story.title)}</h3>
            <p class="story-author">${escapeHtml(story.author)}</p>
            <div class="story-chapters">📑 ${story.chapters ? story.chapters.length : 0} глав</div>
            <div class="story-stats">
                <span>❤️ ${story.likes || 0}</span>
                <span>${favorites.includes(story.id) ? '⭐ В избранном' : '☆ Избранное'}</span>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.story-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-story-card')) {
                e.stopPropagation();
                const id = parseInt(e.target.dataset.id);
                const docId = e.target.dataset.docid;
                deleteStory(id, docId);
            } else {
                const id = parseInt(card.dataset.id);
                const docId = card.dataset.docid;
                openReadModal(id, docId);
            }
        });
    });
}

// ========== CRUD ОПЕРАЦИИ ==========

// Создание новой истории
async function createStory(data) {
    if (!validateStoryData(data)) return false;
    
    const newStory = {
        id: Date.now(),
        title: data.title.trim(),
        author: data.author.trim(),
        genre: data.genre,
        description: data.description || '',
        chapters: data.chapters,
        cover: data.cover || 'gradient1',
        likes: 0,
        date: new Date().toISOString(),
        isMine: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        await db.collection("stories").add(newStory);
        showToast('История успешно создана!', 'success');
        return true;
    } catch (error) {
        console.error("Ошибка создания:", error);
        showToast('Ошибка создания истории', 'error');
        return false;
    }
}

// Обновление истории
async function updateStory(id, docId, data) {
    if (!validateStoryData(data)) return false;
    
    const updateData = {
        title: data.title.trim(),
        author: data.author.trim(),
        genre: data.genre,
        description: data.description || '',
        chapters: data.chapters,
        cover: data.cover || 'gradient1',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        await db.collection("stories").doc(docId).update(updateData);
        showToast('История успешно обновлена!', 'success');
        return true;
    } catch (error) {
        console.error("Ошибка обновления:", error);
        showToast('Ошибка обновления истории', 'error');
        return false;
    }
}

// Удаление истории
async function deleteStory(id, docId) {
    if (!confirm('Удалить историю навсегда? Это действие нельзя отменить.')) return;
    
    try {
        await db.collection("stories").doc(docId).delete();
        
        // Также удаляем из лайков пользователя
        if (hasUserLiked(id)) {
            userLikedStories.delete(id);
            saveUserLikes();
        }
        
        showToast('История удалена', 'success');
        
        if (currentReadStory && currentReadStory.id === id) {
            closeModal('readModal');
            currentReadStory = null;
        }
    } catch (error) {
        console.error("Ошибка удаления:", error);
        showToast('Ошибка удаления истории', 'error');
    }
}

// ========== ЛАЙКИ (ИСПРАВЛЕНО - ТОЛЬКО ОДИН ЛАЙК) ==========

// Лайк истории - один пользователь может поставить только один лайк
async function likeStory(storyId, docId) {
    console.log(`Попытка поставить лайк истории ${storyId}`);
    console.log(`Текущие лайки пользователя:`, Array.from(userLikedStories));
    
    // Проверяем, ставил ли пользователь уже лайк
    if (hasUserLiked(storyId)) {
        console.log(`Лайк уже был поставлен!`);
        showToast('❌ Вы уже поставили лайк этой истории', 'warning');
        return false;
    }
    
    try {
        console.log(`Отправляем запрос в Firebase...`);
        // Увеличиваем счетчик лайков в Firebase
        await db.collection("stories").doc(docId).update({
            likes: firebase.firestore.FieldValue.increment(1)
        });
        
        // Сохраняем ID истории в Set
        userLikedStories.add(storyId);
        saveUserLikes();
        
        console.log(`Лайк успешно поставлен!`);
        showToast('❤️ Спасибо за лайк!', 'success');
        
        // Обновляем отображение в текущем модальном окне
        if (currentReadStory && currentReadStory.id === storyId) {
            const likeCountSpan = document.getElementById('likeCount');
            if (likeCountSpan) {
                const currentLikes = parseInt(likeCountSpan.textContent) || 0;
                likeCountSpan.textContent = currentLikes + 1;
                currentReadStory.likes = currentLikes + 1;
            }
        }
        
        return true;
    } catch (error) {
        console.error("Ошибка лайка:", error);
        showToast('Ошибка при добавлении лайка', 'error');
        return false;
    }
}

// Добавление в избранное
function toggleFavorite(id) {
    let favorites = JSON.parse(localStorage.getItem('storyhub_favorites') || '[]');
    const isFavorited = favorites.includes(id);
    
    if (isFavorited) {
        favorites = favorites.filter(f => f !== id);
        showToast('Удалено из избранного', 'info');
    } else {
        favorites.push(id);
        showToast('Добавлено в избранное ⭐', 'success');
    }
    
    localStorage.setItem('storyhub_favorites', JSON.stringify(favorites));
    
    if (currentReadStory && currentReadStory.id === id) {
        const favoriteBtn = document.getElementById('favoriteBtn');
        if (favoriteBtn) {
            favoriteBtn.textContent = favorites.includes(id) ? '⭐ В избранном' : '☆ В избранное';
            favoriteBtn.classList.toggle('favorited', favorites.includes(id));
        }
    }
    renderStories();
}

// ========== ЧТЕНИЕ ИСТОРИИ ==========

// Открытие модального окна для чтения
function openReadModal(id, docId) {
    const story = stories.find(s => s.id === id);
    if (!story) return;
    
    openModal('readModal');
    
    currentReadStory = story;
    currentChapterIndex = 0;
    
    document.getElementById('readTitle').textContent = story.title;
    document.getElementById('readAuthor').textContent = `✍️ ${story.author}`;
    document.getElementById('readGenre').textContent = `${getGenreIcon(story.genre)} ${getGenreName(story.genre)}`;
    document.getElementById('readDate').textContent = `📅 ${new Date(story.date).toLocaleDateString('ru-RU')}`;
    document.getElementById('likeCount').textContent = story.likes || 0;
    
    updateChapterDisplay();
    
    const favorites = JSON.parse(localStorage.getItem('storyhub_favorites') || '[]');
    const isFavorited = favorites.includes(story.id);
    const favoriteBtn = document.getElementById('favoriteBtn');
    if (favoriteBtn) {
        favoriteBtn.textContent = isFavorited ? '⭐ В избранном' : '☆ В избранное';
        favoriteBtn.classList.toggle('favorited', isFavorited);
    }
    
    const editBtn = document.getElementById('editFromReadBtn');
    const deleteBtn = document.getElementById('deleteFromReadBtn');
    if (story.isMine) {
        if (editBtn) editBtn.style.display = 'inline-block';
        if (deleteBtn) deleteBtn.style.display = 'inline-block';
    } else {
        if (editBtn) editBtn.style.display = 'none';
        if (deleteBtn) deleteBtn.style.display = 'none';
    }
    
    if (docId) {
        db.collection("stories").doc(docId).onSnapshot((doc) => {
            if (doc.exists && currentReadStory && currentReadStory.id === id) {
                const updatedData = doc.data();
                document.getElementById('likeCount').textContent = updatedData.likes || 0;
                currentReadStory.likes = updatedData.likes;
            }
        });
    }
}

function updateChapterDisplay() {
    if (!currentReadStory || !currentReadStory.chapters) return;
    
    const chapter = currentReadStory.chapters[currentChapterIndex];
    if (!chapter) return;
    
    const readContent = document.getElementById('readContent');
    const chapterIndicator = document.getElementById('chapterIndicator');
    const chapterSelect = document.getElementById('chapterSelect');
    
    if (readContent) readContent.textContent = chapter.content || 'Содержание главы не добавлено';
    if (chapterIndicator) chapterIndicator.textContent = `Глава ${currentChapterIndex + 1}: ${chapter.title || 'Без названия'}`;
    
    if (chapterSelect) {
        chapterSelect.innerHTML = currentReadStory.chapters.map((ch, idx) => 
            `<option value="${idx}" ${idx === currentChapterIndex ? 'selected' : ''}>
                Глава ${idx + 1}: ${ch.title || 'Без названия'}
            </option>`
        ).join('');
    }
    
    const prevBtns = ['prevChapterBtn', 'prevChapterBottomBtn'];
    const nextBtns = ['nextChapterBtn', 'nextChapterBottomBtn'];
    
    prevBtns.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) btn.disabled = currentChapterIndex === 0;
    });
    
    nextBtns.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) btn.disabled = currentChapterIndex === currentReadStory.chapters.length - 1;
    });
}

function changeChapter(delta) {
    if (!currentReadStory || !currentReadStory.chapters) return;
    const newIndex = currentChapterIndex + delta;
    if (newIndex >= 0 && newIndex < currentReadStory.chapters.length) {
        currentChapterIndex = newIndex;
        updateChapterDisplay();
    }
}

function goToChapter(index) {
    if (!currentReadStory || !currentReadStory.chapters) return;
    if (index >= 0 && index < currentReadStory.chapters.length) {
        currentChapterIndex = index;
        updateChapterDisplay();
    }
}

// ========== РЕДАКТОР ГЛАВ ==========

let currentChapters = [];

function renderChaptersEditor() {
    const container = document.getElementById('chaptersList');
    if (!container) return;
    
    if (!currentChapters || currentChapters.length === 0) {
        currentChapters = [{ title: 'Глава 1', content: '' }];
    }
    
    container.innerHTML = currentChapters.map((chapter, index) => `
        <div class="chapter-item" data-chapter-index="${index}">
            <div class="chapter-header">
                <input type="text" class="chapter-title-input" placeholder="Название главы" value="${escapeHtml(chapter.title)}" data-index="${index}">
                <button type="button" class="delete-chapter-btn" data-index="${index}" ${currentChapters.length === 1 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>🗑️</button>
            </div>
            <textarea class="chapter-content-input" rows="6" placeholder="Содержание главы (минимум 10 символов)..." data-index="${index}">${escapeHtml(chapter.content)}</textarea>
        </div>
    `).join('');
    
    document.querySelectorAll('.chapter-title-input').forEach(input => {
        input.removeEventListener('change', handleChapterTitleChange);
        input.addEventListener('change', handleChapterTitleChange);
    });
    
    document.querySelectorAll('.chapter-content-input').forEach(textarea => {
        textarea.removeEventListener('input', handleChapterContentChange);
        textarea.addEventListener('input', handleChapterContentChange);
    });
    
    document.querySelectorAll('.delete-chapter-btn').forEach(btn => {
        if (!btn.disabled) {
            btn.removeEventListener('click', handleDeleteChapter);
            btn.addEventListener('click', handleDeleteChapter);
        }
    });
}

function handleChapterTitleChange(e) {
    const idx = parseInt(e.target.dataset.index);
    if (currentChapters[idx]) {
        currentChapters[idx].title = e.target.value;
    }
}

function handleChapterContentChange(e) {
    const idx = parseInt(e.target.dataset.index);
    if (currentChapters[idx]) {
        currentChapters[idx].content = e.target.value;
    }
}

function handleDeleteChapter(e) {
    const idx = parseInt(e.target.dataset.index);
    if (currentChapters.length > 1) {
        currentChapters.splice(idx, 1);
        renderChaptersEditor();
    } else {
        showToast('Нельзя удалить единственную главу', 'warning');
    }
}

function addNewChapter() {
    currentChapters.push({ 
        title: `Глава ${currentChapters.length + 1}`, 
        content: '' 
    });
    renderChaptersEditor();
}

// Открытие редактора для создания/редактирования
function openStoryModal(editStory = null) {
    const modalTitle = document.getElementById('modalTitle');
    const storyIdInput = document.getElementById('storyId');
    const storyDocIdInput = document.getElementById('storyDocId');
    const titleInput = document.getElementById('storyTitle');
    const authorInput = document.getElementById('storyAuthor');
    const genreSelect = document.getElementById('storyGenre');
    const descriptionInput = document.getElementById('storyDescription');
    const coverSelect = document.getElementById('storyCover');
    
    if (editStory) {
        modalTitle.textContent = 'Редактировать историю';
        storyIdInput.value = editStory.id;
        storyDocIdInput.value = editStory.docId;
        titleInput.value = editStory.title;
        authorInput.value = editStory.author;
        genreSelect.value = editStory.genre;
        descriptionInput.value = editStory.description || '';
        coverSelect.value = editStory.cover || 'gradient1';
        currentChapters = editStory.chapters ? JSON.parse(JSON.stringify(editStory.chapters)) : [{ title: 'Глава 1', content: '' }];
    } else {
        modalTitle.textContent = 'Создать новую историю';
        storyIdInput.value = '';
        storyDocIdInput.value = '';
        titleInput.value = '';
        authorInput.value = '';
        genreSelect.value = 'fantasy';
        descriptionInput.value = '';
        coverSelect.value = 'gradient1';
        currentChapters = [{ title: 'Глава 1', content: '' }];
    }
    
    renderChaptersEditor();
    openModal('storyModal');
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========

function initModals() {
    const storyForm = document.getElementById('storyForm');
    const addStoryBtn = document.getElementById('addStoryBtn');
    const createHeroBtn = document.getElementById('createStoryHeroBtn');
    const addChapterBtn = document.getElementById('addChapterBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const closeModalBtn = document.querySelector('#storyModal .close');
    const closeReadBtn = document.querySelector('#readModal .close-read');
    const likeBtn = document.getElementById('likeBtn');
    const favoriteBtn = document.getElementById('favoriteBtn');
    const editFromReadBtn = document.getElementById('editFromReadBtn');
    const deleteFromReadBtn = document.getElementById('deleteFromReadBtn');
    
    const prevChapterBtn = document.getElementById('prevChapterBtn');
    const nextChapterBtn = document.getElementById('nextChapterBtn');
    const prevChapterBottomBtn = document.getElementById('prevChapterBottomBtn');
    const nextChapterBottomBtn = document.getElementById('nextChapterBottomBtn');
    const chapterSelect = document.getElementById('chapterSelect');
    
    if (prevChapterBtn) prevChapterBtn.onclick = () => changeChapter(-1);
    if (nextChapterBtn) nextChapterBtn.onclick = () => changeChapter(1);
    if (prevChapterBottomBtn) prevChapterBottomBtn.onclick = () => changeChapter(-1);
    if (nextChapterBottomBtn) nextChapterBottomBtn.onclick = () => changeChapter(1);
    if (chapterSelect) chapterSelect.onchange = (e) => goToChapter(parseInt(e.target.value));
    
    if (addStoryBtn) addStoryBtn.onclick = () => openStoryModal(null);
    if (createHeroBtn) createHeroBtn.onclick = () => openStoryModal(null);
    if (addChapterBtn) addChapterBtn.onclick = addNewChapter;
    
    if (cancelModalBtn) cancelModalBtn.onclick = () => closeModal('storyModal');
    if (closeModalBtn) closeModalBtn.onclick = () => closeModal('storyModal');
    if (closeReadBtn) closeReadBtn.onclick = () => closeModal('readModal');
    
    if (storyForm) {
        storyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const storyId = document.getElementById('storyId').value;
            const storyDocId = document.getElementById('storyDocId').value;
            
            const storyData = {
                title: document.getElementById('storyTitle').value,
                author: document.getElementById('storyAuthor').value,
                genre: document.getElementById('storyGenre').value,
                description: document.getElementById('storyDescription').value,
                cover: document.getElementById('storyCover').value,
                chapters: currentChapters
            };
            
            let success = false;
            if (storyDocId) {
                success = await updateStory(parseInt(storyId), storyDocId, storyData);
            } else {
                success = await createStory(storyData);
            }
            
            if (success) {
                closeModal('storyModal');
                storyForm.reset();
            }
        });
    }
    
    // Лайк с проверкой и отладкой
    if (likeBtn) {
        likeBtn.onclick = () => {
            console.log('Кнопка лайка нажата');
            if (currentReadStory && currentReadStory.docId) {
                likeStory(currentReadStory.id, currentReadStory.docId);
            } else {
                console.log('Нет текущей истории для лайка');
            }
        };
    }
    
    if (favoriteBtn) {
        favoriteBtn.onclick = () => {
            if (currentReadStory) {
                toggleFavorite(currentReadStory.id);
            }
        };
    }
    
    if (editFromReadBtn) {
        editFromReadBtn.onclick = () => {
            if (currentReadStory) {
                closeModal('readModal');
                setTimeout(() => openStoryModal(currentReadStory), 300);
            }
        };
    }
    
    if (deleteFromReadBtn) {
        deleteFromReadBtn.onclick = () => {
            if (currentReadStory && currentReadStory.docId) {
                deleteStory(currentReadStory.id, currentReadStory.docId);
            }
        };
    }
    
    window.onclick = (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target.id);
        }
    };
}

function initFilters() {
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            currentFilter = link.dataset.filter;
            renderStories();
        });
    });
    
    document.querySelectorAll('.tag').forEach(tag => {
        tag.addEventListener('click', () => {
            document.querySelectorAll('.tag').forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            currentGenre = tag.dataset.genre;
            renderStories();
        });
    });
    
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchQuery = e.target.value;
                renderStories();
            }, 300);
        });
    }
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
    loadUserLikes();  // Загружаем лайки ПЕРЕД загрузкой историй
    loadStories();
    initModals();
    initFilters();
});

// Аутентификация
const auth = firebase.auth();

// Проверка состояния входа
auth.onAuthStateChanged((user) => {
    if (user) {
        document.getElementById('authButtons').style.display = 'none';
        document.getElementById('userInfo').style.display = 'flex';
        document.getElementById('userName').textContent = user.email || user.displayName || 'Пользователь';
        
        // При создании истории автоматически подставляем email автора
        document.getElementById('storyAuthor').value = user.displayName || user.email;
        document.getElementById('storyAuthor').readOnly = true;
    } else {
        document.getElementById('authButtons').style.display = 'flex';
        document.getElementById('userInfo').style.display = 'none';
        document.getElementById('storyAuthor').readOnly = false;
        document.getElementById('storyAuthor').value = '';
    }
});

// Регистрация
document.getElementById('registerBtn')?.addEventListener('click', () => {
    const email = prompt('Введите email:');
    const password = prompt('Введите пароль (минимум 6 символов):');
    if (email && password) {
        auth.createUserWithEmailAndPassword(email, password)
            .then(() => showToast('Регистрация успешна!', 'success'))
            .catch(err => showToast(err.message, 'error'));
    }
});

// Вход
document.getElementById('loginBtn')?.addEventListener('click', () => {
    const email = prompt('Email:');
    const password = prompt('Пароль:');
    if (email && password) {
        auth.signInWithEmailAndPassword(email, password)
            .then(() => showToast('Добро пожаловать!', 'success'))
            .catch(err => showToast(err.message, 'error'));
    }
});

// Выход
document.getElementById('logoutBtn')?.addEventListener('click', () => {
    auth.signOut().then(() => showToast('Вы вышли', 'info'));
});

// ========== ДОПОЛНИТЕЛЬНЫЕ НАСТРОЙКИ ДЛЯ АУТЕНТИФИКАЦИИ ==========

// Функции для модальных окон входа/регистрации
function initAuthModals() {
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const closeLogin = document.querySelector('.close-login');
    const closeRegister = document.querySelector('.close-register');
    const cancelLoginBtn = document.getElementById('cancelLoginBtn');
    const cancelRegisterBtn = document.getElementById('cancelRegisterBtn');
    
    // Открытие модальных окон
    if (loginBtn) {
        loginBtn.onclick = () => {
            if (loginModal) loginModal.style.display = 'block';
        };
    }
    
    if (registerBtn) {
        registerBtn.onclick = () => {
            if (registerModal) registerModal.style.display = 'block';
        };
    }
    
    // Закрытие модальных окон
    const closeModals = () => {
        if (loginModal) loginModal.style.display = 'none';
        if (registerModal) registerModal.style.display = 'none';
    };
    
    if (closeLogin) closeLogin.onclick = closeModals;
    if (closeRegister) closeRegister.onclick = closeModals;
    if (cancelLoginBtn) cancelLoginBtn.onclick = closeModals;
    if (cancelRegisterBtn) cancelRegisterBtn.onclick = closeModals;
    
    // Обработка формы входа
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            try {
                await auth.signInWithEmailAndPassword(email, password);
                showToast('Добро пожаловать!', 'success');
                closeModals();
                loginForm.reset();
            } catch (error) {
                showToast(error.message, 'error');
            }
        });
    }
    
    // Обработка формы регистрации
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('regName').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            const confirmPassword = document.getElementById('regConfirmPassword').value;
            
            if (password !== confirmPassword) {
                showToast('Пароли не совпадают', 'error');
                return;
            }
            
            if (password.length < 6) {
                showToast('Пароль должен быть минимум 6 символов', 'error');
                return;
            }
            
            try {
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                // Обновляем профиль с именем пользователя
                await userCredential.user.updateProfile({
                    displayName: name
                });
                showToast('Регистрация успешна!', 'success');
                closeModals();
                registerForm.reset();
            } catch (error) {
                showToast(error.message, 'error');
            }
        });
    }
}

// Обновляем отображение "Мои истории" при смене пользователя
function updateMyStoriesFilter() {
    const user = auth.currentUser;
    if (user) {
        // Помечаем истории текущего пользователя
        stories.forEach(story => {
            story.isMine = (story.author === user.displayName || story.author === user.email);
        });
        renderStories();
    }
}

// Подписываемся на изменения авторизации
auth.onAuthStateChanged((user) => {
    const authButtons = document.getElementById('authButtons');
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const storyAuthorInput = document.getElementById('storyAuthor');
    
    if (user) {
        if (authButtons) authButtons.style.display = 'none';
        if (userInfo) userInfo.style.display = 'flex';
        if (userName) userName.textContent = user.displayName || user.email || 'Пользователь';
        if (storyAuthorInput) {
            storyAuthorInput.value = user.displayName || user.email || '';
            storyAuthorInput.readOnly = true;
        }
        
        // Обновляем isMine для всех историй
        stories.forEach(story => {
            story.isMine = (story.author === user.displayName || story.author === user.email);
        });
        renderStories();
    } else {
        if (authButtons) authButtons.style.display = 'flex';
        if (userInfo) userInfo.style.display = 'none';
        if (storyAuthorInput) {
            storyAuthorInput.value = '';
            storyAuthorInput.readOnly = false;
        }
        
        // Сбрасываем isMine
        stories.forEach(story => {
            story.isMine = false;
        });
        renderStories();
    }
});

// Инициализируем модальные окна аутентификации
initAuthModals();
