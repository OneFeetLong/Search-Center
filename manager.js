document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const managerContainer = document.getElementById('manager-container');
    const modal = document.getElementById('engine-modal');
    
    const engineLabelInput = document.getElementById('engine-label');
    const engineUrlInput = document.getElementById('engine-url');
    const engineIconInput = document.getElementById('engine-icon');
    const folderChoiceGrid = document.getElementById('folder-choice-grid');
    
    const addFolderBtn = document.getElementById('add-folder');
    const openModalBtn = document.getElementById('open-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const saveEngineBtn = document.getElementById('save-engine');

    // --- State ---
    let folders = [];

    // --- Storage Handling ---
    function loadData() {
        chrome.storage.local.get(['folders'], (result) => {
            if (result.folders) {
                folders = result.folders;
            } else {
                // Initialize empty if nothing exists
                folders = []; 
            }
            render();
        });
    }

    function saveData() {
        chrome.storage.local.set({ folders: folders });
    }

    // --- Core Logic: Add Folder (Fixed) ---
    addFolderBtn.addEventListener('click', () => {
        // 1. Calculate the next folder number
        let counter = 1;
        let baseName = "New Folder";
        
        // Loop until we find a name that doesn't exist
        while (folders.some(f => f.name === `${baseName} ${counter}`)) {
            counter++;
        }

        const newFolder = {
            id: Date.now(), // Unique ID based on time
            name: `${baseName} ${counter}`,
            engines: []
        };

        folders.push(newFolder);
        saveData();
        render();
    });

    // --- Core Logic: Add Engine Modal ---
    openModalBtn.addEventListener('click', () => {
        // Clear inputs
        engineLabelInput.value = '';
        engineUrlInput.value = '';
        engineIconInput.value = '';
        
        // --- Clear previous folder choices ---
        folderChoiceGrid.innerHTML = '';

        if (folders.length === 0) {
            folderChoiceGrid.innerHTML = '<span style="color:red; font-size:0.9em;">Please create a folder first!</span>';
            saveEngineBtn.disabled = true; // Disable save if no folders
        } else {
            saveEngineBtn.disabled = false;
            
            // --- Generate a button for each existing folder ---
            folders.forEach(folder => {
                const choiceBtn = document.createElement('button');
                choiceBtn.textContent = folder.name;
                choiceBtn.className = 'folder-toggle-btn'; // Make sure this is in your CSS
                choiceBtn.style.padding = '5px 10px';
                choiceBtn.style.border = '1px solid #ccc';
                choiceBtn.style.borderRadius = '15px';
                choiceBtn.style.cursor = 'pointer';
                choiceBtn.style.background = '#fff';
                choiceBtn.dataset.fid = folder.id;

                // --- Click to toggle selection ---
                choiceBtn.addEventListener('click', () => {
                    choiceBtn.classList.toggle('selected');
                    if(choiceBtn.classList.contains('selected')) {
                        choiceBtn.style.background = '#3b82f6';
                        choiceBtn.style.color = '#fff';
                        choiceBtn.style.borderColor = '#3b82f6';
                    } else {
                        choiceBtn.style.background = '#fff';
                        choiceBtn.style.color = '#333';
                        choiceBtn.style.borderColor = '#ccc';
                    }
                });

                folderChoiceGrid.appendChild(choiceBtn);
            });
        }

        modal.classList.add('show');
    });

    closeModalBtn.addEventListener('click', () => {
        modal.classList.remove('show');
    });

    // --- Core Logic: Save Engine (Fixed) ---
    saveEngineBtn.addEventListener('click', () => {
        const name = engineLabelInput.value.trim();
        const url = engineUrlInput.value.trim();
        const icon = engineIconInput.value.trim();

        // --- Find which folders were selected in the modal ---
        const selectedBtns = folderChoiceGrid.querySelectorAll('.folder-toggle-btn.selected');
        
        if (!name || !url) {
            alert("Name and URL are required.");
            return;
        }

        if (selectedBtns.length === 0) {
            alert("Please select at least one folder to add this engine to.");
            return;
        }

        // --- Add the engine to every selected folder ---
        selectedBtns.forEach(btn => {
            const folderId = parseInt(btn.dataset.fid);
            const folder = folders.find(f => f.id === folderId);
            if (folder) {
                folder.engines.push({
                    name: name,
                    url: url,
                    icon: icon
                });
            }
        });

        saveData();
        render();
        modal.classList.remove('show');
    });

    // --- Rendering ---
    function render() {
        managerContainer.innerHTML = '';

        folders.forEach(folder => {
            // Create Folder Card
            const folderEl = document.createElement('div');
            folderEl.className = 'folder';
            folderEl.dataset.id = folder.id;

            // Folder HTML Structure
            folderEl.innerHTML = `
                <div class="folder-header">
                    <input type="text" class="folder-title-input" value="${folder.name}" data-id="${folder.id}">
                    <button class="delete-folder-btn" data-id="${folder.id}">🗑️</button>
                </div>
                <div class="engine-list"></div>
            `;

            // Render Engines inside this folder
            const listEl = folderEl.querySelector('.engine-list');
            folder.engines.forEach((engine, idx) => {
                const engineEl = document.createElement('div');
                engineEl.className = 'engine-card';
                engineEl.draggable = true; // Enable drag
                
                // Fallback icon logic
                const iconSrc = engine.icon || `https://www.google.com/s2/favicons?domain=${engine.url}&sz=64`;

                engineEl.innerHTML = `
                    <img src="${iconSrc}" class="engine-icon" width="20" height="20" style="margin-right:8px; border-radius:4px;">
                    <div class="engine-info">
                        <div class="engine-name">${engine.name}</div>
                    </div>
                    <button class="delete-engine-btn" data-fid="${folder.id}" data-idx="${idx}">×</button>
                `;

                // Drag Events
                engineEl.addEventListener('dragstart', (e) => handleDragStart(e, folder.id, idx));
                listEl.appendChild(engineEl);
            });

            // Folder Events
            folderEl.addEventListener('dragover', (e) => e.preventDefault()); // Allow dropping
            folderEl.addEventListener('drop', (e) => handleDrop(e, folder.id));

            managerContainer.appendChild(folderEl);
        });

        attachDynamicListeners();
    }

    function attachDynamicListeners() {
        // Rename Folder
        document.querySelectorAll('.folder-title-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const id = parseInt(e.target.dataset.id);
                const folder = folders.find(f => f.id === id);
                if (folder) {
                    folder.name = e.target.value;
                    saveData();
                }
            });
        });

        // Delete Folder
        document.querySelectorAll('.delete-folder-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (confirm('Delete this folder?')) {
                    const id = parseInt(e.target.dataset.id);
                    folders = folders.filter(f => f.id !== id);
                    saveData();
                    render();
                }
            });
        });

        // Delete Engine
        document.querySelectorAll('.delete-engine-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const folderId = parseInt(e.target.dataset.fid);
                const idx = parseInt(e.target.dataset.idx);
                const folder = folders.find(f => f.id === folderId);
                if (folder) {
                    folder.engines.splice(idx, 1);
                    saveData();
                    render();
                }
            });
        });
    }

    // --- Drag & Drop Handlers ---
    let draggedData = null;

    function handleDragStart(e, folderId, index) {
        draggedData = { sourceFolderId: folderId, index: index };
    }

    function handleDrop(e, targetFolderId) {
        e.preventDefault();
        if (!draggedData) return;

        const sourceFolder = folders.find(f => f.id === draggedData.sourceFolderId);
        const targetFolder = folders.find(f => f.id === targetFolderId);

        if (sourceFolder && targetFolder) {
            // Remove from source
            const [engine] = sourceFolder.engines.splice(draggedData.index, 1);
            // Add to target
            targetFolder.engines.push(engine);
            
            saveData();
            render();
        }
        draggedData = null;
    }

    // Initialize
    loadData();
});