// State
let GITHUB_TOKEN = '';
let REPO_OWNER = '';
let REPO_NAME = '';
let BRANCH = 'main';
let CURRENT_FILE_DATA = [];
let CURRENT_FILE_SHA = '';
let CURRENT_FILE_PATH = '';

// Check LocalStorage for credentials
document.addEventListener('DOMContentLoaded', () => {
    const storedToken = localStorage.getItem('gh_token');
    const storedOwner = localStorage.getItem('gh_owner');
    const storedName = localStorage.getItem('gh_name');

    if (storedToken && storedOwner && storedName) {
        document.getElementById('github-token').value = storedToken;
        document.getElementById('repo-owner').value = storedOwner;
        document.getElementById('repo-name').value = storedName;
    }
});

async function login() {
    const token = document.getElementById('github-token').value.trim();
    const owner = document.getElementById('repo-owner').value.trim();
    const name = document.getElementById('repo-name').value.trim();
    const branch = document.getElementById('repo-branch').value.trim();

    if (!token || !owner || !name) {
        showToast('Por favor completa todos los campos', 'error');
        return;
    }

    document.getElementById('login-loader').style.display = 'block';

    // Test Connection by fetching repo info
    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (response.ok) {
            GITHUB_TOKEN = token;
            REPO_OWNER = owner;
            REPO_NAME = name;
            BRANCH = branch;

            // Save to localStorage
            localStorage.setItem('gh_token', token);
            localStorage.setItem('gh_owner', owner);
            localStorage.setItem('gh_name', name);

            document.getElementById('login-section').style.display = 'none';
            document.getElementById('dashboard-section').style.display = 'block';
            document.getElementById('admin-nav').style.display = 'block';
            document.getElementById('user-display').textContent = owner;

            loadFile();
        } else {
            showToast('Error de conexión. Verifica tus datos.', 'error');
        }
    } catch (error) {
        console.error(error);
        showToast('Error de red al conectar con GitHub.', 'error');
    } finally {
        document.getElementById('login-loader').style.display = 'none';
    }
}

function logout() {
    localStorage.removeItem('gh_token');
    location.reload();
}

async function loadFile() {
    const filePath = document.getElementById('file-select').value;
    CURRENT_FILE_PATH = filePath;

    document.getElementById('table-container').innerHTML = '';
    document.getElementById('loading-data').style.display = 'block';
    document.getElementById('save-btn').style.display = 'none';

    try {
        const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}?ref=${BRANCH}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
            }
        });

        if (!response.ok) throw new Error('No se pudo cargar el archivo from GitHub');

        const data = await response.json();
        CURRENT_FILE_SHA = data.sha;

        // Decode Content (Base64) - Handle potential encoding issues with UTF-8
        const content = new TextDecoder().decode(Uint8Array.from(atob(data.content), c => c.charCodeAt(0)));

        // Pure JSON parsing
        try {
            CURRENT_FILE_DATA = JSON.parse(content);
        } catch (e) {
            throw new Error('El archivo no tiene un formato JSON válido.');
        }

        renderTable(CURRENT_FILE_DATA);

    } catch (error) {
        console.error(error);
        showToast(`Error: ${error.message}`, 'error');
        document.getElementById('table-container').innerHTML = `<p class="error">Error cargando datos: ${error.message}</p>`;
    } finally {
        document.getElementById('loading-data').style.display = 'none';
    }
}

const ITEMS_PER_PAGE = 10;
let currentPage = 1;

function renderTable(data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
        document.getElementById('table-container').innerHTML = '<p>No hay datos o el formato es incorrecto.</p>';
        return;
    }

    const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageData = data.slice(start, end);

    // Get Headers dynamically
    const allKeys = new Set();
    data.forEach(item => Object.keys(item).forEach(k => allKeys.add(k)));
    const headers = Array.from(allKeys);

    let html = `
        <div class="pagination-header" style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
            <span>Mostrando ${start + 1}-${Math.min(end, data.length)} de ${data.length} items</span>
            <div>
                <button class="action-btn" onclick="changePage(-1)" ${currentPage === 1 ? 'disabled' : ''} style="background: #e0e0e0;">Anterior</button>
                <span style="margin: 0 10px;">Página ${currentPage} de ${totalPages}</span>
                <button class="action-btn" onclick="changePage(1)" ${currentPage === totalPages ? 'disabled' : ''} style="background: #e0e0e0;">Siguiente</button>
            </div>
        </div>
        <table class="data-table"><thead><tr>`;

    html += '<th>Acciones</th>'; // Actions first
    headers.forEach(h => html += `<th>${h}</th>`);
    html += '</tr></thead><tbody>';

    pageData.forEach((row, index) => {
        // Adjust index to match original data array for editing/deleting
        const originalIndex = start + index;

        html += `<tr>`;
        html += `
            <td style="white-space: nowrap;">
                <button class="action-btn edit-btn" onclick="openEditModal(${originalIndex})" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn" onclick="deleteItem(${originalIndex})" title="Borrar"><i class="fas fa-trash"></i></button>
            </td>
        `;
        headers.forEach(h => {
            let val = row[h];
            if (val === undefined || val === null) val = '';
            if (typeof val === 'boolean') val = val ? '✅' : '❌';
            val = String(val); // Ensure string for length check
            if (val.length > 50) val = val.substring(0, 50) + '...';
            // Safe HTML escaping could be added here if XSS is a concern, but admin panel is usually internal-ish
            html += `<td>${val.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>`;
        });
        html += `</tr>`;
    });

    html += '</tbody></table>';
    document.getElementById('table-container').innerHTML = html;
}

function changePage(delta) {
    currentPage += delta;
    renderTable(CURRENT_FILE_DATA);
}

// Edit Logic
let editingIndex = -1;

function openEditModal(index) {
    editingIndex = index;
    const item = index === -1 ? {} : CURRENT_FILE_DATA[index];
    const isNew = index === -1;

    document.getElementById('modal-title').textContent = isNew ? 'Nuevo Item' : 'Editar Item';

    // Determine fields based on existing data schema
    const allKeys = new Set();
    if (CURRENT_FILE_DATA.length > 0) {
        CURRENT_FILE_DATA.forEach(i => Object.keys(i).forEach(k => allKeys.add(k)));
    } else {
        // Fallback fields based on file path for better UX on empty files
        if (CURRENT_FILE_PATH.includes('recipes')) allKeys.add('Receta').add('Imagen').add('Ingredientes');
        else if (CURRENT_FILE_PATH.includes('fish')) allKeys.add('Name').add('Location').add('Image');
        else allKeys.add('Nombre');
    }

    let formHtml = '';
    allKeys.forEach(key => {
        const val = item[key] !== undefined ? item[key] : '';
        // Check type for checkbox vs text
        if (typeof val === 'boolean') {
            formHtml += `
            <div class="form-group">
                <label>${key}</label>
                <select id="field-${key}" class="login-input">
                    <option value="true" ${val ? 'selected' : ''}>True (Verdadero)</option>
                    <option value="false" ${!val ? 'selected' : ''}>False (Falso)</option>
                </select>
            </div>`;
        } else {
            // Heuristic for large text?
            formHtml += `
            <div class="form-group">
                <label>${key}</label>
                <input type="text" id="field-${key}" class="login-input" value="${val.toString().replace(/"/g, '&quot;')}">
            </div>`;
        }
    });

    document.getElementById('modal-form').innerHTML = formHtml;
    document.getElementById('edit-modal').style.display = 'flex';
}

function addNewItem() {
    openEditModal(-1);
}

function closeModal() {
    document.getElementById('edit-modal').style.display = 'none';
}

function saveModal() {
    const newItem = {};
    const inputs = document.getElementById('modal-form').querySelectorAll('input, select');
    let hasContent = false;

    inputs.forEach(input => {
        const key = input.id.replace('field-', '');
        let val = input.value;
        if (val === 'true') val = true;
        else if (val === 'false') val = false;

        // Simple trim for strings
        if (typeof val === 'string') val = val.trim();

        newItem[key] = val;
        if (val) hasContent = true;
    });

    if (!hasContent) {
        showToast('El item no puede estar vacío.', 'error');
        return;
    }

    if (editingIndex === -1) {
        CURRENT_FILE_DATA.push(newItem);
    } else {
        CURRENT_FILE_DATA[editingIndex] = newItem;
    }

    renderTable(CURRENT_FILE_DATA);
    closeModal();
    markDirty();
    showToast('Item guardado en memoria. Recuerda "Guardar Cambios (Push)" para persistir.', 'success');
}

function deleteItem(index) {
    if (confirm('¿Estás seguro de borrar este item permanentemente?')) {
        CURRENT_FILE_DATA.splice(index, 1);
        renderTable(CURRENT_FILE_DATA);
        markDirty();
    }
}

function markDirty() {
    const btn = document.getElementById('save-btn');
    btn.style.display = 'inline-block';
    // Add visual cue
    btn.classList.add('pulse');
}

async function pushChanges() {
    if (!confirm('¿Estás seguro de subir estos cambios a GitHub? Esto actualizará la web en unos minutos.')) return;

    const btn = document.getElementById('save-btn');
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    try {
        // Pure JSON stringify
        const jsonString = JSON.stringify(CURRENT_FILE_DATA, null, 4);

        // Encode Base64 (Unicode safe)
        const contentEncoded = btoa(unescape(encodeURIComponent(jsonString)));

        const payload = {
            message: `CMS Update: ${CURRENT_FILE_PATH}`,
            content: contentEncoded,
            sha: CURRENT_FILE_SHA,
            branch: BRANCH
        };

        const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${CURRENT_FILE_PATH}`;
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const resData = await response.json();
            CURRENT_FILE_SHA = resData.content.sha; // Update SHA for next commit
            showToast('✅ Cambios guardados exitosamente!', 'success');
            btn.style.display = 'none';
        } else {
            const err = await response.json();
            throw new Error(err.message || 'Error desconocido de GitHub');
        }

    } catch (error) {
        console.error(error);
        showToast(`Error al guardar: ${error.message}`, 'error');
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function showToast(msg, type) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}
