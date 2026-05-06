// ============================================
// CONFIGURAÇÃO DAS APIs DE MERCADO
// ============================================
// 
// IMPORTANTE: Em produção, NUNCA exponha chaves de API no frontend.
// Use um backend para fazer proxy das requisições.
//
// Este arquivo contém apenas a estrutura de configuração.
// As chaves são armazenadas no localStorage do navegador.
// ============================================

const API_CONFIG = {
    // URLs das APIs
    endpoints: {
        oanda: {
            practice: 'https://api-fxpractice.oanda.com/v3',
            live: 'https://api-fxtrade.oanda.com/v3',
            docs: 'https://developer.oanda.com/rest-live-v20/introduction/'
        },
        alphaVantage: {
            base: 'https://www.alphavantage.co/query',
            docs: 'https://www.alphavantage.co/documentation/'
        },
        twelveData: {
            base: 'https://api.twelvedata.com',
            docs: 'https://twelvedata.com/docs'
        }
    },
    
    // Limites de requisições (para respeitar rate limits)
    rateLimits: {
        oanda: {
            requestsPerSecond: 10,
            minInterval: 100 // ms
        },
        alphaVantage: {
            requestsPerMinute: 5, // Plano gratuito
            minInterval: 12000 // ms
        },
        twelveData: {
            requestsPerMinute: 8, // Plano gratuito
            minInterval: 7500 // ms
        }
    },
    
    // Pares de moedas com mapeamento entre APIs
    pairMapping: {
        oanda: {
            'EUR_USD': 'EUR_USD',
            'GBP_USD': 'GBP_USD',
            'USD_JPY': 'USD_JPY',
            'AUD_USD': 'AUD_USD',
            'USD_CAD': 'USD_CAD',
            'EUR_GBP': 'EUR_GBP'
        },
        alphaVantage: {
            'EUR_USD': 'EUR_USD',
            'GBP_USD': 'GBP_USD',
            'USD_JPY': 'USD_JPY',
            'AUD_USD': 'AUD_USD',
            'USD_CAD': 'USD_CAD',
            'EUR_GBP': 'EUR_GBP'
        },
        twelveData: {
            'EUR_USD': 'EUR/USD',
            'GBP_USD': 'GBP/USD',
            'USD_JPY': 'USD/JPY',
            'AUD_USD': 'AUD/USD',
            'USD_CAD': 'USD/CAD',
            'EUR_GBP': 'EUR/GBP'
        }
    }
};

// Verificar se há chaves salvas no localStorage
function getStoredApiKeys() {
    try {
        const stored = localStorage.getItem('forex_api_keys');
        return stored ? JSON.parse(stored) : {};
    } catch (error) {
        console.error('Erro ao carregar chaves de API:', error);
        return {};
    }
}

// Validar formato de chave de API
function validateApiKey(provider, key) {
    if (!key || key.length < 10) return false;
    
    switch (provider) {
        case 'oanda':
            return /^[a-zA-Z0-9\-]{20,}$/.test(key);
        case 'alphaVantage':
            return /^[A-Z0-9]{16}$/.test(key);
        case 'twelveData':
            return /^[a-zA-Z0-9]{32,}$/.test(key);
        default:
            return false;
    }
}

console.log('✅ Configuração de APIs carregada.');
console.log('📚 Documentação das APIs:');
console.log('  - OANDA:', API_CONFIG.endpoints.oanda.docs);
console.log('  - Alpha Vantage:', API_CONFIG.endpoints.alphaVantage.docs);
console.log('  - Twelve Data:', API_CONFIG.endpoints.twelveData.docs);
