# Documentação Técnica e Funcional - Portal de Suporte e Compras

## 1. Visão Geral
O **Portal de Suporte e Compras** é uma plataforma centralizada para gestão de chamados técnicos, solicitações de compras de TI, agendamentos de salas e compartilhamento de conhecimento. O sistema foi construído com foco em rastreabilidade, automação e experiência do usuário (UX).

---

## 2. Perfis de Acesso
O sistema possui três níveis de permissão:

*   **Usuário (User):** Perfil básico. Pode abrir chamados, solicitar compras, ver seus próprios registros, acessar a base de conhecimento e agendar salas.
*   **Técnico (TI):** Possui todas as permissões de usuário, além de gerenciar chamados de terceiros, visualizar estatísticas, configurar auto-chamados e adicionar conteúdos à base de conhecimento.
*   **Administrador (Admin):** Nível total. Além das funções de TI, gerencia usuários (aprovação/suspensão/edição), configura templates de e-mail e tem visão global de todos os dados.

---

## 3. Fluxo de Acesso e Segurança
### 3.1 Cadastro e Aprovação
Todo novo usuário que se cadastra via formulário entra no sistema com o status **"Suspenso"**. Ele não consegue visualizar dados sensíveis até que um **Administrador** altere seu status para **"Ativo"** na tela de Gestão de Usuários.

### 3.2 Unificação de Contas (Google)
O portal permite a entrada via Google. Caso o usuário tenha se cadastrado originalmente com e-mail e senha, e posteriormente tente entrar com o Google usando o mesmo e-mail, o sistema realiza a **unificação automática**. O perfil existente é mantido e vinculado ao login social de forma transparente.

---

## 4. Módulos do Sistema

### 4.1 Dashboard (Painel de Controle)
*   **Visão Usuário:** Lista cronológica dos seus chamados e compras, com filtros por status e barra de busca. Exibe alertas de avaliações pendentes.
*   **Visão TI/Admin:** Painel de indicadores (KPIs) em tempo real: Chamados Abertos, Meus Chamados, Atendimentos Ativos e Compras Pendentes. Inclui notificações sonoras e visuais para novos registros.

### 4.2 Gestão de Chamados (Suporte vs. Compras)
O sistema diferencia o fluxo de trabalho dependendo do tipo de serviço:
*   **Suporte:** Focado em resolução técnica com controle de SLA (Prazo de conclusão baseado na prioridade: Alta 24h, Normal 3 dias, Baixa 7 dias).
*   **Compras:** Fluxo específico de cotação e entrega. Possui campos de contato e empresa vinculada.
*   **Funcionalidades Internas:**
    *   **Atribuir a mim:** Botão rápido para técnicos assumirem chamados instantaneamente.
    *   **Histórico de Conversas:** Chat interno entre técnico e usuário com suporte a anexos e colagem de imagens (Ctrl+V).
    *   **Notas Internas:** Espaço exclusivo para técnicos trocarem informações privadas sobre o chamado.
    *   **Rastreabilidade:** Log automático de quem abriu, quem atribuiu, quem reabriu e quem fechou o chamado.

### 4.3 Base de Conhecimento
Central de manuais e procedimentos.
*   **Sugestões Inteligentes:** Ao digitar o título de um novo chamado, o sistema sugere artigos relacionados para tentar resolver o problema antes mesmo da abertura.
*   **Destaques:** Artigos marcados como "Destaque" aparecem no topo para acesso rápido.

### 4.4 Agendamentos de Salas
Visualização e reserva de salas de reunião via integração com calendários externos. Permite que a equipe de TI altere as fotos das salas diretamente pela interface.

### 4.5 Estatísticas e Relatórios
Exclusivo para TI/Admin.
*   **Relatório Executivo:** Gráficos de eficiência por atendente, origem de demanda por setor, volume de entrada e índice de satisfação (CSAT).
*   **Impressão:** Layout otimizado para gerar relatórios em PDF ou papel.

### 4.6 Auto Chamados (Recorrência)
Permite programar a abertura automática de chamados em dias específicos do mês (ex: backups mensais, manutenção de servidores). O sistema verifica diariamente e gera o chamado sem intervenção humana.

---

## 5. Comunicação e Notificações
*   **E-mails Profissionais:** Templates HTML personalizados para abertura, fechamento e novos comentários.
*   **Gestão de Templates:** Administradores podem alterar os textos e layouts dos e-mails diretamente pelo portal.
*   **Notificações Sonoras:** Técnicos podem enviar seus próprios arquivos de áudio (MP3/WAV) para personalizar o alerta de novos chamados.

---

## 6. Especificações Técnicas
*   **Frontend:** Next.js 15 (App Router).
*   **Estilização:** Tailwind CSS + ShadCN UI.
*   **Backend:** Firebase (Firestore, Auth).
*   **Armazenamento:** Vercel Blob (Anexos e Imagens).
*   **Envio de E-mail:** Integração via SMTP2GO.
*   **Offline:** Suporte a PWA (Progressive Web App).
