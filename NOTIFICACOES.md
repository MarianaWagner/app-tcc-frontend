# Sistema de Notificações Push

## 📱 Visão Geral

O sistema de notificações foi implementado para enviar lembretes automáticos aos usuários sobre seus exames médicos. As notificações são agendadas localmente no dispositivo usando `expo-notifications`.

## 🚀 Funcionalidades Implementadas

### ✅ Notificações Locais
- **Notificação de Lembrete**: Enviada no horário configurado do lembrete
- **Notificação de Aviso de Jejum**: Enviada no horário calculado para início do jejum
- **Cancelamento Automático**: Notificações são canceladas quando um lembrete é editado ou deletado

### ✅ Integrações
- ✅ Criação de lembretes agenda notificações automaticamente
- ✅ Edição de lembretes atualiza/cancela notificações antigas
- ✅ Exclusão de lembretes cancela notificações associadas
- ✅ Permissões solicitadas automaticamente na inicialização do app

## 📦 Instalação

As dependências já foram adicionadas ao `package.json`. Para instalar:

```bash
cd app-tcc-frontend
npm install
```

## 🔧 Configuração

### 1. Instalar Dependências
```bash
npm install
```

### 2. Rebuild do App
Após adicionar o plugin `expo-notifications` no `app.json`, você precisa fazer rebuild:

```bash
# Para Android
npx expo prebuild --clean
npx expo run:android

# Para iOS
npx expo prebuild --clean
npx expo run:ios
```

### 3. Permissões

O sistema solicita permissões automaticamente quando o app é aberto pela primeira vez. O usuário precisa conceder permissões para receber notificações.

## 📝 Como Funciona

### Agendamento de Notificações

Quando um lembrete é criado ou editado:

1. **Notificação Principal**: Agendada para o horário do `reminderDate`
   - Título: "🔔 Lembrete"
   - Corpo: Título do lembrete
   - Subtítulo: Observações (se houver)

2. **Notificação de Jejum** (se aplicável): Agendada para o `fastingAlertTime`
   - Título: "💧 Aviso de Jejum"
   - Corpo: Inclui título do lembrete e duração do jejum

### Cancelamento de Notificações

- **Ao Editar**: Todas as notificações antigas são canceladas e novas são agendadas
- **Ao Deletar**: Todas as notificações do lembrete são canceladas

## 🎯 Uso da API

### Serviço de Notificações

O serviço está em `services/notifications.ts`:

```typescript
import { notificationService } from '../services/notifications';

// Agendar notificação de lembrete
await notificationService.scheduleReminderNotification(
  reminderId,
  title,
  reminderDate,
  notes
);

// Agendar notificação de jejum
await notificationService.scheduleFastingAlertNotification(
  reminderId,
  fastingAlertTime,
  reminderTitle,
  fastingDuration
);

// Cancelar todas as notificações de um lembrete
await notificationService.cancelReminderNotifications(reminderId);
```

## 🔔 Comportamento

### Quando o App Está Aberto
- Notificações são exibidas como alertas no topo da tela
- O som é reproduzido
- O badge é atualizado

### Quando o App Está Fechado
- Notificações aparecem na barra de notificações do sistema
- O som é reproduzido
- Ao tocar na notificação, o app pode ser aberto (navegação futura)

## 📱 Testando

### Teste Básico
1. Crie um lembrete para alguns minutos no futuro
2. Feche o app (ou deixe em background)
3. Aguarde o horário configurado
4. A notificação deve aparecer

### Verificar Notificações Agendadas
```typescript
const notifications = await notificationService.getAllScheduledNotifications();
console.log('Notificações agendadas:', notifications);
```

## 🚧 Melhorias Futuras

### Push Notifications Remotas (Opcional)
Para implementar push notifications remotas (que funcionam mesmo sem o app instalado):

1. Configurar Expo Project ID
2. Integrar com Expo Push Notification Service
3. Configurar backend para enviar notificações via API
4. Salvar tokens de push no backend

### Navegação a partir de Notificações
- Implementar navegação quando o usuário toca na notificação
- Abrir a tela específica do lembrete

### Notificações Recorrentes
- Adicionar suporte para lembretes recorrentes (diário, semanal, etc.)

## ⚠️ Limitações Atuais

1. **Notificações Locais**: Funcionam apenas no dispositivo onde o lembrete foi criado
2. **Reinstalação**: Se o app for reinstalado, as notificações agendadas são perdidas
3. **Sincronização**: Não há sincronização automática de notificações entre dispositivos

## 🔍 Troubleshooting

### Notificações não aparecem
1. Verifique se as permissões foram concedidas
2. Verifique se a data/hora está no futuro
3. Verifique os logs do console para erros

### Notificações não são canceladas
1. Verifique se o `reminderId` está correto
2. Verifique os logs para erros de cancelamento

## 📚 Referências

- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [React Native Notifications](https://github.com/zo0r/react-native-push-notification)

