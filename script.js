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
    const saved = localStorage.getItem('storyhub_stories');
    if (saved) {
        stories = JSON.parse(saved);
    } else {
        // Примеры историй для старта с главами
        stories = [
            {
                id: Date.now() + 1,
                title: 'Тень прошлого',
                author: 'Анна К.',
                genre: 'drama',
                description: 'Трогательная история о любви и потерях',
                chapters: [
                    { title: 'Встреча', content: 'Это была та самая осень, когда всё изменилось...\n\nОна стояла у окна и смотрела на падающие листья. Воспоминания нахлынули волной, унося её в прошлое, где всё было иначе.\n\n"Ты помнишь тот день?" - спросил тихий голос за спиной.\n\nОна обернулась и увидела его. Таким же, каким он был пять лет назад...' },
                    { title: 'Разлука', content: 'Время шло, но боль не утихала. Каждый день напоминал о том, что они больше не вместе.\n\nОна пыталась забыть, но воспоминания были слишком сильными. Каждая песня, каждый закат возвращал её в тот день, когда они были счастливы.\n\n"Может быть, стоит дать себе второй шанс?" - подумала она.' },
                    { title: 'Воссоединение', content: 'Судьба свела их снова. Случайная встреча в том самом парке, где они гуляли когда-то.\n\nОн стоял у фонтана и смотрел на воду. Она замедлила шаг, не зная, подойти или уйти.\n\n"Привет," - сказал он, обернувшись. "Я так и знал, что когда-нибудь мы встретимся снова."\n\nЕё сердце забилось чаще. Возможно, это был их второй шанс.' }
                ],
                cover: 'gradient1',
                likes: 2500,
                date: new Date().toISOString(),
                isMine: false
            },
            {
                id: Date.now() + 2,
                title: 'Звёздный странник',
                author: 'Максим В.',
                genre: 'sci-fi',
                description: 'Путешествие к далёким звёздам',
                chapters: [
                    { title: 'Старт', content: 'Космический корабль "Астрея" готовился к старту. Капитан Алексей Волков в последний раз проверил все системы.\n\n"До старта 10 секунд," - раздался голос бортового компьютера.\n\nОн посмотрел на Землю через иллюминатор. Зелёно-голубой шар манил и одновременно пугал своей красотой.\n\n"5, 4, 3, 2, 1... Пуск!"\n\nДвигатели взревели, и корабль начал своё путешествие к неизведанным мирам...' },
                    { title: 'Встреча с неизведанным', content: 'Через месяц полёта они достигли системы Альфа-Центавра. На сканерах появился неизвестный объект.\n\n"Капитан, это не похоже ни на один известный нам корабль," - доложил штурман.\n\nОбъект приближался. Внезапно все коммуникации ожили, и раздался голос, который говорил на чистом русском языке:\n\n"Добро пожаловать, земляне. Мы ждали вас."' }
                ],
                cover: 'gradient2',
                likes: 1800,
                date: new Date().toISOString(),
                isMine: false
            },
            {
                id: Date.now() + 3,
                title: 'Лунная соната',
                author: 'Елена М.',
                genre: 'romance',
                description: 'История любви под луной',
                chapters: [
                    { title: 'Знакомство', content: 'Луна светила особенно ярко в ту ночь. Девушка сидела на скамейке в парке и слушала, как кто-то играет на пианино.\n\nМелодия была прекрасна. Она вставала и шла на звук. В старой беседке стоял рояль, а за ним сидел молодой человек.\n\n"Это вы играете?" - спросила она.\n\nОн поднял голову, и их взгляды встретились...' },
                    { title: 'Первое свидание', content: 'Они встретились на следующий день. Он ждал её у того же рояля.\n\n"Я сочинил эту мелодию специально для тебя," - сказал он.\n\nОна села рядом, и они начали разговаривать. Слова лились рекой, будто они знали друг друга тысячу лет.\n\nЛуна снова освещала их, словно благословляя на этот союз.' }
                ],
                cover: 'gradient3',
                likes: 3200,
                date: new Date().toISOString(),
                isMine: false
            }
        ];
        saveStories();
    }
    renderStories();
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
    if (confirm('Вы уверены, что хотите удалить эту историю?')) {
        stories = stories.filter(s => s.id !== id);
        let favorites = JSON.parse(localStorage.getItem('storyhub_favorites') || '[]');
        favorites = favorites.filter(f => f !== id);
        localStorage.setItem('storyhub_favorites', JSON.stringify(favorites));
        saveStories();
        renderStories();
        closeReadModal();
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

    storyForm.onsubmit = (e) => {
        e.preventDefault();
        const id = document.getElementById('storyId').value;
        
        // Очищаем пустые главы
        const validChapters = currentChapters.filter(ch => ch.title.trim() !== '' || ch.content.trim() !== '');
        if (validChapters.length === 0) {
            alert('Добавьте хотя бы одну главу!');
            return;
        }
        
        const storyData = {
            title: document.getElementById('storyTitle').value,
            author: document.getElementById('storyAuthor').value,
            genre: document.getElementById('storyGenre').value,
            description: document.getElementById('storyDescription').value,
            chapters: validChapters,
            cover: document.getElementById('storyCover').value
        };
        
        if (id) {
            updateStory(parseInt(id), storyData);
        } else {
            createStory(storyData);
        }
        modal.style.display = 'none';
        document.body.style.overflow = '';
    };

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