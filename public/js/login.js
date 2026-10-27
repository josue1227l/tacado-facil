const formLogin = document.getElementById('formLogin');
const formCadastro = document.getElementById('formCadastro');
const botaoAlternar = document.getElementById('botaoAlternar');
const textoAlternar = document.getElementById('textoAlternar');
const mensagem = document.getElementById('mensagem');

let modoCadastro = false;

function mostrarMensagem(texto, erro = false) {
    mensagem.textContent = texto;
    mensagem.style.color = erro ? '#dc2626' : '#15803d';
}

botaoAlternar.addEventListener('click', () => {
    modoCadastro = !modoCadastro;

    formLogin.classList.toggle('oculto', modoCadastro);
    formCadastro.classList.toggle('oculto', !modoCadastro);

    textoAlternar.textContent = modoCadastro
        ? 'Já tem uma conta?'
        : 'Ainda não tem uma conta?';

    botaoAlternar.textContent = modoCadastro
        ? 'Fazer login'
        : 'Criar conta';

    mostrarMensagem('');
});

// Cadastro de cliente
formCadastro.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const dados = {
        nome: document.getElementById('cadastroNome').value.trim(),
        email: document.getElementById('cadastroEmail').value.trim(),
        senha: document.getElementById('cadastroSenha').value
    };

    try {
        const resposta = await fetch('/api/auth/cadastro', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados)
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(resultado.erro || 'Erro ao realizar cadastro.');
        }

        mostrarMensagem('Cadastro realizado! Agora você pode entrar.');

        formCadastro.reset();
        modoCadastro = false;

        formCadastro.classList.add('oculto');
        formLogin.classList.remove('oculto');

        textoAlternar.textContent = 'Ainda não tem uma conta?';
        botaoAlternar.textContent = 'Criar conta';
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    }
});

// Login
formLogin.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const dados = {
        email: document.getElementById('loginEmail').value.trim(),
        senha: document.getElementById('loginSenha').value
    };

    try {
        const resposta = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados)
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(resultado.erro || 'Erro ao fazer login.');
        }

        mostrarMensagem('Login realizado com sucesso!');

        window.location.href = '/painel';
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    }
});