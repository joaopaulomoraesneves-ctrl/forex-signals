// ============================================
// SISTEMA DE CACHE AVANÇADO
// ============================================

class CacheManager {
    constructor() {
        this.memoryCache = new Map();
        this.maxSize = 50 * 1024 * 1024; // 50MB
        this.currentSize = 0;
        this.hits = 0;
        this.misses = 0;
        this.ttl = 5 * 60 * 1000; // 5 minutos default
    }

    // Armazenar em cache
    set(key, value, ttl = this.ttl) {
        // Verificar espaço
        const size = this.calculateSize(value);
        this.cleanup(size);

        const entry = {
            value,
            timestamp: Date.now(),
            ttl,
            size,
            accessCount: 0,
            lastAccess: Date.now()
        };

        this.memoryCache.set(key, entry);
        this.currentSize += size;
    }

    // Recuperar do cache
    get(key) {
        const entry = this.memoryCache.get(key);
        
        if (!entry) {
            this.misses++;
            return null;
        }

        // Verificar expiração
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.memoryCache.delete(key);
            this.currentSize -= entry.size;
            this.misses++;
            return null;
        }

        // Atualizar métricas
        entry.accessCount++;
        entry.lastAccess = Date.now();
        this.hits++;

        return entry.value;
    }

    // Verificar se existe
    has(key) {
        const entry = this.memoryCache.get(key);
        if (!entry) return false;
        
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.memoryCache.delete(key);
            this.currentSize -= entry.size;
            return false;
        }
        
        return true;
    }

    // Remover item
    delete(key) {
        const entry = this.memoryCache.get(key);
        if (entry) {
            this.currentSize -= entry.size;
            this.memoryCache.delete(key);
            return true;
        }
        return false;
    }

    // Limpar cache
    clear() {
        this.memoryCache.clear();
        this.currentSize = 0;
        this.hits = 0;
        this.misses = 0;
    }

    // Limpeza inteligente
    cleanup(requiredSize) {
        if (this.currentSize + requiredSize <= this.maxSize) return;

        // Ordenar por último acesso (LRU)
        const entries = Array.from(this.memoryCache.entries())
            .sort((a, b) => a[1].lastAccess - b[1].lastAccess);

        // Remover mais antigos até ter espaço
        while (this.currentSize + requiredSize > this.maxSize && entries.length > 0) {
            const [key, entry] = entries.shift();
            this.memoryCache.delete(key);
            this.currentSize -= entry.size;
        }
    }

    // Calcular tamanho aproximado
    calculateSize(value) {
        try {
            const str = JSON.stringify(value);
            return str.length * 2; // Aproximação em bytes (UTF-16)
        } catch {
            return 1024; // 1KB para não serializáveis
        }
    }

    // Cache com prefixo para invalidar grupos
    invalidateByPrefix(prefix) {
        for (const key of this.memoryCache.keys()) {
            if (key.startsWith(prefix)) {
                this.delete(key);
            }
        }
    }

    // Obter estatísticas
    getStats() {
        return {
            size: this.currentSize,
            maxSize: this.maxSize,
            entries: this.memoryCache.size,
            hits: this.hits,
            misses: this.misses,
            hitRate: this.hits + this.misses > 0 
                ? (this.hits / (this.hits + this.misses) * 100).toFixed(2) 
                : 0,
            avgAccessCount: this.memoryCache.size > 0
                ? Array.from(this.memoryCache.values())
                    .reduce((sum, e) => sum + e.accessCount, 0) / this.memoryCache.size
                : 0
        };
    }

    // Pré-aquecer cache com dados frequentes
    async prewarm(dataGenerator) {
        const startTime = performance.now();
        let count = 0;

        for (const { key, generator } of dataGenerator) {
            if (!this.has(key)) {
                const value = await generator();
                this.set(key, value);
                count++;
            }
        }

        console.log(`🔥 Cache pré-aquecido: ${count} itens em ${(performance.now() - startTime).toFixed(0)}ms`);
        return count;
    }

    // Persistir cache (opcional)
    saveToStorage(storageKey = 'app_cache') {
        try {
            const serializable = {};
            for (const [key, entry] of this.memoryCache.entries()) {
                if (entry.ttl === this.ttl) { // Apenas cache padrão
                    serializable[key] = entry;
                }
            }
            localStorage.setItem(storageKey, JSON.stringify(serializable));
            return true;
        } catch (error) {
            console.warn('Erro ao persistir cache:', error);
            return false;
        }
    }

    // Restaurar cache
    loadFromStorage(storageKey = 'app_cache') {
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                for (const [key, entry] of Object.entries(data)) {
                    this.memoryCache.set(key, entry);
                    this.currentSize += entry.size;
                }
                return true;
            }
        } catch (error) {
            console.warn('Erro ao carregar cache:', error);
        }
        return false;
    }
}

// Instância global
const cacheManager = new CacheManager();
