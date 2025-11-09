# Documentação Técnica - Telas da Aplicação

## 1. `_layout.tsx` - Layout Raiz
**Localização:** `app/_layout.tsx`

**Função:** Componente raiz da aplicação que configura a estrutura de navegação e provê o contexto de autenticação para toda a aplicação.

**Funcionalidades:**
- Envolve toda a aplicação com o `AuthProvider` para gerenciar estado de autenticação globalmente
- Configura o `Stack` do Expo Router para navegação baseada em rotas
- Garante que o contexto de autenticação esteja disponível em todas as telas

---

## 2. `index.tsx` - Tela de Inicialização/Roteamento
**Localização:** `app/index.tsx`

**Função:** Tela de entrada da aplicação que decide qual rota o usuário deve acessar baseado no estado de autenticação.

**Funcionalidades:**
- Verifica se o usuário está autenticado através do `AuthContext`
- Exibe um indicador de carregamento enquanto verifica o estado de autenticação
- Redireciona automaticamente:
  - Para `/home` se o usuário estiver autenticado
  - Para `/login` se o usuário não estiver autenticado

**Estados:**
- `isLoading`: Controla a exibição do indicador de carregamento durante a verificação

---

## 3. `login.tsx` - Tela de Autenticação
**Localização:** `app/login.tsx`

**Função:** Tela responsável pelo login e registro de novos usuários.

**Funcionalidades:**
- **Modo Login:**
  - Campos: E-mail e senha
  - Validação de campos obrigatórios
  - Login via API com tratamento de erros amigáveis
  - Toggle para mostrar/ocultar senha

- **Modo Registro:**
  - Campos: Nome completo, e-mail e senha
  - Validação de campos obrigatórios
  - Registro via API com tratamento de erros
  - Mensagens de erro personalizadas (email já cadastrado, credenciais inválidas, etc.)

- **Recursos Comuns:**
  - Alternância entre modos de login e registro
  - Validação de formulário
  - Feedback visual durante carregamento
  - Layout responsivo com `KeyboardAvoidingView`
  - Tratamento de erros de rede e validação

**Estados:**
- `isLogin`: Controla se está em modo login ou registro
- `name`, `email`, `password`: Campos do formulário
- `showPassword`: Controla visibilidade da senha
- `isLoading`: Controla estado de carregamento durante requisições

---

## 4. `home.tsx` - Tela Principal
**Localização:** `app/home.tsx`

**Função:** Dashboard principal da aplicação, exibindo visão geral dos exames e lembretes do usuário.

**Funcionalidades:**
- **Header:**
  - Saudação personalizada com nome do usuário
  - Avatar com iniciais do nome (clicável para logout)
  - Logout através do avatar

- **Botão Principal:**
  - Acesso rápido à tela de exames médicos

- **Seção de Exames Recentes:**
  - Lista os 5 exames mais recentes
  - Exibe nome, data, tags (máximo 2 tags)
  - Link "Ver todos" para tela completa de exames
  - Estado vazio quando não há exames

- **Seção de Lembretes:**
  - Lista os próximos 3 lembretes (até 7 dias)
  - Exibe título e data formatada
  - Link "Ver todos" para tela completa de lembretes
  - Estado vazio quando não há lembretes

- **Navegação Inferior (Bottom Navigation):**
  - Home (ativo)
  - Exames
  - Lembretes
  - Perfil

- **Recursos:**
  - Pull-to-refresh para recarregar dados
  - Recarregamento automático quando a tela recebe foco
  - Formatação de datas em português brasileiro

**Estados:**
- `exams`: Lista de exames recentes
- `reminders`: Lista de lembretes próximos
- `isLoading`: Estado de carregamento inicial
- `isRefreshing`: Estado de refresh manual

---

## 5. `exams.tsx` - Lista de Exames
**Localização:** `app/exams.tsx`

**Função:** Exibe lista completa de todos os exames médicos do usuário com funcionalidades de gerenciamento.

**Funcionalidades:**
- **Header:**
  - Botão voltar
  - Título "Meus Exames"
  - Botão de adicionar exame (+)

- **Lista de Exames:**
  - Cards com informações de cada exame:
    - Nome do exame
    - Data do exame formatada
    - Observações (truncadas em 2 linhas)
    - Tags (máximo 3 tags visíveis)
    - Indicador de arquivos anexados
  - Botão de exclusão em cada card
  - Navegação para detalhes do exame ao tocar no card

- **Gerenciamento:**
  - Exclusão de exames com confirmação
  - Pull-to-refresh para recarregar lista
  - Recarregamento automático ao receber foco

- **Estado Vazio:**
  - Mensagem quando não há exames
  - Botão para adicionar primeiro exame

**Estados:**
- `exams`: Lista completa de exames
- `isLoading`: Estado de carregamento
- `isRefreshing`: Estado de refresh

**Ações:**
- `loadExams()`: Carrega lista de exames (limite de 50)
- `handleDeleteExam()`: Exclui exame com confirmação
- Navegação para `/add-exam` e `/exam-detail/[id]`

---

## 6. `add-exam.tsx` - Adicionar Exame
**Localização:** `app/add-exam.tsx`

**Função:** Formulário para criação de novos exames médicos com suporte a upload de arquivos.

**Funcionalidades:**
- **Formulário:**
  - **Nome do Exame** (obrigatório)
  - **Data do Exame** (formato DD/MM/AAAA com formatação automática)
  - **Observações** (campo de texto multilinha)
  - **Tags** (separadas por vírgula)

- **Upload de Arquivos:**
  - Botões para selecionar imagens da galeria
  - Botão para selecionar documentos (PDF, imagens, vídeos)
  - Lista de arquivos selecionados com:
    - Ícone por tipo de arquivo
    - Nome do arquivo
    - Tamanho formatado
    - Botão de remoção individual
  - Limites: máximo 10 arquivos, 50MB cada
  - Tipos suportados: JPG, PNG, PDF, MP4

- **Validação:**
  - Nome do exame obrigatório
  - Formatação e validação de data
  - Conversão de data DD/MM/AAAA para formato backend (AAAA-MM-DD)

- **Envio:**
  - Criação com arquivos: usa `FormData` e endpoint especial
  - Criação sem arquivos: JSON padrão
  - Feedback de sucesso/erro
  - Retorno automático após criação bem-sucedida

**Estados:**
- `name`, `examDate`, `notes`, `tags`: Campos do formulário
- `files`: Lista de arquivos selecionados
- `isLoading`: Estado de carregamento durante criação

**Ações:**
- `handleSelectImages()`: Seleção de imagens da galeria
- `handleSelectDocuments()`: Seleção de documentos
- `removeFile()`: Remoção de arquivo da lista
- `handleSubmit()`: Criação do exame
- `formatDateInput()`: Formatação automática de data
- `convertDateToBackendFormat()`: Conversão de formato de data

---

## 7. `exam-detail/[id].tsx` - Detalhes do Exame
**Localização:** `app/exam-detail/[id].tsx`

**Função:** Exibe detalhes completos de um exame médico específico.

**Funcionalidades:**
- **Header:**
  - Botão voltar
  - Botão de editar (funcionalidade planejada)
  - Botão de excluir com confirmação

- **Informações do Exame:**
  - Nome do exame
  - Data do exame formatada
  - Data de criação
  - Tags (se houver)
  - Ícone visual identificador

- **Seção de Observações:**
  - Exibe notas/observações do exame (se houver)

- **Seção de Arquivos:**
  - Lista todos os arquivos anexados
  - Para cada arquivo:
    - Ícone por tipo (imagem, PDF, vídeo)
    - Nome original
    - Tipo de mídia
    - Tamanho formatado
    - Funcionalidade de abertura (via URL)

- **Ações:**
  - Exclusão do exame
  - Edição (planejada - exibe alerta)
  - Abertura de arquivos anexados
  - Navegação de volta

- **Estados de Erro:**
  - Tela de erro quando exame não é encontrado
  - Indicador de carregamento

**Estados:**
- `exam`: Dados completos do exame
- `isLoading`: Estado de carregamento

**Ações:**
- `loadExamDetail()`: Carrega detalhes do exame por ID
- `handleDelete()`: Exclui exame com confirmação
- `handleEdit()`: Funcionalidade planejada
- `handleOpenFile()`: Abre arquivo anexado

---

## 8. `profile.tsx` - Perfil do Usuário
**Localização:** `app/profile.tsx`

**Função:** Gerencia informações do perfil do usuário e configurações da conta.

**Funcionalidades:**
- **Card de Perfil:**
  - Avatar com iniciais do nome
  - Nome completo do usuário
  - E-mail do usuário
  - Data de cadastro formatada ("Membro desde...")

- **Menu de Opções:**
  - **Editar Perfil:**
    - Modal com formulário de edição
    - Campos: Nome e E-mail
    - Funcionalidade planejada (exibe alerta)
  
  - **Alterar Senha:**
    - Funcionalidade planejada (exibe alerta)
  
  - **Compartilhar Exames:**
    - Funcionalidade planejada (exibe alerta)
  
  - **Ajuda e Suporte:**
    - Funcionalidade planejada (exibe alerta)
  
  - **Sobre o App:**
    - Exibe informações da versão do aplicativo

- **Botão de Logout:**
  - Confirmação antes de sair
  - Realiza logout completo da aplicação

- **Modal de Edição:**
  - Layout completo com header próprio
  - Botões de cancelar e salvar
  - Validação de campos
  - Estado de carregamento durante salvamento

**Estados:**
- `showEditModal`: Controla visibilidade do modal de edição
- `editName`, `editEmail`: Campos do formulário de edição
- `isEditing`: Estado de carregamento durante salvamento

**Ações:**
- `handleEditProfile()`: Abre modal de edição
- `handleSaveProfile()`: Salva alterações (planejado)
- `handleChangePassword()`: Planejado
- `handleLogout()`: Logout com confirmação

---

## 9. `reminders.tsx` - Lembretes
**Localização:** `app/reminders.tsx`

**Função:** Gerencia e exibe lembretes relacionados aos exames médicos.

**Funcionalidades:**
- **Header:**
  - Botão voltar
  - Título "Lembretes"
  - Botão de filtro (toggle visual)

- **Filtros:**
  - **Todos:** Lista todos os lembretes
  - **Próximos:** Lista apenas lembretes dos próximos 30 dias
  - Tabs visuais para alternar entre filtros

- **Lista de Lembretes:**
  - Cards com informações:
    - Ícone colorido (vermelho para vencidos, primário para futuros)
    - Título do lembrete
    - Data e hora completas formatadas
    - Tempo relativo (Hoje, Amanhã, Em X dias, Há X dias)
    - Botão de exclusão
  - Diferenciação visual para lembretes vencidos

- **Gerenciamento:**
  - Exclusão com confirmação
  - Pull-to-refresh
  - Botão para criar novo lembrete (funcionalidade planejada)

- **Estado Vazio:**
  - Mensagem diferenciada baseada no filtro ativo
  - Botão para criar primeiro lembrete

**Estados:**
- `reminders`: Lista de lembretes
- `isLoading`: Estado de carregamento
- `isRefreshing`: Estado de refresh
- `showUpcomingOnly`: Controla filtro ativo

**Ações:**
- `loadReminders()`: Carrega lembretes baseado no filtro
- `handleDeleteReminder()`: Exclui lembrete (funcionalidade planejada)
- `formatDate()`: Formata data relativa
- `formatFullDate()`: Formata data completa
- `isOverdue()`: Verifica se lembrete está vencido

---

## Fluxo de Navegação Geral

```
index.tsx (Roteamento)
  ├── login.tsx (Se não autenticado)
  └── home.tsx (Se autenticado)
       ├── exams.tsx
       │    ├── add-exam.tsx
       │    └── exam-detail/[id].tsx
       ├── reminders.tsx
       └── profile.tsx
```

---

## Dependências Comuns

- **Contextos:**
  - `AuthContext`: Gerenciamento de autenticação em todas as telas autenticadas

- **Serviços:**
  - `apiClient`: Comunicação com API REST em todas as telas

- **Bibliotecas:**
  - `expo-router`: Navegação
  - `@expo/vector-icons`: Ícones
  - `react-native`: Componentes base
  - `expo-image-picker`: Seleção de imagens
  - `expo-document-picker`: Seleção de documentos

---

## Tratamento de Erros

Todas as telas implementam:
- Mensagens de erro amigáveis ao usuário
- Tratamento de erros de rede
- Validação de formulários
- Estados de loading
- Feedback visual de operações

---

## Observações Técnicas

- Todas as telas utilizam TypeScript para tipagem
- Formatação de datas em português brasileiro (pt-BR)
- Layout responsivo com `KeyboardAvoidingView` onde necessário
- Pull-to-refresh implementado nas telas de listagem
- Recarregamento automático ao receber foco (`useFocusEffect`)
- Estados vazios informativos em todas as listas
- Confirmações para ações destrutivas (exclusões)

