// script.js - вся логика работы с историями (с поддержбой глав)

// Хранилище историй
let stories = [];
let currentFilter = 'all';
let currentGenre = null;
let currentReadStory = null;
let currentChapterIndex = 0;
let searchQuery = '';

// Загрузка историй из localStorage
function loadStories() {
    // Слушаем Firebase в реальном времени
    db.collection("stories").orderBy("id", "desc").onSnapshot((snapshot) => {
        stories = snapshot.docs.map(doc => ({
            docId: doc.id, // Это нужно для удаления
            ...doc.data()
        }));
        renderStories(); 
    });
}

// Сохранение в localStorage
function saveStories() {
    localStorage.setItem('storyhub_stories', JSON.stringify(stories));
}

// Рендер историй
function renderStories() {
    const grid = document.getElementById('storiesGrid');
    if (!grid) return;

    let filtered = [...stories];

    if (currentFilter === 'my') {
        filtered = filtered.filter(s => s.isMine === true);
    } else if (currentFilter === 'popular') {
        filtered.sort((a, b) => b.likes - a.likes);
    } else if (currentFilter === 'new') {
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (currentFilter === 'favorites') {
        const favorites = JSON.parse(localStorage.getItem('storyhub_favorites') || '[]');
        filtered = filtered.filter(s => favorites.includes(s.id));
    }

    if (currentGenre) {
        filtered = filtered.filter(s => s.genre === currentGenre);
    }

    if (searchQuery) {
        filtered = filtered.filter(s => 
            s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.author.toLowerCase().includes(searchQuery.toLowerCase())
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

    const genreIcons = {
        romance: '💕',
        fantasy: '🐉',
        drama: '🎭',
        adventure: '🗺️',
        horror: '👻',
        'sci-fi': '🚀'
    };

    const favorites = JSON.parse(localStorage.getItem('storyhub_favorites') || '[]');

    grid.innerHTML = filtered.map(story => `
        <div class="story-card ${story.isMine ? 'my-story' : ''}" data-id="${story.id}">
            <div class="story-cover" style="background: ${gradients[story.cover] || gradients.gradient1};">
                <span class="story-icon">${genreIcons[story.genre] || '📖'}</span>
                ${story.isMine ? '<button class="delete-story-card" data-id="' + story.id + '">🗑️</button>' : ''}
            </div>
            <h3 class="story-title">${escapeHtml(story.title)}</h3>
            <p class="story-author">${escapeHtml(story.author)}</p>
            <div class="story-chapters">📑 ${story.chapters ? story.chapters.length : 0} глав</div>
            <div class="story-stats">
                <span>❤️ ${story.likes}</span>
                <span>⭐ ${favorites.includes(story.id) ? '★' : '☆'}</span>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.story-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-story-card')) {
                e.stopPropagation();
                deleteStory(parseInt(e.target.dataset.id));
            } else {
                const id = parseInt(card.dataset.id);
                openReadModal(id);
            }
        });
    });
}

// Создание новой истории
function createStory(data) {
    const newStory = {
        id: Date.now(),
        title: data.title,
        author: data.author,
        genre: data.genre,
        description: data.description || '',
        chapters: data.chapters || [{ title: 'Глава 1', content: '' }],
        cover: data.cover || 'gradient1',
        likes: 0,
        date: new Date().toISOString(),
        isMine: true
    };
    stories.push(newStory);
    saveStories();
    renderStories();
}

// Обновление истории
function updateStory(id, data) {
    const index = stories.findIndex(s => s.id === id);
    if (index !== -1) {
        stories[index] = { ...stories[index], ...data };
        saveStories();
        renderStories();
    }
}

// Удаление истории
function deleteStory(id) {
    const story = stories.find(s => s.id === id);
    if (story && story.docId && confirm('Удалить историю навсегда?')) {
        db.collection("stories").doc(story.docId).delete();
    }
}

// Открытие модального окна для чтения
function openReadModal(id) {
    const story = stories.find(s => s.id === id);
    if (!story) return;
    
    document.body.style.overflow = 'hidden';
    
    currentReadStory = story;
    currentChapterIndex = 0;
    
    document.getElementById('readTitle').textContent = story.title;
    document.getElementById('readAuthor').textContent = `Автор: ${story.author}`;
    document.getElementById('readGenre').textContent = `Жанр: ${getGenreName(story.genre)}`;
    document.getElementById('readDate').textContent = `Опубликовано: ${new Date(story.date).toLocaleDateString()}`;
    document.getElementById('likeCount').textContent = story.likes;
    
    updateChapterDisplay();
    
    const favorites = JSON.parse(localStorage.getItem('storyhub_favorites') || '[]');
    const isFavorited = favorites.includes(story.id);
    const favoriteBtn = document.getElementById('favoriteBtn');
    favoriteBtn.textContent = isFavorited ? '⭐ В избранном' : '☆ В избранное';
    favoriteBtn.classList.toggle('favorited', isFavorited);
    
    document.getElementById('readModal').style.display = 'block';
    
    const editBtn = document.getElementById('editFromReadBtn');
    const deleteBtn = document.getElementById('deleteFromReadBtn');
    if (story.isMine) {
        editBtn.style.display = 'inline-block';
        deleteBtn.style.display = 'inline-block';
    } else {
        editBtn.style.display = 'none';
        deleteBtn.style.display = 'none';
    }
}

function updateChapterDisplay() {
    if (!currentReadStory) return;
    
    const chapter = currentReadStory.chapters[currentChapterIndex];
    document.getElementById('readContent').textContent = chapter.content;
    document.getElementById('chapterIndicator').textContent = `Глава ${currentChapterIndex + 1}: ${chapter.title}`;
    
    // Обновляем выпадающий список
    const chapterSelect = document.getElementById('chapterSelect');
    if (chapterSelect) {
        chapterSelect.innerHTML = currentReadStory.chapters.map((ch, idx) => 
            `<option value="${idx}" ${idx === currentChapterIndex ? 'selected' : ''}>Глава ${idx + 1}: ${ch.title}</option>`
        ).join('');
    }
    
    // Обновляем состояние кнопок
    const prevBtn = document.getElementById('prevChapterBtn');
    const nextBtn = document.getElementById('nextChapterBtn');
    const prevBottomBtn = document.getElementById('prevChapterBottomBtn');
    const nextBottomBtn = document.getElementById('nextChapterBottomBtn');
    
    if (prevBtn) prevBtn.disabled = currentChapterIndex === 0;
    if (nextBtn) nextBtn.disabled = currentChapterIndex === currentReadStory.chapters.length - 1;
    if (prevBottomBtn) prevBottomBtn.disabled = currentChapterIndex === 0;
    if (nextBottomBtn) nextBottomBtn.disabled = currentChapterIndex === currentReadStory.chapters.length - 1;
}

function changeChapter(delta) {
    if (!currentReadStory) return;
    const newIndex = currentChapterIndex + delta;
    if (newIndex >= 0 && newIndex < currentReadStory.chapters.length) {
        currentChapterIndex = newIndex;
        updateChapterDisplay();
    }
}

function goToChapter(index) {
    if (!currentReadStory) return;
    if (index >= 0 && index < currentReadStory.chapters.length) {
        currentChapterIndex = index;
        updateChapterDisplay();
    }
}

// Закрытие модального окна чтения
function closeReadModal() {
    const readModal = document.getElementById('readModal');
    if (readModal) {
        readModal.style.display = 'none';
    }
    currentReadStory = null;
    document.body.style.overflow = '';
}

// Лайк истории
function likeStory(id) {
    const story = stories.find(s => s.id === id);
    if (story) {
        story.likes++;
        saveStories();
        if (currentReadStory && currentReadStory.id === id) {
            document.getElementById('likeCount').textContent = story.likes;
        }
        renderStories();
    }
}

// Добавление в избранное
function toggleFavorite(id) {
    let favorites = JSON.parse(localStorage.getItem('storyhub_favorites') || '[]');
    if (favorites.includes(id)) {
        favorites = favorites.filter(f => f !== id);
    } else {
        favorites.push(id);
    }
    localStorage.setItem('storyhub_favorites', JSON.stringify(favorites));
    
    if (currentReadStory && currentReadStory.id === id) {
        const isFavorited = favorites.includes(id);
        const favoriteBtn = document.getElementById('favoriteBtn');
        favoriteBtn.textContent = isFavorited ? '⭐ В избранном' : '☆ В избранное';
        favoriteBtn.classList.toggle('favorited', isFavorited);
    }
    renderStories();
}

// Редактор глав
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
                <button type="button" class="delete-chapter-btn" data-index="${index}">🗑️</button>
            </div>
            <textarea class="chapter-content-input" rows="6" placeholder="Содержание главы..." data-index="${index}">${escapeHtml(chapter.content)}</textarea>
        </div>
    `).join('');
    
    // Добавляем обработчики
    document.querySelectorAll('.chapter-title-input').forEach(input => {
        input.removeEventListener('change', handleChapterTitleChange);
        input.addEventListener('change', handleChapterTitleChange);
    });
    
    document.querySelectorAll('.chapter-content-input').forEach(textarea => {
        textarea.removeEventListener('change', handleChapterContentChange);
        textarea.addEventListener('change', handleChapterContentChange);
    });
    
    document.querySelectorAll('.delete-chapter-btn').forEach(btn => {
        btn.removeEventListener('click', handleDeleteChapter);
        btn.addEventListener('click', handleDeleteChapter);
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
    currentChapters.splice(idx, 1);
    if (currentChapters.length === 0) {
        currentChapters = [{ title: 'Глава 1', content: '' }];
    }
    renderChaptersEditor();
}

// Открытие редактора для редактирования истории
function openEditStoryModal(storyId) {
    console.log('openEditStoryModal called with id:', storyId);
    
    // Находим историю по ID
    const story = stories.find(s => s.id === storyId);
    if (!story) {
        console.error('Story not found:', storyId);
        return;
    }
    
    console.log('Editing story:', story.title);
    
    document.getElementById('modalTitle').textContent = 'Редактировать историю';
    document.getElementById('storyId').value = story.id;
    document.getElementById('storyTitle').value = story.title;
    document.getElementById('storyAuthor').value = story.author;
    document.getElementById('storyGenre').value = story.genre;
    document.getElementById('storyDescription').value = story.description || '';
    document.getElementById('storyCover').value = story.cover || 'gradient1';
    
    // Копируем главы
    currentChapters = story.chapters ? JSON.parse(JSON.stringify(story.chapters)) : [{ title: 'Глава 1', content: '' }];
    renderChaptersEditor();
    
    document.getElementById('storyModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Инициализация модальных окон
function initModals() {
    const modal = document.getElementById('storyModal');
    const readModal = document.getElementById('readModal');
    const addBtn = document.getElementById('addStoryBtn');
    const createHeroBtn = document.getElementById('createStoryHeroBtn');
    const closeBtn = document.querySelector('.close');
    const closeRead = document.querySelector('.close-read');
    const cancelBtn = document.getElementById('cancelModalBtn');
    const storyForm = document.getElementById('storyForm');
    const likeBtn = document.getElementById('likeBtn');
    const favoriteBtn = document.getElementById('favoriteBtn');
    const editFromRead = document.getElementById('editFromReadBtn');
    const deleteFromRead = document.getElementById('deleteFromReadBtn');
    const addChapterBtn = document.getElementById('addChapterBtn');
    
    // Навигация по главам
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

    addBtn.onclick = () => {
        document.getElementById('modalTitle').textContent = 'Создать новую историю';
        document.getElementById('storyId').value = '';
        storyForm.reset();
        currentChapters = [{ title: 'Глава 1', content: '' }];
        renderChaptersEditor();
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    };

    if (createHeroBtn) {
        createHeroBtn.onclick = addBtn.onclick;
    }
    
    if (addChapterBtn) {
        addChapterBtn.onclick = () => {
            currentChapters.push({ title: `Глава ${currentChapters.length + 1}`, content: '' });
            renderChaptersEditor();
        };
    }

    closeBtn.onclick = () => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    };
    
    closeRead.onclick = () => {
        closeReadModal();
        document.body.style.overflow = '';
    };
    
    cancelBtn.onclick = () => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    };

    window.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
        if (e.target === readModal) {
            closeReadModal();
            document.body.style.overflow = '';
        }
    };

    // Найти этот блок в функции init() и заменить целиком:
    storyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const storyId = document.getElementById('storyId').value;
        const storyData = {
            title: document.getElementById('storyTitle').value,
            author: document.getElementById('storyAuthor').value,
            genre: document.getElementById('storyGenre').value,
            description: document.getElementById('storyDescription').value,
            cover: document.getElementById('storyCover').value,
            chapters: currentChapters,
            date: new Date().toISOString(),
            id: storyId ? parseInt(storyId) : Date.now(),
            likes: currentReadStory ? currentReadStory.likes : 0,
            isMine: true
        };

        if (storyId) {
            // РЕДАКТИРОВАНИЕ: Находим документ по docId и обновляем его
            const storyToUpdate = stories.find(s => s.id === parseInt(storyId));
            if (storyToUpdate && storyToUpdate.docId) {
                db.collection("stories").doc(storyToUpdate.docId).update(storyData)
                    .then(() => {
                        console.log("История обновлена");
                        closeModal(); // Закрываем окно и выходим на главную
                    });
            }
        } else {
            // СОЗДАНИЕ НОВОЙ: Просто добавляем в коллекцию
            db.collection("stories").add(storyData)
                .then(() => {
                    console.log("История создана");
                    closeModal(); // Закрываем окно и выходим на главную
                });
        }
    });

    likeBtn.onclick = () => {
        if (currentReadStory) {
            likeStory(currentReadStory.id);
        }
    };

    favoriteBtn.onclick = () => {
        if (currentReadStory) {
            toggleFavorite(currentReadStory.id);
        }
    };

    // ИСПРАВЛЕНА КНОПКА РЕДАКТИРОВАНИЯ
    if (editFromRead) {
        // Удаляем старые обработчики
        const newEditBtn = editFromRead.cloneNode(true);
        editFromRead.parentNode.replaceChild(newEditBtn, editFromRead);
        
        newEditBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Edit button clicked');
            
            if (currentReadStory && currentReadStory.id) {
                const storyId = currentReadStory.id;
                console.log('Closing read modal and opening edit for story ID:', storyId);
                
                // Закрываем модальное окно чтения
                document.getElementById('readModal').style.display = 'none';
                document.body.style.overflow = '';
                
                // Открываем редактор
                setTimeout(() => {
                    openEditStoryModal(storyId);
                }, 100);
            } else {
                console.error('No currentReadStory found');
            }
        };
    }

    if (deleteFromRead) {
        const newDeleteBtn = deleteFromRead.cloneNode(true);
        deleteFromRead.parentNode.replaceChild(newDeleteBtn, deleteFromRead);
        
        newDeleteBtn.onclick = () => {
            if (currentReadStory) {
                deleteStory(currentReadStory.id);
            }
        };
    }
}

// Инициализация фильтров
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
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderStories();
    });
}

// Вспомогательные функции
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function getGenreName(genre) {
    const genres = {
        romance: 'Романтика',
        fantasy: 'Фэнтези',
        drama: 'Драма',
        adventure: 'Приключения',
        horror: 'Ужасы',
        'sci-fi': 'Научная фантастика'
    };
    return genres[genre] || genre;
}

// Запуск приложения
loadStories();
initModals();
initFilters();
