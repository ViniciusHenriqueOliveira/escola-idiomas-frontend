// script.js (Versão 12 - Lógica Otimizada para Home e SPA)

// URL base da sua API REST (MUDAR PARA O ENDEREÇO DO RENDER APÓS O DEPLOY!)
const BACKEND_URL = 'http://localhost:3000'; 

let currentUser = null; 

// --- Funções de Navegação e Autenticação (RF01, RF02, RF07) ---

function showView(viewId) {
    // Esconde todas as views
    document.querySelectorAll('.view').forEach(view => {
        view.style.display = 'none';
        view.classList.remove('active');
    });
    
    // Mostra a view alvo
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.style.display = 'block';
        targetView.classList.add('active');
    }
    
    // Controle do cabeçalho
    const isPlatformView = (viewId === 'list-view' || viewId === 'form-view');
    const controlsDisplay = isPlatformView ? 'flex' : 'none';
    
    // Esconde o header na HOME
    const headerElement = document.getElementById('main-header');
    if (headerElement) {
        headerElement.style.display = (viewId === 'home-view') ? 'none' : 'flex';
    }

    document.getElementById('btnLogout').style.display = isPlatformView ? 'block' : 'none';
    document.getElementById('welcomeMessage').style.display = controlsDisplay;
}

function checkAuth() {
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('usuario');
    
    if (token && userJson) {
        currentUser = JSON.parse(userJson);
        document.getElementById('welcomeMessage').textContent = `Olá, ${currentUser.nome}!`;
        showView('list-view'); // Se logado, vai direto para a plataforma
        fetchTurmas(); 
    } else {
        currentUser = null;
        showView('home-view'); // Se não logado, começa na Home
        document.getElementById('welcomeMessage').textContent = '';
    }
}

// NOVO: Navegação entre telas da SPA
function handleNavigateTo(targetViewId) {
    if (targetViewId === 'home-view') {
        checkAuth(); // Verifica se está logado (se sim, vai para a listagem)
        return;
    }
    showView(targetViewId);
}

async function handleCadastro(e) {
    e.preventDefault();
    const nome = document.getElementById('cadastroNome').value;
    const email = document.getElementById('cadastroEmail').value;
    const senha = document.getElementById('cadastroSenha').value;

    try {
        const response = await fetch(`${BACKEND_URL}/api/usuarios/cadastro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha })
        });

        const data = await response.json();
        
        if (response.ok) {
            alert('Cadastro realizado com sucesso! Faça login.');
            document.getElementById('cadastro-form').reset();
            document.getElementById('loginEmail').value = email;
            document.getElementById('loginSenha').focus();
        } else {
            alert(`Erro ao cadastrar: ${data.error}`);
        }
    } catch (error) {
        console.error('Erro de rede:', error);
        alert('Erro de conexão com a API. Verifique se o servidor Node.js está rodando.');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const senha = document.getElementById('loginSenha').value;

    try {
        const response = await fetch(`${BACKEND_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('usuario', JSON.stringify(data.usuario)); 
            alert('Login bem-sucedido!');
            checkAuth(); // Vai para a listagem
        } else {
            alert(`Erro no login: ${data.error}`);
        }
    } catch (error) {
        console.error('Erro de rede:', error);
        alert('Erro de conexão com a API. Verifique se o servidor Node.js está rodando.');
    }
}

// LOGOUT: Volta para a Home
function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    currentUser = null;
    alert('Você foi desconectado.');
    showView('home-view'); 
}

// --- Funções de CRUD (Mantidas) ---

async function fetchTurmas() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch(`${BACKEND_URL}/api/turmas`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        const tbody = document.querySelector('#turmas-table tbody');
        if (!tbody) return; 

        tbody.innerHTML = ''; 
        const noTurmasMsg = document.getElementById('no-turmas-msg');

        if (response.ok && Array.isArray(data) && data.length > 0) {
            if (noTurmasMsg) noTurmasMsg.style.display = 'none';
            data.forEach(turma => {
                const row = tbody.insertRow();
                
                const matriculaText = turma.esta_matriculado ? 'Desmatricular' : 'Matricular';
                const matriculaClass = turma.esta_matriculado ? 'delete-btn' : ''; 
                const matriculaAction = turma.esta_matriculado ? `handleDesmatricular(${turma.id})` : `handleMatricular(${turma.id})`;
                const matriculaBtn = `<button class="${matriculaClass}" onclick="${matriculaAction}">${matriculaText}</button>`;

                const isCreator = currentUser && currentUser.id === turma.usuario_criador_id;
                const deleteBtn = isCreator 
                    ? `<button class="delete-btn" onclick="handleDeleteTurma(${turma.id})"><i class="fas fa-trash"></i> Excluir</button>`
                    : `<button class="delete-btn" disabled title="Apenas o criador pode excluir"><i class="fas fa-trash"></i> Excluir</button>`;
                
                const alunosBtn = `<button onclick="handleViewAlunos(${turma.id}, '${turma.nome}')"><i class="fas fa-users"></i> Ver Alunos</button>`;

                row.innerHTML = `
                    <td data-label="Nome">${turma.nome}</td>
                    <td data-label="Nível">${turma.nivel}</td>
                    <td data-label="Professor">${turma.professor}</td>
                    <td data-label="Horário">${turma.horario}</td>
                    <td data-label="Matrícula">${matriculaBtn}</td>
                    <td data-label="Gerenciar" style="display: flex; gap: 5px;">${deleteBtn} ${alunosBtn}</td>
                `;
            });
        } else if (response.ok && data.length === 0) {
            if (noTurmasMsg) noTurmasMsg.style.display = 'block';
        } else {
            if (response.status === 401 || response.status === 403) { handleLogout(); }
            console.error('Erro ao carregar turmas:', data.error);
        }

    } catch (error) {
        console.error('Erro de rede ao carregar turmas:', error);
        alert('Não foi possível conectar-se ao servidor. Verifique se o Back-end está rodando.');
    }
}

async function handleMatricular(turmaId) {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/matriculas/${turmaId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        
        if (response.ok || response.status === 409) { 
            alert(data.message);
            fetchTurmas(); 
        } else {
            alert(`Erro ao matricular: ${data.message || data.error}`);
        }
    } catch (error) {
        console.error('Erro de rede:', error);
        alert('Erro de conexão ao tentar matricular.');
    }
}

async function handleDesmatricular(turmaId) {
    if (!confirm('Tem certeza que deseja desmatricular desta turma?')) return;

    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/matriculas/${turmaId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message);
            fetchTurmas(); 
        } else {
            alert(`Erro ao desmatricular: ${data.message || data.error}`);
        }
    } catch (error) {
        console.error('Erro de rede:', error);
        alert('Erro de conexão ao tentar desmatricular.');
    }
}

async function handleViewAlunos(turmaId, turmaNome) {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/turmas/${turmaId}/alunos`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const alunos = await response.json();
        
        const modal = document.getElementById('alunos-modal');
        const ul = document.getElementById('alunos-list');
        const modalNome = document.getElementById('modal-turma-nome');

        if (!modal || !ul || !modalNome) return;

        if (response.ok) {
            ul.innerHTML = '';
            modalNome.textContent = turmaNome;

            if (alunos.length === 0) {
                ul.innerHTML = '<li>Nenhum aluno matriculado ainda.</li>';
            } else {
                alunos.forEach(aluno => {
                    const li = document.createElement('li');
                    li.textContent = `${aluno.nome} (${aluno.email})`;
                    ul.appendChild(li);
                });
            }

            modal.style.display = 'block'; 
        } else {
            alert(`Erro ao carregar alunos: ${alunos.error}`);
        }
    } catch (error) {
        console.error('Erro de rede:', error);
        alert('Erro de conexão ao buscar alunos.');
    }
}


async function handleSaveTurma(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const nome = document.getElementById('turmaNome').value;
    const nivel = document.getElementById('turmaNivel').value;
    const professor = document.getElementById('turmaProfessor').value;
    const horario = document.getElementById('turmaHorario').value;
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/turmas`, {
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ nome, nivel, professor, horario })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Turma salva com sucesso!');
            document.getElementById('turma-form').reset();
            showView('list-view');
            fetchTurmas();
        } else {
            alert(`Erro ao salvar: ${data.error}`);
        }
    } catch (error) {
        console.error('Erro de rede:', error);
        alert('Erro de conexão ao tentar salvar a turma.');
    }
}

async function handleDeleteTurma(id) {
    if (!confirm('Confirma a exclusão desta turma? Esta ação é permanente.')) return;

    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/turmas/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            alert('Turma excluída com sucesso.');
            fetchTurmas();
        } else {
            const data = await response.json();
            alert(`Erro ao excluir: ${data.error}`);
        }
    } catch (error) {
        console.error('Erro de rede:', error);
        alert('Erro de conexão ao tentar excluir a turma.');
    }
}


// --- Inicialização e Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Verifica a autenticação ao carregar
    checkAuth(); 

    // 2. LISTENERS DE NAVEGAÇÃO DA HOME/VOLTAR
    const btnAcessarLogin = document.getElementById('btnAcessarLogin');
    if (btnAcessarLogin) btnAcessarLogin.addEventListener('click', () => handleNavigateTo('auth-view'));
    
    const btnVoltarHome = document.getElementById('btnVoltarHome');
    if (btnVoltarHome) btnVoltarHome.addEventListener('click', () => handleNavigateTo('home-view'));

    // 3. LISTENERS DE AUTENTICAÇÃO (RF01, RF02)
    const loginForm = document.getElementById('login-form');
    const cadastroForm = document.getElementById('cadastro-form');
    const btnLogout = document.getElementById('btnLogout');

    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (cadastroForm) cadastroForm.addEventListener('submit', handleCadastro);
    if (btnLogout) btnLogout.addEventListener('click', handleLogout);

    // 4. Listeners de Navegação para o Formulário de Turma (RF03, RF07)
    const btnAbrirCadastroTurma = document.getElementById('btnAbrirCadastroTurma');
    const turmaForm = document.getElementById('turma-form');
    const btnCancelarTurma = document.getElementById('btnCancelarTurma');

    if (btnAbrirCadastroTurma) btnAbrirCadastroTurma.addEventListener('click', () => showView('form-view'));
    if (turmaForm) turmaForm.addEventListener('submit', handleSaveTurma);
    if (btnCancelarTurma) btnCancelarTurma.addEventListener('click', () => showView('list-view'));
    
    // 5. Listeners do Modal de Alunos
    const modal = document.getElementById('alunos-modal');
    const closeBtn = modal ? modal.querySelector('.close-button') : null;
    
    if (modal && closeBtn) {
        closeBtn.onclick = function() { modal.style.display = "none"; };
        window.onclick = function(event) { if (event.target == modal) modal.style.display = "none"; };
    }
});