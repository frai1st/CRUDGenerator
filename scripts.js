// DOM Elements
const appSwitcher = document.getElementById('app-switcher');
const endpointSwitch = document.getElementById('endpoint-switch');
const generatorSwitch = document.getElementById('generator-switch');
const endpointView = document.getElementById('endpoint-tester-view');
const generatorView = document.getElementById('fastify-generator-view');
const themeToggle = document.getElementById('theme-toggle');
const schemaModal = document.getElementById('schema-modal');
const closeModal = document.getElementById('close-modal');
const loadingOverlay = document.getElementById('loading-overlay');
const generateButton = document.getElementById('generate-ui');
const formatButton = document.getElementById('format-code');
const codeEditor = document.getElementById('code-editor');
const codePreview = document.getElementById('code-preview');
const previewContainer = document.getElementById('preview-container');
const endpointsContainer = document.getElementById('endpoints-container');
const viewSchemaButton = document.getElementById('view-schema');
const schemaContent = document.getElementById('schema-content');
const startTourButton = document.getElementById('start-tour');

// Theme toggle
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    localStorage.setItem('theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
});

// Check for saved theme
if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light-theme');
}

// Tour functionality
function startTour() {
    const intro = introJs();
    
    // Set options
    intro.setOptions({
        steps: [
            {
                element: '#app-switcher',
                intro: 'This application has two main features.',
                position: 'bottom'
            },
            {
                element: '#endpoint-switch',
                intro: 'API Explorer allows you to test and visualize your API endpoints.',
                position: 'bottom'
            },
            {
                element: '#generator-switch',
                intro: 'Generator creates database schema and generates Fastify API code automatically.',
                position: 'bottom'
            },
            {
                element: '.editor-panel',
                intro: 'Here you can paste your Fastify API code for visualization.',
                position: 'right'
            },
            {
                element: '#generate-ui',
                intro: 'Click this button to generate an interactive UI from your code.',
                position: 'left'
            },
            {
                element: '.result-panel',
                intro: 'Interactive endpoints will appear here after generation.',
                position: 'left'
            },
            {
                element: '.fg-left-panel',
                intro: 'In the Generator, you can build your database schema by adding tables and columns.',
                position: 'right'
            },
            {
                element: '.fg-output-container',
                intro: 'View the generated JSON schema and download the complete Fastify API code.',
                position: 'left'
            },
            {
                element: '#start-tour',
                intro: 'You can restart this tour anytime by clicking this button.',
                position: 'left'
            }
        ],
        showStepNumbers: false,
        showBullets: true,
        exitOnOverlayClick: true,
        exitOnEsc: true,
        nextLabel: 'Next',
        prevLabel: 'Previous',
        skipLabel: 'Skip',
        doneLabel: 'Done'
    });
    
    // Add event handlers for page switching during tour
    intro.onbeforechange(function(targetElement) {
        // Check which step we're on by finding the current element in our steps
        const currentStep = intro._currentStep;
        
        // If we're moving to step 6 (Generator tables) or 7 (Generator JSON output)
        if (currentStep === 6 || currentStep === 7) {
            // Switch to Generator view if not already active
            if (!generatorView.classList.contains('active')) {
                generatorSwitch.click();
            }
        } else if (currentStep >= 3 && currentStep <= 5) {
            // If we're on steps for API Explorer (step 3, 4, or 5)
            // Switch to API Explorer view if not already active
            if (!endpointView.classList.contains('active')) {
                endpointSwitch.click();
            }
        }
    });
    
    // Start the tour
    intro.start();
}

// Start tour button
if (startTourButton) {
    startTourButton.addEventListener('click', startTour);
}

// Show tour automatically on first visit
if (!localStorage.getItem('tourShown')) {
    // Set small timeout to ensure DOM is ready
    setTimeout(startTour, 800);
    localStorage.setItem('tourShown', 'true');
}

// App switcher
endpointSwitch.addEventListener('click', () => {
    endpointSwitch.classList.add('active');
    generatorSwitch.classList.remove('active');
    appSwitcher.classList.remove('second-active');
    endpointView.classList.add('active');
    generatorView.classList.remove('active');
});

generatorSwitch.addEventListener('click', () => {
    generatorSwitch.classList.add('active');
    endpointSwitch.classList.remove('active');
    appSwitcher.classList.add('second-active');
    generatorView.classList.add('active');
    endpointView.classList.remove('active');
});

// Modal controls
closeModal.addEventListener('click', () => {
    schemaModal.classList.remove('visible');
});

schemaModal.addEventListener('click', (e) => {
    if (e.target === schemaModal) {
        schemaModal.classList.remove('visible');
    }
});

// API code parsing functions
function parseAPICode(code) {
    console.log('Parsing API code...');
    const endpoints = [];
    let tables = [];
    
    // Match routes with various HTTP methods (flexible pattern)
    const methodPatterns = ['get', 'post', 'put', 'delete'];
    
    methodPatterns.forEach(method => {
        // Flexible regex that captures route definitions regardless of whitespace and formatting
        const routePattern = new RegExp(`server\\.${method}\\s*\\(\\s*['"]([^'"]+)['"]`, 'gi');
        let match;
        
        while ((match = routePattern.exec(code)) !== null) {
            const path = match[1];
            console.log(`Found ${method.toUpperCase()} endpoint: ${path}`);
            
            // Extract request body parameters for POST/PUT methods
            let params = [];
            if (method === 'post' || method === 'put') {
                // Look for destructuring patterns in the route handler
                const handlerStart = code.indexOf(match[0]);
                const nextOpenBrace = code.indexOf('{', handlerStart);
                if (nextOpenBrace !== -1) {
                    const closeBraceIndex = findMatchingBrace(code, nextOpenBrace);
                    const handlerCode = code.substring(nextOpenBrace, closeBraceIndex + 1);
                    
                    // Extract body parameters
                    const bodyParamsMatch = handlerCode.match(/const\s*{([^}]+)}\s*=\s*req\.body/);
                    if (bodyParamsMatch) {
                        params = bodyParamsMatch[1].split(',').map(p => p.trim()).filter(p => p);
                    }
                }
            }
            
            // Extract query parameters for GET method
            let queryParams = [];
            if (method === 'get') {
                // Look for destructuring patterns in the route handler
                const handlerStart = code.indexOf(match[0]);
                const nextOpenBrace = code.indexOf('{', handlerStart);
                if (nextOpenBrace !== -1) {
                    const closeBraceIndex = findMatchingBrace(code, nextOpenBrace);
                    const handlerCode = code.substring(nextOpenBrace, closeBraceIndex + 1);
                    
                    // Extract query parameters
                    const queryParamsMatch = handlerCode.match(/const\s*{([^}]+)}\s*=\s*req\.query/);
                    if (queryParamsMatch) {
                        queryParams = queryParamsMatch[1].split(',').map(p => p.trim()).filter(p => p);
                    }
                }
            }
            
            // Extract the resource name from the path
            // Handle both simple paths ('/users') and parameterized paths ('/users/:id')
            const pathParts = path.split('/').filter(Boolean);
            let entityName = '';
            
            if (pathParts.length > 0) {
                // Get the base resource name (e.g., 'users' from '/users/:id')
                entityName = pathParts[0];
                
                // If it's a root path or special case, handle accordingly
                if (entityName === '' || entityName === 'api') {
                    entityName = pathParts[1] || '';
                }
            }

            let customMessage = '';
            if (['post', 'put', 'delete'].includes(method)) {
                const handlerStart = code.indexOf(match[0]);
                const nextOpenBrace = code.indexOf('{', handlerStart);
                if (nextOpenBrace !== -1) {
                    const closeBraceIndex = findMatchingBrace(code, nextOpenBrace);
                    const handlerCode = code.substring(nextOpenBrace, closeBraceIndex + 1);

                    // return { message: '...' }
                    const returnMatch = handlerCode.match(/return\s*\{([^}]+)\}/s);
                    if (returnMatch) {
                        const returnContent = returnMatch[1];
                        const messageMatch = returnContent.match(/message\s*:\s*['"`]([^'"`]+)['"`]/);
                        if (messageMatch) {
                            customMessage = messageMatch[1];
                        }
                    }
                }
            }
            
            endpoints.push({ 
                method: method.toUpperCase(), 
                path,
                params,
                queryParams,
                entityName: entityName,
                customMessage
            });
        }
    });
    
    // Parse table schemas
    tables = parseSchemaInfo(code);
    
    return { endpoints, tables };
}

// Helper function to find matching closing brace
function findMatchingBrace(code, openBraceIndex) {
    let braceCount = 1;
    let i = openBraceIndex + 1;
    
    while (i < code.length && braceCount > 0) {
        if (code[i] === '{') {
            braceCount++;
        } else if (code[i] === '}') {
            braceCount--;
        }
        i++;
    }
    
    return i - 1;
}

function parseSchemaInfo(code) {
    console.log('Parsing schema information...');
    const tables = [];
    
    // Match table creation patterns more flexibly
    const tablePatternRegex = /createTable\s*\(\s*['"]([^'"]+)['"]/g;
    let tableMatch;
    
    while ((tableMatch = tablePatternRegex.exec(code)) !== null) {
        const tableName = tableMatch[1];
        console.log(`Found table: ${tableName}`);
        
        // Find the table definition block
        const tableDefStart = code.indexOf(tableMatch[0]);
        const startBraceIndex = code.indexOf('{', tableDefStart);
        
        if (startBraceIndex !== -1) {
            // Find the matching closing brace for the table definition
            const endBraceIndex = findMatchingBrace(code, startBraceIndex);
            const tableDefCode = code.substring(startBraceIndex, endBraceIndex + 1);
            
            // Extract column definitions
            const columns = [];
            const columnPattern = /table\.(\w+)\s*\(\s*['"]([^'"]+)['"]?(.*?)(?:(?:\)\s*\.)|(?:\)))/gs;
            let columnMatch;
            
            while ((columnMatch = columnPattern.exec(tableDefCode)) !== null) {
                const colType = columnMatch[1];
                const colName = columnMatch[2];
                const colOptions = columnMatch[3] || '';
                
                console.log(`Found column: ${colName} (${colType})`);
                
                columns.push({
                    name: colName,
                    type: colType,
                    required: colOptions.includes('notNullable'),
                    isPrimary: colOptions.includes('primary') || colType.includes('increments'),
                    isForeign: colOptions.includes('foreign') || colOptions.includes('references'),
                    reference: colOptions.includes('references') ? 
                        colOptions.match(/references\s*\(\s*['"]([^'"]+)['"]/)?.[1] : null
                });
            }
            
            tables.push({
                name: tableName,
                columns
            });
        }
    }
    
    return tables;
}

// Format code function
formatButton.addEventListener('click', () => {
    try {
        // Get the current code
        let code = codeEditor.value;
        
        // Simple JS formatter
        try {
            const jsonObj = JSON.parse(code);
            code = JSON.stringify(jsonObj, null, 2);
        } catch (e) {
            // Not JSON, apply basic formatting
            code = code
                .replace(/\s*\{\s*/g, ' {\n  ')
                .replace(/\s*\}\s*/g, '\n}\n')
                .replace(/;\s*/g, ';\n')
                .replace(/\s*,\s*/g, ', ')
                .replace(/\n\s*\n/g, '\n');
        }
        
        codeEditor.value = code;
        
        // Show formatted preview with syntax highlighting
        previewContainer.classList.add('active');
        codePreview.textContent = code;
        
        if (window.Prism) {
            Prism.highlightElement(codePreview);
        }
        
        // Automatically hide preview after 3 seconds
        setTimeout(() => {
            previewContainer.classList.remove('active');
        }, 3000);
        
    } catch (error) {
        console.error('Error formatting code:', error);
    }
});

// Generate UI from code
generateButton.addEventListener('click', function() {
    // Show loading animation
    loadingOverlay.classList.add('active');
    
    // Hide preview if visible
    previewContainer.classList.remove('active');
    
    // Simulate a delay (for visual effect)
    setTimeout(() => {
        try {
            const code = codeEditor.value;
            const parseResult = parseAPICode(code);
            const { endpoints, tables } = parseResult;
            
            console.log('Parsed endpoints:', endpoints);
            console.log('Parsed tables:', tables);
            
            // Remove the initial welcome state
            const initialState = document.querySelector('.initial-state');
            if (initialState) {
                initialState.remove();
            }
            
            // Clear previous endpoints
            endpointsContainer.innerHTML = '';
            
            if (endpoints.length === 0) {
                // Display message when no endpoints found
                showGenerationError('No API endpoints detected in the code. Make sure your code contains server.get(), server.post(), etc.');
            } else {
                // Organize endpoints by resource (entity name regardless of method)
                const endpointsByResource = {};
                
                // Group endpoints by resource name
                endpoints.forEach(endpoint => {
                    // Skip endpoints with empty entity names
                    if (!endpoint.entityName) return;
                    
                    if (!endpointsByResource[endpoint.entityName]) {
                        endpointsByResource[endpoint.entityName] = [];
                    }
                    endpointsByResource[endpoint.entityName].push(endpoint);
                });
                
                // Create UI for each resource group
                Object.keys(endpointsByResource).forEach(resource => {
                    const resourceEndpoints = endpointsByResource[resource];
                    
                    const entityGroup = document.createElement('div');
                    entityGroup.className = 'entity-group fade-in';
                    
                    // Create resource title
                    const entityTitle = document.createElement('h3');
                    entityTitle.className = 'entity-title';
                    entityTitle.textContent = capitalizeFirstLetter(resource);
                    entityGroup.appendChild(entityTitle);
                    
                    // Sort endpoints by method (GET, POST, PUT, DELETE in that order)
                    const methodOrder = { 'GET': 1, 'POST': 2, 'PUT': 3, 'DELETE': 4 };
                    resourceEndpoints.sort((a, b) => {
                        return (methodOrder[a.method] || 99) - (methodOrder[b.method] || 99);
                    });
                    
                    // Create endpoint cards for this resource
                    resourceEndpoints.forEach((endpoint, index) => {
                        const card = createEndpointCard(endpoint, index, tables);
                        entityGroup.appendChild(card);
                    });
                    
                    endpointsContainer.appendChild(entityGroup);
                });
            }
            
            // Generate schema visualization
            generateSchemaVisualization(tables);
        } catch (error) {
            console.error('Error generating UI:', error);
            showGenerationError('Error generating UI: ' + error.message);
        } finally {
            // Hide loading animation
            loadingOverlay.classList.remove('active');
        }
    }, 800);
});
    
// View schema button
viewSchemaButton.addEventListener('click', () => {
    const code = codeEditor.value;
    const { tables } = parseAPICode(code);
    generateSchemaVisualization(tables);
    schemaModal.classList.add('visible');
});

// Create endpoint card 
function createEndpointCard(endpoint, index, tables) {
    // Create card element
    const card = document.createElement('div');
    card.className = 'endpoint-card fade-in';
    card.style.animationDelay = `${index * 0.1}s`;
    
    // Create card header
    const header = document.createElement('div');
    header.className = 'endpoint-header';
    
    // Method badge
    const method = document.createElement('span');
    method.className = `endpoint-method method-${endpoint.method.toLowerCase()}`;
    method.textContent = endpoint.method;
    
    // Path display
    const path = document.createElement('span');
    path.className = 'endpoint-path';
    path.textContent = endpoint.path;
    
    header.appendChild(method);
    header.appendChild(path);
    card.appendChild(header);
    
    // Create card content
    const content = document.createElement('div');
    content.className = 'endpoint-content';
    
    // If it's a GET endpoint
    if (endpoint.method === 'GET') {
        const form = createQueryForm(endpoint);
        content.appendChild(form);
    }
    // If it's a POST or PUT endpoint
    else if (endpoint.method === 'POST' || endpoint.method === 'PUT') {
        const form = createSubmitForm(endpoint, tables);
        content.appendChild(form);
    }
    // If it's a DELETE endpoint
    else if (endpoint.method === 'DELETE') {
        const form = createDeleteForm(endpoint);
        content.appendChild(form);
    }
    
    // Add results container
    const resultContainer = document.createElement('div');
    resultContainer.className = 'endpoint-result hidden';
    resultContainer.innerHTML = '<pre class="result-json"></pre>';
    content.appendChild(resultContainer);
    
    card.appendChild(content);
    return card;
}

// Create a form for query parameters (GET endpoints) 
function createQueryForm(endpoint) {
    const form = document.createElement('form');
    form.className = 'endpoint-form query-form';
    
    // Add form fields based on query parameters
    if (endpoint.queryParams && endpoint.queryParams.length > 0) {
        const formRow = document.createElement('div');
        formRow.className = 'form-row';
        
        endpoint.queryParams.forEach(param => {
            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';
            
            const label = document.createElement('label');
            label.className = 'form-label';
            label.textContent = capitalizeFirstLetter(param);
            label.htmlFor = `query-${endpoint.path}-${param}`;
            
            const input = document.createElement('input');
            input.className = 'form-input';
            input.type = 'text';
            input.name = param;
            input.id = `query-${endpoint.path}-${param}`;
            input.placeholder = `Enter ${param}...`;
            
            formGroup.appendChild(label);
            formGroup.appendChild(input);
            formRow.appendChild(formGroup);
        });
        
        form.appendChild(formRow);
    } else {
        // No query params defined
        const noParams = document.createElement('p');
        noParams.className = 'no-params-message';
        noParams.textContent = 'This endpoint has no query parameters.';
        form.appendChild(noParams);
    }
    
    // Add submit button
    const actionDiv = document.createElement('div');
    actionDiv.className = 'endpoint-actions';
    
    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'btn btn-primary';
    submitBtn.innerHTML = `
        <span>Execute Query</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 5L20 12L13 19M4 12H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;
    
    actionDiv.appendChild(submitBtn);
    form.appendChild(actionDiv);
    
    // Add form event listener
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        simulateApiCall(endpoint, form);
    });
    
    return form;
}

// Create form for POST and PUT endpoints
function createSubmitForm(endpoint, tables) {
    const form = document.createElement('form');
    form.className = 'endpoint-form submit-form';
    
    // Find related table schema
    const relatedTable = tables.find(table => 
        table.name === endpoint.entityName || 
        table.name === endpoint.path.split('/')[1]
    );
    
    // Create form fields
    if (endpoint.params && endpoint.params.length > 0) {
        endpoint.params.forEach(param => {
            // Skip id for POST requests
            if (param === 'id' && endpoint.method === 'POST') return;
            
            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';
            
            const label = document.createElement('label');
            label.className = 'form-label';
            label.textContent = capitalizeFirstLetter(param);
            label.htmlFor = `param-${endpoint.path}-${param}`;
            
            const input = document.createElement('input');
            input.className = 'form-input';
            input.name = param;
            input.id = `param-${endpoint.path}-${param}`;
            
            // Determine input type based on param name or schema
            let inputType = 'text';
            
            if (relatedTable) {
                const column = relatedTable.columns.find(col => col.name === param);
                if (column) {
                    if (column.type === 'integer' || param.endsWith('ID')) {
                        inputType = 'number';
                    } else if (column.type === 'date' || param === 'data' || param.includes('date')) {
                        inputType = 'date';
                    } else if (param === 'email') {
                        inputType = 'email';
                    } else if (param === 'password' || param === 'senha') {
                        inputType = 'password';
                    }
                }
            } else {
                // Fallback type detection based on common param names
                if (param.endsWith('ID') || param === 'id') {
                    inputType = 'number';
                } else if (param === 'email') {
                    inputType = 'email';
                } else if (param === 'password' || param === 'senha') {
                    inputType = 'password';
                } else if (param === 'date' || param === 'data') {
                    inputType = 'date';
                }
            }
            
            input.type = inputType;
            input.placeholder = `Enter ${param}...`;
            
            formGroup.appendChild(label);
            formGroup.appendChild(input);
            form.appendChild(formGroup);
        });
    } else if (relatedTable) {
        // No params were found in the endpoint, but we have a related table
        // Create form fields based on table columns
        relatedTable.columns.forEach(column => {
            // Skip id for POST requests
            if ((column.name === 'id' || column.type === 'increments') && endpoint.method === 'POST') return;
            
            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';
            
            const label = document.createElement('label');
            label.className = 'form-label';
            label.textContent = capitalizeFirstLetter(column.name);
            label.htmlFor = `param-${endpoint.path}-${column.name}`;
            
            const input = document.createElement('input');
            input.className = 'form-input';
            input.name = column.name;
            input.id = `param-${endpoint.path}-${column.name}`;
            
            // Determine input type based on column type
            let inputType = 'text';
            
            if (column.type === 'integer' || column.name.endsWith('ID')) {
                inputType = 'number';
            } else if (column.type === 'date' || column.name === 'data') {
                inputType = 'date';
            } else if (column.name === 'email') {
                inputType = 'email';
            } else if (column.name === 'password' || column.name === 'senha') {
                inputType = 'password';
            }
            
            input.type = inputType;
            input.placeholder = `Enter ${column.name}...`;
            
            formGroup.appendChild(label);
            formGroup.appendChild(input);
            form.appendChild(formGroup);
        });
    } else {
        // No params or related table found
        const noParams = document.createElement('p');
        noParams.className = 'no-params-message';
        noParams.textContent = 'Could not determine parameters for this endpoint.';
        form.appendChild(noParams);
    }
    
    // Add submit button
    const actionDiv = document.createElement('div');
    actionDiv.className = 'endpoint-actions';
    
    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'btn btn-primary';
    submitBtn.innerHTML = endpoint.method === 'POST' ? 
        `<span>Create</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4V20M4 12H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>` : 
        `<span>Update</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
    
    actionDiv.appendChild(submitBtn);
    form.appendChild(actionDiv);
    
    // Add form event listener
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        simulateApiCall(endpoint, form);
    });
    
    return form;
}

// Create form for DELETE endpoints
function createDeleteForm(endpoint) {
    const form = document.createElement('form');
    form.className = 'endpoint-form delete-form';
    
    // Typically DELETE endpoints only need an ID
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';
    
    const idParam = endpoint.path.includes(':id') ? 'id' : 'ID';
    
    const label = document.createElement('label');
    label.className = 'form-label';
    label.textContent = `${capitalizeFirstLetter(idParam)} to Delete`;
    label.htmlFor = `delete-${endpoint.path}-id`;
    
    const input = document.createElement('input');
    input.className = 'form-input';
    input.type = 'number';
    input.name = idParam;
    input.id = `delete-${endpoint.path}-id`;
    input.placeholder = `Enter ${idParam}...`;
    input.required = true;
    
    formGroup.appendChild(label);
    formGroup.appendChild(input);
    form.appendChild(formGroup);
    
    // Add warning message
    const warning = document.createElement('div');
    warning.className = 'delete-warning';
    warning.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9V11M12 15H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0377 2.66667 10.2679 4L3.33975 16C2.56998 17.3333 3.53223 19 5.07183 19Z" 
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>This action cannot be undone. Be careful!</span>
    `;
    form.appendChild(warning);
    
    // Add submit button
    const actionDiv = document.createElement('div');
    actionDiv.className = 'endpoint-actions';
    
    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'btn btn-danger';
    submitBtn.innerHTML = `
        <span>Delete</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 7L18.1327 19.1425C18.0579 20.1891 17.187 21 16.1378 21H7.86224C6.81296 21 5.94208 20.1891 5.86732 19.1425L5 7M10 11V17M14 11V17M15 7V4C15 3.44772 14.5523 3 14 3H10C9.44772 3 9 3.44772 9 4V7M4 7H20" 
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;
    
    actionDiv.appendChild(submitBtn);
    form.appendChild(actionDiv);
    
    // Add form event listener
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        simulateApiCall(endpoint, form);
    });
    
    return form;
}

// Simulate an API call
function simulateApiCall(endpoint, form) {
    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }
    
    const resultContainer = form.nextElementSibling;
    const resultJson = resultContainer.querySelector('.result-json');
    
    // Add loading state to button
    const submitButton = form.querySelector('button[type="submit"]');
    const originalHTML = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = `
        <svg class="spinner-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2V6M12 18V22M4 12H2M6.31412 6.31412L3.5 3.5M17.6859 6.31412L20.5 3.5M6.31412 17.6859L3.5 20.5M17.6859 17.6859L20.5 20.5M22 12H20" 
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Processing...</span>
    `;
    
    // Simulate network delay
    setTimeout(() => {
        let mockResponse;
        
        switch (endpoint.method) {
            case 'GET':
                // For GET, return a list of items or filtered results
                mockResponse = generateMockGetResponse(endpoint, data);
                break;
            case 'POST':
                // For POST, return created item with ID
                mockResponse = {
                    message: endpoint.customMessage || `${endpoint.entityName} created successfully`,
                    id: Math.floor(Math.random() * 1000) + 1,
                    ...data,
                    timestamp: new Date().toISOString()
                };
                break;
            case 'PUT':
                // For PUT, return success message
                mockResponse = {
                    message: endpoint.customMessage || `${endpoint.entityName} with ID ${data.id} updated successfully`,
                    ...data,
                    updatedAt: new Date().toISOString()
                };
                break;
            case 'DELETE':
                // For DELETE, return success message
                mockResponse = {
                    message: endpoint.customMessage ||`${endpoint.entityName} with ID ${data.id || data.ID} deleted successfully`,
                    deletedAt: new Date().toISOString()
                };
                break;
        }
        
        // Display the mock response
        resultContainer.classList.remove('hidden');
        resultJson.textContent = JSON.stringify(mockResponse, null, 2);
        
        // Reset button state
        submitButton.disabled = false;
        submitButton.innerHTML = originalHTML;
        
        // Highlight the result
        if (window.Prism) {
            Prism.highlightElement(resultJson);
        }
        
    }, 800);
}

// Generate mock GET response based on entity and filters
function generateMockGetResponse(endpoint, filters) {
    const entityName = endpoint.entityName;
    const count = Math.floor(Math.random() * 5) + 1;
    const results = [];
    
    for (let i = 0; i < count; i++) {
        const item = {
            id: Math.floor(Math.random() * 1000) + 1
        };

            // Generic entity
        Object.keys(filters).forEach(key => {
            if (filters[key]) {
                item[key] = filters[key];
            } else {
                item[key] = `Value ${i + 1} for ${key}`;
            }
        });
        
        // Add some default values for empty queries
        if (Object.keys(item).length <= 1) {
            item.name = `${entityName.slice(0, -1)} ${item.id}`;
            item.createdAt = new Date().toISOString();
        }
        
        
        results.push(item);
    }
    
    return results;
}

// Generate schema visualization for modal
function generateSchemaVisualization(tables) {
    if (!tables || tables.length === 0) {
        schemaContent.innerHTML = '<p>No database schema found in the code.</p>';
        return;
    }
    
    const schemaContainer = document.createElement('div');
    schemaContainer.className = 'schema-container';
    
    tables.forEach(table => {
        const tableEl = document.createElement('div');
        tableEl.className = 'schema-table';
        
        const header = document.createElement('div');
        header.className = 'schema-table-header';
        header.textContent = table.name;
        
        const body = document.createElement('div');
        body.className = 'schema-table-body';
        
        table.columns.forEach(column => {
            const columnEl = document.createElement('div');
            columnEl.className = 'schema-column';
            
            const nameEl = document.createElement('div');
            nameEl.className = 'column-name';
            nameEl.textContent = column.name;
            
            // If it's a primary key or foreign key, add an icon
            if (column.isPrimary) {
                nameEl.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 4px;">
                        <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L9 19H6v3H3v-3.986L9.257 14.7A6 6 0 1121 9z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    ${column.name}
                `;
            } else if (column.isForeign) {
                nameEl.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 4px;">
                        <path d="M9 4H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2h-2M9 4V3a2 2 0 012-2h2a2 2 0 012 2v1M9 4h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    ${column.name}
                `;
            }
            
            const typeEl = document.createElement('div');
            typeEl.className = 'column-type';
            typeEl.textContent = column.type;
            
            columnEl.appendChild(nameEl);
            columnEl.appendChild(typeEl);
            body.appendChild(columnEl);
        });
        
        tableEl.appendChild(header);
        tableEl.appendChild(body);
        schemaContainer.appendChild(tableEl);
    });
    
    schemaContent.innerHTML = '';
    schemaContent.appendChild(schemaContainer);
}

// Show error message
function showGenerationError(message) {
    endpointsContainer.innerHTML = `
        <div class="welcome-message">
            <div class="welcome-icon">
                <svg width="50" height="50" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 9V13M12 17H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0377 2.66667 10.2679 4L3.33975 16C2.56998 17.3333 3.53223 19 5.07183 19Z" 
                          stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <h2 class="welcome-title">Error</h2>
            <p class="welcome-subtitle">${message}</p>
        </div>
    `;
}

// Utility function to capitalize first letter
function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Initialize with code highlighting
document.addEventListener('DOMContentLoaded', () => {
    if (window.Prism) {
        Prism.highlightAll();
    }
    
    // Load and initialize the Fastify Generator script
    loadFastifyGeneratorScript();
});

// Load the Fastify Generator script
function loadFastifyGeneratorScript() {
    const script = document.createElement('script');
    script.src = 'projetoGenerator.js';
    script.onload = () => {
        console.log('Fastify Generator script loaded');
        
        // Reference the DOM elements
        const tablesContainer = document.getElementById('tables-container');
        const addTableBtn = document.getElementById('add-table-btn');
        const jsonOutput = document.getElementById('json-output');
        const downloadBtn = document.getElementById('download-btn');
        
        // Initialize table counter
        let tableCounter = 0;
        
        // Add table event
        addTableBtn.addEventListener('click', () => addNewTable());
        
        // Add a new table to the generator
        function addNewTable() {
            const tableId = Date.now();
            tableCounter++;
            
            // Create table form
            const tableForm = document.createElement('div');
            tableForm.className = 'glass-card';
            tableForm.style.padding = '1.25rem';
            tableForm.style.marginBottom = '1.5rem';
            tableForm.setAttribute('data-table-id', tableId);
            
            tableForm.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                            <path d="M3 9H21" stroke="currentColor" stroke-width="2"/>
                            <path d="M9 9V21" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        <h3>Table Configuration</h3>
                    </div>
                    <button class="btn btn-danger btn-sm remove-table" data-table-id="${tableId}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 7L18.1327 19.1425C18.0579 20.1891 17.187 21 16.1378 21H7.86224C6.81296 21 5.94208 20.1891 5.86732 19.1425L5 7M10 11V17M14 11V17M15 7V4C15 3.44772 14.5523 3 14 3H10C9.44772 3 9 3.44772 9 4V7M4 7H20" 
                                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Remove
                    </button>
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <div class="form-group">
                        <label class="form-label">Table Name</label>
                        <input type="text" class="form-input table-name" placeholder="Enter table name (e.g., users, products)" required>
                    </div>
                </div>

                <h4 style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 9H21M8 3V21M18 15L15 18M18 15L21 18M18 15V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Columns
                </h4>
                <div class="columns-list" data-table-id="${tableId}">
                    <!-- Columns will be added here -->
                </div>

                <div style="margin-top: 1rem;">
                    <button class="btn btn-secondary btn-sm add-column" data-table-id="${tableId}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        Add Column
                    </button>
                </div>
            `;
            
            // Add the table form to the container
            tablesContainer.appendChild(tableForm);
            
            // Add event listener to the "Add Column" button
            const addColumnBtn = tableForm.querySelector('.add-column');
            addColumnBtn.addEventListener('click', () => addNewColumn(tableId));
            
            // Add event listener to the "Remove Table" button
            const removeTableBtn = tableForm.querySelector('.remove-table');
            removeTableBtn.addEventListener('click', () => removeTable(tableId));
            
            
            // Add an initial column
            addNewColumn(tableId);
            
            // Update the JSON output
            updateJsonOutput();
        }

        function updateJsonOutput() {
            const output = [];

            document.querySelectorAll('.glass-card[data-table-id]').forEach(tableForm => {
            const tableName = tableForm.querySelector('.table-name')?.value.trim();
            if (!tableName) return;

            const tableObj = { Tabela: tableName };

            tableForm.querySelectorAll('[data-column-id]').forEach(column => {
                const columnName = column.querySelector('.column-name')?.value.trim();
                const columnType = column.querySelector('.column-type')?.value;
                const properties = [];

                if (!columnName || !columnType) return;

                if (column.querySelector('.prop-primary')?.checked) properties.push("primary");
                if (column.querySelector('.prop-increments')?.checked) properties.push("increments");
                if (column.querySelector('.prop-notNullable')?.checked) properties.push("notNullable");
                if (column.querySelector('.prop-show')?.checked) properties.push("show");
                if (column.querySelector('.prop-foreign')?.checked) {
                const foreignRef = column.querySelector('.foreign-ref')?.value.trim();
                if (foreignRef) {
                    properties.push(`foreign.${foreignRef}`);
                } else {
                    properties.push("foreign");
                }
                }

                properties.push(columnType);
                tableObj[columnName] = properties;
            });

            output.push(tableObj);
            });

            const jsonOutput = document.getElementById('json-output');
            if (jsonOutput) {
            jsonOutput.textContent = JSON.stringify(output, null, 2);
            }
        }
        
        // Add a new column to a table
        function addNewColumn(tableId) {
            const columnId = Date.now();
            const columnsContainer = document.querySelector(`.columns-list[data-table-id="${tableId}"]`);

            const columnDiv = document.createElement('div');
            columnDiv.className = 'glass-card';
            columnDiv.style.padding = '1rem';
            columnDiv.style.marginBottom = '1rem';
            columnDiv.setAttribute('data-column-id', columnId);
            
            columnDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 6H20M9 12H20M9 18H20M5 6V6.01M5 12V12.01M5 18V18.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        Column Details
                    </div>
                    <button class="btn btn-danger btn-sm remove-column" data-column-id="${columnId}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Column Name</label>
                        <input type="text" class="form-input column-name" placeholder="Enter column name" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Data Type</label>
                        <select class="form-input column-type">
                            <option value="integer">Integer</option>
                            <option value="string">String</option>
                            <option value="text">Text</option>
                            <option value="date">Date</option>
                            <option value="boolean">Boolean</option>
                            <option value="decimal">Decimal</option>
                            <option value="json">JSON</option>
                            <option value="time">Time</option>
                            <option value="timestamp">Timestamp</option>
                        </select>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.75rem; margin-top: 1rem;">
                    <div class="property-checkbox" style="background: rgba(255,255,255,0.05); padding: 0.5rem; border-radius: var(--radius-sm); border: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; gap: 0.5rem;">
                        <input type="checkbox" id="primary-${columnId}" class="prop-primary">
                        <label for="primary-${columnId}" style="margin: 0; font-size: 0.875rem;">Primary Key</label>
                    </div>
                    <div class="property-checkbox" style="background: rgba(255,255,255,0.05); padding: 0.5rem; border-radius: var(--radius-sm); border: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; gap: 0.5rem;">
                        <input type="checkbox" id="increments-${columnId}" class="prop-increments">
                        <label for="increments-${columnId}" style="margin: 0; font-size: 0.875rem;">Auto Increment</label>
                    </div>
                    <div class="property-checkbox" style="background: rgba(255,255,255,0.05); padding: 0.5rem; border-radius: var(--radius-sm); border: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; gap: 0.5rem;">
                        <input type="checkbox" id="notNull-${columnId}" class="prop-notNullable">
                        <label for="notNull-${columnId}" style="margin: 0; font-size: 0.875rem;">Not Nullable</label>
                    </div>
                    <div class="property-checkbox" style="background: rgba(255,255,255,0.05); padding: 0.5rem; border-radius: var(--radius-sm); border: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; gap: 0.5rem;">
                        <input type="checkbox" id="show-${columnId}" class="prop-show">
                        <label for="show-${columnId}" style="margin: 0; font-size: 0.875rem;">Display in UI</label>
                    </div>
                    <div class="property-checkbox" style="background: rgba(255,255,255,0.05); padding: 0.5rem; border-radius: var(--radius-sm); border: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; gap: 0.5rem;">
                        <input type="checkbox" id="foreign-${columnId}" class="prop-foreign foreign-toggle">
                        <label for="foreign-${columnId}" style="margin: 0; font-size: 0.875rem;">Foreign Key</label>
                    </div>
                </div>
                
                <div class="foreign-key-group hidden" style="margin-top: 1rem; padding: 1rem; background: rgba(255,255,255,0.05); border-radius: var(--radius); border: 1px solid rgba(255,255,255,0.08);">
                    <div class="form-group">
                        <label>Referenced Columns (comma separated)</label>
                        <input type="text" class="form-input foreign-ref" placeholder="e.g., email.name">
                        <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-top: 0.25rem;">Format: columnName or columnName.displayColumn</div>
                    </div>
                </div>
            `;
            
            columnsContainer.appendChild(columnDiv);

            const removeColumnBtn = columnDiv.querySelector('.remove-column');
            removeColumnBtn.addEventListener('click', () => {
            columnDiv.remove();
            updateJsonOutput();
            });

            const foreignToggle = columnDiv.querySelector('.foreign-toggle');
            const foreignKeyGroup = columnDiv.querySelector('.foreign-key-group');
            foreignToggle.addEventListener('change', () => {
            if (foreignToggle.checked) {
                foreignKeyGroup.classList.remove('hidden');
            } else {
                foreignKeyGroup.classList.add('hidden');
            }
            updateJsonOutput();
            });

            // Add event listeners for updating the JSON output
            const inputs = columnDiv.querySelectorAll('input, select');
            inputs.forEach(input => {
            input.addEventListener('change', updateJsonOutput);
            input.addEventListener('input', updateJsonOutput);
            });

            const foreignRefInput = columnDiv.querySelector('.foreign-ref');
            if (foreignRefInput) {
            foreignRefInput.addEventListener('input', updateJsonOutput);
            }

            updateJsonOutput();
        }
        
        // Remove a table
        function removeTable(tableId) {
            const tableForm = document.querySelector(`[data-table-id="${tableId}"]`);
            if (tableForm) {
                tableForm.remove();
                updateJsonOutput();
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('[data-column-id]').forEach(column => {
            const inputs = column.querySelectorAll('input, select');
            inputs.forEach(input => {
                input.addEventListener('input', updateJsonOutput);
                input.addEventListener('change', updateJsonOutput);
            });

            const foreignRefInput = column.querySelector('.foreign-ref');
            if (foreignRefInput) {
                foreignRefInput.addEventListener('input', updateJsonOutput);
            }
            });
            updateJsonOutput();
        });
        
        // Handle download button
        downloadBtn.addEventListener('click', () => {
            try {
                const jsonConfig = JSON.parse(document.getElementById('json-output').textContent);
                const code = gerarProjetoCompleto(jsonConfig);
                const blob = new Blob([code], { type: 'application/javascript' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'appGerated.js';
                link.click();
                URL.revokeObjectURL(url);
            } catch (error) {
                console.error('Failed to generate code:', error);
                alert('Error generating code: ' + error.message);
            }
            });
        
        // Generate project code from the JSON config
        function generateProjectCode() {
            const jsonConfig = JSON.parse(jsonOutput.textContent);
            const code = generateCodeFromJson(jsonConfig);
            return code;
        }
    }
    
    document.body.appendChild(script);
}

// Error handling for script loading
window.onerror = function(message, source, lineno, colno, error) {
    console.error('Script error:', message, source, lineno);
    return true;
};
