// ============================================
// SISTEMA DE LOGGING AVANÇADO
// ============================================

class Logger {
    constructor() {
        this.logs = [];
        this.maxLogs = 1000;
        this.levels = {
            DEBUG: { priority: 0, color: '#666', icon: '🔍' },
            INFO: { priority: 1, color: '#2196F3', icon: 'ℹ️' },
            WARN: { priority: 2, color: '#ffa502', icon: '⚠️' },
            ERROR: { priority: 3, color: '#ff4757', icon: '❌' },
            CRITICAL: { priority: 4, color: '#ff0000', icon: '🚨' }
        };
        this.minLevel = 'DEBUG';
        this.listeners = [];
    }

    // Log debug
    debug(message, context = {}) {
        this.log('DEBUG', message, context);
    }

    // Log info
    info(message, context = {}) {
        this.log('INFO', message, context);
    }

    // Log warning
    warn(message, context = {}) {
        this.log('WARN', message, context);
    }

    // Log error
    error(message, context = {}) {
        this.log('ERROR', message, context);
    }

    // Log critical
    critical(message, context = {}) {
        this.log('CRITICAL', message, context);
    }

    // Método principal de log
    log(level, message, context = {}) {
        // Verificar nível mínimo
        if (this.levels[level].priority < this.levels[this.minLevel].priority) {
            return;
        }

        const entry = {
            id: Date.now() + Math.random(),
            timestamp: new Date(),
            level,
            message,
            context,
            stack: level === 'ERROR' || level === 'CRITICAL' ? new Error().stack : null
        };

        // Adicionar ao array
        this.logs.push(entry);
        
        // Limitar tamanho
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // Console output
        const color = this.levels[level].color;
        const icon = this.levels[level].icon;
        
        const consoleMessage = `${icon} [${level}] ${this.formatTimestamp(entry.timestamp)} - ${message}`;
        
        switch (level) {
            case 'DEBUG':
                console.debug(consoleMessage, context);
                break;
            case 'INFO':
                console.info(consoleMessage, context);
                break;
            case 'WARN':
                console.warn(consoleMessage, context);
                break;
            case 'ERROR':
            case 'CRITICAL':
                console.error(consoleMessage, context, entry.stack);
                break;
        }

        // Notificar listeners
        this.notifyListeners(entry);

        // Persistir se crítico
        if (level === 'CRITICAL') {
            this.persistLog(entry);
        }

        return entry;
    }

    // Adicionar listener
    addListener(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    // Notificar listeners
    notifyListeners(entry) {
        this.listeners.forEach(callback => {
            try {
                callback(entry);
            } catch (error) {
                console.error('Erro no listener de log:', error);
            }
        });
    }

    // Filtrar logs
    filter(options = {}) {
        let filtered = [...this.logs];

        if (options.level) {
            const minPriority = this.levels[options.level].priority;
            filtered = filtered.filter(log => 
                this.levels[log.level].priority >= minPriority
            );
        }

        if (options.startTime) {
            filtered = filtered.filter(log => 
                log.timestamp >= options.startTime
            );
        }

        if (options.endTime) {
            filtered = filtered.filter(log => 
                log.timestamp <= options.endTime
            );
        }

        if (options.search) {
            const searchLower = options.search.toLowerCase();
            filtered = filtered.filter(log => 
                log.message.toLowerCase().includes(searchLower) ||
                JSON.stringify(log.context).toLowerCase().includes(searchLower)
            );
        }

        if (options.limit) {
            filtered = filtered.slice(-options.limit);
        }

        return filtered;
    }

    // Buscar logs
    search(query, options = {}) {
        return this.filter({ ...options, search: query });
    }

    // Obter estatísticas
    getStats() {
        const stats = {
            total: this.logs.length,
            byLevel: {},
            errors: 0,
            warnings: 0,
            recentActivity: []
        };

        this.logs.forEach(log => {
            stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
            if (log.level === 'ERROR' || log.level === 'CRITICAL') stats.errors++;
            if (log.level === 'WARN') stats.warnings++;
        });

        // Atividade recente (últimos 10)
        stats.recentActivity = this.logs.slice(-10).reverse();

        return stats;
    }

    // Formatos de exportação
    exportLogs(format = 'json', filterOptions = {}) {
        const filtered = this.filter(filterOptions);

        switch (format) {
            case 'json':
                return JSON.stringify(filtered, null, 2);
            case 'csv':
                return this.logsToCSV(filtered);
            case 'text':
                return this.logsToText(filtered);
            default:
                throw new Error(`Formato ${format} não suportado`);
        }
    }

    // Converter para CSV
    logsToCSV(logs) {
        const headers = ['Timestamp', 'Level', 'Message', 'Context'];
        const rows = logs.map(log => [
            log.timestamp.toISOString(),
            log.level,
            `"${log.message.replace(/"/g, '""')}"`,
            `"${JSON.stringify(log.context).replace(/"/g, '""')}"`
        ]);
        
        return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }

    // Converter para texto
    logsToText(logs) {
        return logs.map(log => {
            return `[${this.formatTimestamp(log.timestamp)}] [${log.level}] ${log.message} ${JSON.stringify(log.context)}`;
        }).join('\n');
    }

    // Persistir log crítico
    persistLog(entry) {
        try {
            const criticalLogs = JSON.parse(localStorage.getItem('critical_logs') || '[]');
            criticalLogs.push(entry);
            
            // Manter apenas últimos 50
            if (criticalLogs.length > 50) {
                criticalLogs.splice(0, criticalLogs.length - 50);
            }
            
            localStorage.setItem('critical_logs', JSON.stringify(criticalLogs));
        } catch (error) {
            console.error('Erro ao persistir log:', error);
        }
    }

    // Recuperar logs persistidos
    getPersistedLogs() {
        try {
            return JSON.parse(localStorage.getItem('critical_logs') || '[]');
        } catch {
            return [];
        }
    }

    // Limpar logs
    clear() {
        this.logs = [];
        localStorage.removeItem('critical_logs');
    }

    // Formatar timestamp
    formatTimestamp(date) {
        return date.toLocaleString('pt-BR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        });
    }

    // Performance monitoring
    startTimer(label) {
        const start = performance.now();
        return {
            end: () => {
                const duration = performance.now() - start;
                this.debug(`Timer [${label}]: ${duration.toFixed(2)}ms`, { duration, label });
                return duration;
            }
        };
    }

    // Memory usage
    logMemoryUsage() {
        if (performance.memory) {
            const memory = performance.memory;
            this.debug('Memory Usage', {
                usedJSHeapSize: (memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
                totalJSHeapSize: (memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
                jsHeapSizeLimit: (memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB'
            });
        }
    }
}

// Instância global
const logger = new Logger();
