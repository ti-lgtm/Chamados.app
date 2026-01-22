# **App Name**: Chamados.app

## Core Features:

- Autenticação de Usuário: Suporte para login com e-mail/senha e Google, gerenciamento de sessão e controle de acesso baseado em autenticação.
- Gestão de Perfis de Usuário: Criação e gerenciamento de perfis de usuário (user, ti, admin) com armazenamento no Firestore, incluindo nome, email, role e data de criação.
- CRUD de Chamados: Permite criar, ler, atualizar e deletar chamados, incluindo título, descrição, status, prioridade, userId e assignedTo. Chamados são salvos no Firestore.
- Sistema de Comentários em Chamados: Adicionar e visualizar comentários em chamados, com informações do autor e data de criação. Comentários são armazenados no Firestore.
- Sistema de Avaliação de Chamados: Permitir que usuários avaliem chamados resolvidos com uma nota de 1 a 5 e um comentário opcional. As avaliações são armazenadas no Firestore.
- Upload de Anexos: Funcionalidade para fazer upload de anexos (imagens, documentos, etc.) para o Firebase Storage e associá-los aos chamados.
- Painel de Controle Simplificado: Um painel de controle com informações gerais sobre chamados (por status, prioridade, etc.) para usuários TI e administradores.

## Style Guidelines:

- Cor primária: Azul (#29ABE2) para transmitir profissionalismo e confiança.
- Cor de fundo: Branco acinzentado (#F0F2F5) para uma aparência limpa e moderna.
- Cor de destaque: Verde (#228B22) para indicar ações positivas ou status resolvido.
- Fonte para títulos: 'Poppins', sans-serif, para uma aparência moderna e geométrica.
- Fonte para corpo do texto: 'PT Sans', sans-serif, para boa legibilidade e clareza.
- Utilizar ícones claros e intuitivos para representar ações e status, com foco na usabilidade.
- Design responsivo para garantir a acessibilidade em diferentes dispositivos e tamanhos de tela.
- Animações sutis para melhorar a experiência do usuário, como transições suaves e feedback visual ao interagir com os elementos.