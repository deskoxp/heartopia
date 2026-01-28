document.addEventListener('DOMContentLoaded', () => {
    // Core Elements
    const grid = document.getElementById('card-grid');
    const homeView = document.getElementById('home-view');
    const mainNav = document.getElementById('main-nav');
    const navButtons = document.querySelectorAll('.nav-btn');
    const categoryCards = document.querySelectorAll('.category-card');
    const siteTitle = document.getElementById('site-title');
    const homeNavBtn = document.getElementById('home-nav-btn');

    // Data Configuration
    const DATA_SOURCES = {
        'recetas': 'data/recipes.json',
        'insectos': 'data/insects.json',
        'peces': 'data/fish.json',
        'cultivos': 'data/crops.json',
        'flores': 'data/flowers.json'
    };

    // Cache to store loaded data
    const dataCache = {};

    // Checklist State
    const checklistKey = 'heartopia_checklist_fish';
    let checklistState = JSON.parse(localStorage.getItem(checklistKey)) || {};

    // --- Persistence & Init Logic ---

    // Function to update URL/State without reloading
    function updateState(view, category = '') {
        if (view === 'home') {
            history.pushState({ view: 'home' }, '', '#home');
            localStorage.setItem('heartopia_last_view', 'home');
        } else {
            history.pushState({ view: 'category', category: category }, '', `#${category}`);
            localStorage.setItem('heartopia_last_view', category);
        }
    }

    async function fetchData(category) {
        if (dataCache[category]) return dataCache[category];

        const url = DATA_SOURCES[category];
        if (!url) return [];

        try {
            grid.innerHTML = '<div class="loading"><div class="loader"></div> Cargando...</div>';
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            dataCache[category] = data;
            return data;
        } catch (e) {
            console.error("Error loading data:", e);
            grid.innerHTML = '<div class="error-msg">Error cargando datos. Por favor intenta de nuevo.</div>';
            return null;
        }
    }

    async function showCategory(category) {
        document.body.classList.remove('home-mode');
        homeView.classList.add('hidden');
        grid.classList.remove('hidden');
        mainNav.classList.remove('hidden');

        // Update UI Tabs
        navButtons.forEach(btn => {
            if (btn.getAttribute('data-category') === category) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Clear content temporarily or show loading state handled in fetchData
        // However, we want to clear immediately to avoid old content showing while loading new
        grid.innerHTML = '';

        const items = await fetchData(category);
        if (!items) return;

        if (category === 'peces') {
            renderFishTable(items);
        } else {
            renderCards(items, category);
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
        updateState('category', category);
    }

    function showHome() {
        document.body.classList.add('home-mode');
        homeView.classList.remove('hidden');
        grid.classList.add('hidden');
        mainNav.classList.add('hidden');

        grid.innerHTML = '';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        updateState('home');
    }

    // --- Cards & Table Logic ---

    function renderCards(items, category) {
        grid.innerHTML = '';
        grid.className = 'card-grid';

        if (!items || items.length === 0) {
            grid.innerHTML = '<div class="loading">No hay datos disponibles.</div>';
            return;
        }

        const fragment = document.createDocumentFragment();

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'card';

            const name = item["Receta"] || item["Nombre"] || "Sin Nombre";

            // Image Path Logic
            let imagePath = item.Imagen;
            // Auto-fix paths if they lack the category subfolder but exist in root 'imagenes' logic
            if (imagePath && imagePath.startsWith('imagenes/') && !imagePath.includes(`/${category}/`)) {
                imagePath = imagePath.replace('imagenes/', `imagenes/${category}/`);
            }

            const image = imagePath || `https://placehold.co/150x150/FFCCBC/5D4037?text=${encodeURIComponent(name.charAt(0))}`;

            // Prices/Values
            const price1 = item["⭐ 1"] || "0";
            const price2 = item["⭐ 2"] || "0";
            const price3 = item["⭐ 3"] || "0";
            const price4 = item["⭐ 4"] || "0";
            const price5 = item["⭐ 5"] || "0";

            const ingredients = item["Ingredientes"] || " ";

            card.innerHTML = `
                <div class="card-header">
                    <div class="card-info">
                        <h2 class="card-title">${name}</h2>
                    </div>
                    <div class="card-image-container">
                        <img src="${image}" alt="${name}" class="card-image" loading="lazy">
                    </div>
                </div>
                <div class="card-content">
                    <div class="ingredients-box">
                        <span class="ingredients-label">Ingredientes</span>
                        <p class="ingredients-text">${ingredients}</p>
                    </div>
                    <div class="stars-price">
                        ${renderPriceRow('★', price1)}
                        ${renderPriceRow('★★', price2)}
                        ${renderPriceRow('★★★', price3)}
                        ${renderPriceRow('★★★★', price4)}
                        ${renderPriceRow('★★★★★', price5)}
                    </div>
                </div>
            `;
            fragment.appendChild(card);
        });

        grid.appendChild(fragment);
    }

    // --- Fish Table Logic ---

    function renderFishTable(items) {
        grid.innerHTML = '';
        grid.className = 'fish-view-container';

        let currentPage = 1;
        const itemsPerPage = 10;
        let viewMode = 'table'; // 'table' or 'cards'

        // Cache filtered items to avoid re-filtering on pagination
        let currentFilteredItems = [...items];

        // State Migration (Boolean -> Object) if needed
        // Format: { "FishName": { 1: false, 2: true... } }
        const cleanState = {};
        Object.keys(checklistState).forEach(key => {
            const val = checklistState[key];
            if (typeof val === 'boolean') {
                // Migrate old boolean to 1-star equivalent
                cleanState[key] = { 1: val, 2: false, 3: false, 4: false, 5: false };
            } else if (typeof val === 'object') {
                cleanState[key] = val;
            }
        });
        checklistState = { ...checklistState, ...cleanState };
        localStorage.setItem(checklistKey, JSON.stringify(checklistState));

        const container = document.createElement('div');
        container.className = 'fish-container';

        // 1. Controls Header (Filters + Toggle)
        const controlsHeader = document.createElement('div');
        controlsHeader.style.display = 'flex';
        controlsHeader.style.flexWrap = 'wrap';
        controlsHeader.style.justifyContent = 'space-between';
        controlsHeader.style.alignItems = 'flex-start';
        controlsHeader.style.gap = '15px';
        controlsHeader.style.marginBottom = '20px';

        const filtersDiv = document.createElement('div');
        filtersDiv.className = 'fish-filters';
        filtersDiv.style.marginBottom = '0'; // Overlay reset

        const locations = [...new Set(items.map(i => i.Location))].sort();
        const weathers = [...new Set(items.map(i => i.Weather))].sort();
        const times = [...new Set(items.map(i => i.Time))].sort();

        // Helper to create select
        const createSelect = (placeholder, options, id) => {
            const select = document.createElement('select');
            select.id = id;
            select.className = 'fish-filter-select';
            const defaultOpt = document.createElement('option');
            defaultOpt.value = 'all';
            defaultOpt.textContent = placeholder;
            select.appendChild(defaultOpt);
            options.forEach(opt => {
                const el = document.createElement('option');
                el.value = opt;
                el.textContent = opt;
                select.appendChild(el);
            });
            return select;
        };

        filtersDiv.appendChild(createSelect('Filtro Ubicación', locations, 'location-filter'));
        filtersDiv.appendChild(createSelect('Filtro Clima', weathers, 'weather-filter'));
        filtersDiv.appendChild(createSelect('Filtro Hora', times, 'time-filter'));

        // Toggle Button
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'toggle-view-btn';
        toggleBtn.innerHTML = '<i class="fas fa-th-large"></i> Ver como Tarjetas';
        toggleBtn.onclick = () => {
            viewMode = viewMode === 'table' ? 'cards' : 'table';
            toggleBtn.innerHTML = viewMode === 'table' ? '<i class="fas fa-th-large"></i> Ver como Tarjetas' : '<i class="fas fa-list"></i> Ver como Tabla';
            currentPage = 1;
            renderContent();
        };

        controlsHeader.appendChild(filtersDiv);
        controlsHeader.appendChild(toggleBtn);

        // 2. Content Container (Table or Grid)
        const contentWrapper = document.createElement('div');
        contentWrapper.id = 'fish-content-wrapper';

        // 3. Pagination Controls
        const paginationDiv = document.createElement('div');
        paginationDiv.className = 'pagination-controls';
        paginationDiv.innerHTML = `
            <button id="prev-btn" class="pagination-btn" disabled aria-label="Página anterior">Anterior</button>
            <span id="pagination-info" class="pagination-info">Página 1 de 1</span>
            <button id="next-btn" class="pagination-btn" aria-label="Siguiente página">Siguiente</button>
        `;

        container.appendChild(controlsHeader);
        container.appendChild(contentWrapper);
        container.appendChild(paginationDiv);
        grid.appendChild(container);

        // References
        const locFilter = document.getElementById('location-filter');
        const weatherFilter = document.getElementById('weather-filter');
        const timeFilter = document.getElementById('time-filter');
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const pageInfo = document.getElementById('pagination-info');

        function renderStars(fishName) {
            const state = checklistState[fishName] || {};
            let html = '<div class="star-group">';
            for (let i = 1; i <= 5; i++) {
                const active = state[i] ? 'active' : '';
                html += `<span class="star-check ${active}" data-name="${fishName}" data-star="${i}">★</span>`;
            }
            html += '</div>';
            return html;
        }

        function renderContent() {
            contentWrapper.innerHTML = '';

            // Pagination Slice
            const totalPages = Math.ceil(currentFilteredItems.length / itemsPerPage) || 1;
            if (currentPage > totalPages) currentPage = totalPages;
            if (currentPage < 1) currentPage = 1;
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const slicedItems = currentFilteredItems.slice(startIndex, endIndex);

            if (viewMode === 'table') {
                const table = document.createElement('table');
                table.className = 'fish-table';
                table.innerHTML = `
                <thead>
                    <tr>
                        <th scope="col" style="width: 120px;">Progreso</th>
                        <th scope="col">Nivel</th>
                        <th scope="col">Ilustración</th>
                        <th scope="col">Nombre</th>
                        <th scope="col">Ubicación</th>
                        <th scope="col">Sombra</th>
                        <th scope="col">Clima</th>
                        <th scope="col">Hora</th>
                    </tr>
                </thead>
                <tbody></tbody>`;

                const tbody = table.querySelector('tbody');

                slicedItems.forEach(item => {
                    const row = document.createElement('tr');
                    row.className = 'fish-row';

                    // Mark row as caught if ANY star is checked? or maybe just style the stars?
                    // Let's keep row clear for now, focus on stars.
                    const state = checklistState[item.Name];
                    if (state && Object.values(state).some(v => v)) {
                        row.classList.add('caught');
                    }

                    const isRed = item.Unconfirmed ? 'fish-unconfirmed' : '';

                    // Image Logic
                    let displayImage;
                    if (item.Image && (item.Image.length < 5 && !item.Image.includes('.') && !item.Image.includes('/'))) {
                        displayImage = `<span style="font-size: 2rem;" role="img" aria-label="${item.Name}">${item.Image}</span>`;
                    } else {
                        let imagePath = item.Image;
                        if (imagePath && imagePath.startsWith('imagenes/') && !imagePath.includes('/peces/')) {
                            imagePath = imagePath.replace('imagenes/', 'imagenes/peces/');
                        }
                        displayImage = imagePath ? `<img src="${imagePath}" class="fish-icon" alt="${item.Name}">` : '<img src="imagenes/peces/fish_icon.png" class="fish-icon" alt="Fish">';
                    }

                    row.innerHTML = `
                        <td>${renderStars(item.Name)}</td>
                        <td>${item.Level}</td>
                        <td>${displayImage}</td>
                        <td class="fish-name ${isRed}">${item.Name}</td>
                        <td>${item.Location}</td>
                        <td>${item.Shadow}</td>
                        <td>${item.Weather}</td>
                        <td>${item.Time}</td>
                    `;
                    tbody.appendChild(row);
                });
                contentWrapper.appendChild(table);

            } else {
                // CARDS MODE
                const cardGrid = document.createElement('div');
                cardGrid.className = 'card-grid'; // Reuse existing grid styles
                cardGrid.style.padding = '0'; // Reset padding in this context

                slicedItems.forEach(item => {
                    const card = document.createElement('div');
                    card.className = 'card';

                    const name = item.Name;
                    let imagePath = item.Image;
                    if (imagePath && imagePath.startsWith('imagenes/') && !imagePath.includes('/peces/')) {
                        imagePath = imagePath.replace('imagenes/', 'imagenes/peces/');
                    }
                    const image = (imagePath && imagePath.length > 5) ? imagePath : `https://placehold.co/150x150/81C784/1B5E20?text=${encodeURIComponent(name.charAt(0))}`;
                    // Use actual emoji if it's emoji-based? 
                    const imgDisplay = (item.Image && item.Image.length < 5)
                        ? `<div style="font-size:4rem; display:flex; justify-content:center; align-items:center; height:100%;">${item.Image}</div>`
                        : `<img src="${image}" alt="${name}" class="card-image" loading="lazy">`;

                    // Generate Prices (Placeholders since we don't have data yet)
                    // We assume fields might exist or default to '?'
                    const price1 = item["⭐ 1"] || "?";
                    const price2 = item["⭐ 2"] || "?";
                    const price3 = item["⭐ 3"] || "?";
                    const price4 = item["⭐ 4"] || "?";
                    const price5 = item["⭐ 5"] || "?";

                    card.innerHTML = `
                        <div class="card-header">
                            <div class="card-info">
                                <h2 class="card-title">${name}</h2>
                                <span style="font-size:0.8rem; color:var(--primary-color);">${item.Level}</span>
                            </div>
                            <div class="card-image-container" style="background:${item.Image && item.Image.length < 5 ? 'transparent' : ''}">
                                ${imgDisplay}
                            </div>
                        </div>
                        <div class="card-content">
                            <div class="fish-details">
                                <span class="fish-pill">📍 ${item.Location}</span>
                                <span class="fish-pill">☁️ ${item.Weather}</span>
                                <span class="fish-pill">🕒 ${item.Time}</span>
                                <span class="fish-pill">⚫ ${item.Shadow}</span>
                            </div>
                            <div style="margin-bottom: 10px;">
                                <label style="font-size:0.8rem; font-weight:bold;">Colección:</label>
                                ${renderStars(name)}
                            </div>
                            <div class="stars-price">
                                ${renderPriceRow('★', price1)}
                                ${renderPriceRow('★★', price2)}
                                ${renderPriceRow('★★★', price3)}
                                ${renderPriceRow('★★★★', price4)}
                                ${renderPriceRow('★★★★★', price5)}
                            </div>
                        </div>
                    `;
                    cardGrid.appendChild(card);
                });
                contentWrapper.appendChild(cardGrid);
            }

            // Click Events for Stars (Delegation)
            contentWrapper.querySelectorAll('.star-check').forEach(star => {
                star.addEventListener('click', (e) => {
                    const name = e.target.getAttribute('data-name');
                    const starNum = parseInt(e.target.getAttribute('data-star'));

                    if (!checklistState[name]) checklistState[name] = {};
                    // Toggle current star
                    checklistState[name][starNum] = !checklistState[name][starNum];

                    localStorage.setItem(checklistKey, JSON.stringify(checklistState));

                    // Simple UI update without full re-render for performance
                    e.target.classList.toggle('active');

                    // Optional: Update row 'caught' style if in table
                    if (viewMode === 'table') {
                        const row = e.target.closest('tr');
                        if (row) {
                            if (Object.values(checklistState[name]).some(v => v)) {
                                row.classList.add('caught');
                            } else {
                                row.classList.remove('caught');
                            }
                        }
                    }
                });
            });

            // Update Pagination Info
            pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
            prevBtn.disabled = currentPage === 1;
            nextBtn.disabled = currentPage === totalPages;
        }

        // Filter Logic
        function runFilters() {
            const locVal = locFilter.value;
            const weatherVal = weatherFilter.value;
            const timeVal = timeFilter.value;

            currentFilteredItems = items.filter(item => {
                if (locVal !== 'all' && item.Location !== locVal) return false;
                if (weatherVal !== 'all' && item.Weather !== weatherVal) return false;
                if (timeVal !== 'all' && item.Time !== timeVal) return false;
                return true;
            });
            currentPage = 1;
            renderContent();
        }

        locFilter.addEventListener('change', runFilters);
        weatherFilter.addEventListener('change', runFilters);
        timeFilter.addEventListener('change', runFilters);

        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderContent();
                // Avoid scrolling to top on simple page change to keep context? 
                // User preference. Let's scroll to container top.
                container.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });

        nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(currentFilteredItems.length / itemsPerPage) || 1;
            if (currentPage < totalPages) {
                currentPage++;
                renderContent();
                container.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });

        // Initial Render
        renderContent();
    }

    function renderPriceRow(label, price) {
        if (!price || price === "0" || price === "") return ''; // Optimize: Don't render empty prices
        return `
            <div class="price-row">
                <span class="star-icon">${label}</span>
                <span class="price-val">${price}</span>
            </div>
        `;
    }

    // Event Listeners
    categoryCards.forEach(card => {
        card.addEventListener('click', () => {
            const cat = card.getAttribute('data-category');
            showCategory(cat);
        });
    });

    navButtons.forEach(btn => {
        if (btn.hasAttribute('data-category')) {
            btn.addEventListener('click', () => {
                showCategory(btn.getAttribute('data-category'));
            });
        }
    });

    homeNavBtn.addEventListener('click', showHome);
    siteTitle.addEventListener('click', showHome);

    // Init Logic
    const savedView = localStorage.getItem('heartopia_last_view');
    const hash = window.location.hash.replace('#', '');
    const initialTarget = hash || savedView;

    if (initialTarget && initialTarget !== 'home' && DATA_SOURCES[initialTarget]) {
        showCategory(initialTarget);
    } else {
        showHome();
    }
});