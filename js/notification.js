// ============================================
// SISTEMA DE NOTIFICAÇÕES
// ============================================

class NotificationSystem {
    constructor() {
        this.container = document.getElementById('notificationContainer');
        this.queue = [];
        this.activeNotifications = [];
        this.maxVisible = 5;
        this.sounds = {
            signal: new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAf39/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/g'),
            alert: new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAf39/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/g')
        };
        this.enabled = true;
        this.soundEnabled = false;
    }

    // Mostrar notificação
    show(message, type = 'info', duration = 5000) {
        if (!this.enabled) return;

        const notification = {
            id: Date.now() + Math.random(),
            message,
            type,
            duration,
            timestamp: new Date()
        };

        // Adicionar à fila
        if (this.activeNotifications.length >= this.maxVisible) {
            this.queue.push(notification);
            return;
        }

        this.displayNotification(notification);
    }

    // Exibir notificação na tela
    displayNotification(notification) {
        // Criar elemento
        const element = document.createElement('div');
        element.className = `notification notification-${notification.type}`;
        element.id = `notif-${notification.id}`;
        
        // Ícone baseado no tipo
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle',
            signal: 'fa-signal',
            trade: 'fa-exchange-alt'
        };
        
        const icon = icons[notification.type] || 'fa-bell';
        
        element.innerHTML = `
            <div class="notification-content">
                <i class="fas ${icon}"></i>
                <div class="notification-message">
                    <p>${notification.message}</p>
                    <small>${this.formatTime(notification.timestamp)}</small>
                </div>
                <button class="notification-close" onclick="notificationSystem.dismiss('${notification.id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="notification-progress">
                <div class="progress-bar" style="animation: shrink ${notification.duration}ms linear;"></div>
            </div>
        `;

        // Adicionar ao container
        this.container.appendChild(element);
        this.activeNotifications.push(notification);

        // Tocar som se habilitado
        if (this.soundEnabled && notification.type === 'signal') {
            this.playSound('signal');
        }

        // Animação de entrada
        setTimeout(() => element.classList.add('show'), 10);

        // Auto-dismiss
        if (notification.duration > 0) {
            setTimeout(() => this.dismiss(notification.id), notification.duration);
        }
    }

    // Descartar notificação
    dismiss(id) {
        const element = document.getElementById(`notif-${id}`);
        if (!element) return;

        // Animação de saída
        element.classList.add('hide');
        
        setTimeout(() => {
            element.remove();
            this.activeNotifications = this.activeNotifications.filter(n => n.id != id);
            
            // Processar próxima da fila
            if (this.queue.length > 0) {
                const next = this.queue.shift();
                this.displayNotification(next);
            }
        }, 300);
    }

    // Notificações específicas
    signalAlert(pair, signal, strength) {
        const emoji = signal === 'COMPRA' ? '🟢' : signal === 'VENDA' ? '🔴' : '🟡';
        this.show(
            `${emoji} Sinal ${signal} detectado em ${pair} | Força: ${strength}%`,
            'signal',
            8000
        );
        
        // Notificação do navegador
        if (Notification.permission === 'granted') {
            new Notification('Sinal Forex Detectado', {
                body: `${signal} em ${pair} com ${strength}% de força`,
                icon: '/favicon.ico'
            });
        }
    }

    tradeNotification(trade) {
        const profit = trade.profitLoss > 0;
        this.show(
            `${profit ? '✅' : '❌'} Trade ${profit ? 'lucrativo' : 'perdedor'}: ${trade.pair} | ${trade.profitLoss.toFixed(2)}`,
            profit ? 'success' : 'error',
            6000
        );
    }

    riskWarning(message) {
        this.show(
            `⚠️ Alerta de Risco: ${message}`,
            'warning',
            10000
        );
    }

    // Tocar som
    playSound(type) {
        const sound = this.sounds[type];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(() => {}); // Ignorar erro se áudio não permitido
        }
    }

    // Formatar timestamp
    formatTime(date) {
        return date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    // Solicitar permissão para notificações do navegador
    async requestPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return false;
    }

    // Ativar/desativar
    toggle(enabled) {
        this.enabled = enabled;
    }

    // Ativar/desativar som
    toggleSound(enabled) {
        this.soundEnabled = enabled;
    }

    // Limpar todas
    clearAll() {
        this.activeNotifications.forEach(n => this.dismiss(n.id));
        this.queue = [];
    }
}

// Instância global
const notificationSystem = new NotificationSystem();
