
/**
 * Notification Service - ESPECIALISTA-IA Master Evolution
 * Gerencia permissões e disparos de notificações nativas do navegador com suporte a feedback tátil.
 */

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (typeof Notification === 'undefined') return 'default';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error("Erro ao solicitar permissão de notificação:", error);
    return 'denied';
  }
};

export const getNotificationPermission = (): NotificationPermission => {
  if (typeof Notification === 'undefined') return 'denied';
  return Notification.permission;
};

export interface PushOptions {
  body: string;
  icon?: string;
  tag?: string;
  silent?: boolean;
  priority?: 'high' | 'normal' | 'low';
  data?: any;
}

const ICONS = {
  error: "https://cdn-icons-png.flaticon.com/512/564/564619.png",
  success: "https://cdn-icons-png.flaticon.com/512/190/190411.png",
  info: "https://cdn-icons-png.flaticon.com/512/4712/4712035.png",
  warning: "https://cdn-icons-png.flaticon.com/512/595/595067.png"
};

export const sendPush = (title: string, options: PushOptions) => {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

  const notification = new Notification(title, {
    body: options.body,
    icon: options.icon || ICONS.info,
    tag: options.tag,
    silent: options.silent ?? (options.priority !== 'high'),
    badge: ICONS.info,
  });

  // Feedback tátil se disponível
  if ('vibrate' in navigator && options.priority === 'high') {
    navigator.vibrate([200, 100, 200]);
  }

  notification.onclick = () => {
    window.focus();
    notification.close();
  };
};

/**
 * Disparar alerta crítico (Erro de sistema, Segurança, Desconexão API)
 */
export const notifyCriticalError = (module: string, message: string) => {
  sendPush(`🚨 ALERTA CRÍTICO: ${module}`, {
    body: message,
    priority: 'high',
    tag: 'system-error',
    icon: ICONS.error
  });
};

/**
 * Disparar alerta de aviso (Problemas de sincronização leves, avisos de cota)
 */
export const notifyWarning = (module: string, message: string) => {
  sendPush(`⚠️ AVISO DO SISTEMA: ${module}`, {
    body: message,
    priority: 'normal',
    tag: 'system-warning',
    icon: ICONS.warning
  });
};

/**
 * Disparar alerta de conclusão (Broadcast, Sincronização, Backup)
 */
export const notifyTaskCompleted = (taskName: string, details: string) => {
  sendPush(`✅ SUCESSO NA OPERAÇÃO`, {
    body: `${taskName}: ${details}`,
    priority: 'normal',
    tag: 'task-success',
    icon: ICONS.success
  });
};
