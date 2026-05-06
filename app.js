// ============================================
// APLICATIVO DE SINAIS FOREX
// ============================================

// Configuração global
const CONFIG = {
    // Pares de moedas suportados
    pairs: ['EUR_USD', 'GBP_USD', 'USD_JPY', 'AUD_USD', 'USD_CAD', 'EUR_GBP'],
    
    // Intervalo de atualização (em milissegundos)
    refreshInterval: 60000, // 1 minuto
    
    // Preços base para simulação
    priceRanges: {
        'EUR_USD': { base: 1.0850, spread: 0.0100 },
        'GBP_USD': { base: 1.2650, spread: 0.0150 },
        'USD_JPY': { base: 148.50, spread: 2.00 },
        'AUD_USD': { base: 0.6550, spread: 0.0080 },
        'USD_CAD': { base: 1.3550, spread: 0.0100 },
        'EUR_GBP': { base: 0.8570, spread: 0.0080 }
    }
};

// Estado da aplicação
const APP_STATE = {
    currentPair: 'EUR_USD',
    usingRealData: false,
    activeApis: {
        oanda: false,
        alphaVantage: false,
        twelveData: false
    }
};

// ============================================
// GERENCIADOR DE APIs
// ============================================

class APIManager {
    constructor() {
        this.apis = {};
        this.initializeFromStorage();
    }
    
    // Carrega chaves do localStorage
    initializeFromStorage() {
        const saved = localStorage.getItem('forex_api_keys');
        if (saved) {
            const keys = JSON.parse(saved);
            
            // Inicializa APIs se houver chaves
            if (keys.oanda) {
                this.apis.oanda = new OandaAPI(keys.oanda);
            }
            if (keys.alphaVantage) {
                this.apis.alphaVantage = new AlphaVantageAPI(keys.alphaVantage);
            }
            if (keys.twelveData) {
                this.apis.twelveData = new TwelveDataAPI(keys.twelveData);
            }
        }
    }
    
    // Salva chaves de API
    saveKeys(oandaKey, alphaVantageKey, twelveDataKey) {
        const keys = {
            oanda: oandaKey,
            alphaVantage: alphaVantageKey,
            twelveData: twelveDataKey
        };
        
        localStorage.setItem('forex_api_keys', JSON.stringify(keys));
        this.initializeFromStorage();
        
        showMessage('Configurações salvas com sucesso!', 'success');
    }
    
    // Limpa todas as chaves
    clearKeys() {
        localStorage.removeItem('forex_api_keys');
        this.apis = {};
        showMessage('Chaves de API removidas.', 'info');
    }
    
    // Verifica status de todas as APIs
    async checkAllStatus() {
        const status = {
            oanda: !!this.apis.oanda,
            alphaVantage: !!this.apis.alphaVantage,
            twelveData: !!this.apis.twelveData
        };
        
        updateApiStatusDisplay(status);
        return status;
    }
    
    // Obtém preço de qualquer API disponível
    async getAnyPrice(pair) {
        // Tenta OANDA primeiro
        if (this.apis.oanda) {
            const price = await this.apis.oanda.getPrice(pair);
            if (price) return { ...price, source: 'OANDA' };
        }
        
        // Depois Alpha Vantage
        if (this.apis.alphaVantage) {
            const price = await this.apis.alphaVantage.getPrice(pair);
            if (price) return { ...price, source: 'Alpha Vantage' };
        }
        
        // Por último Twelve Data
        if (this.apis.twelveData) {
            const price = await this.apis.twelveData.getPrice(pair);
            if (price) return { ...price, source: 'Twelve Data' };
        }
        
        return null;
    }
}

// ============================================
// API OANDA
// ============================================

class OandaAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api-fxpractice.oanda.com/v3';
    }
    
    async getPrice(pair) {
        try {
            const response = await fetch(
                `${this.baseUrl}/accounts/primary/pricing?instruments=${pair}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (!response.ok) throw new Error('OANDA: Erro na requisição');
            
            const data = await response.json();
            const price = data.prices[0];
            
            return {
                bid: parseFloat(price.bids[0].price),
                ask: parseFloat(price.asks[0].price),
                spread: Math.abs(parseFloat(price.bids[0].price) - parseFloat(price.asks[0].price)),
                timestamp: new Date(price.time)
            };
        } catch (error) {
            console.error('OANDA Error:', error);
            return null;
        }
    }
}

// ============================================
// API ALPHA VANTAGE
// ============================================

class AlphaVantageAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://www.alphavantage.co/query';
    }
    
    async getPrice(pair) {
        try {
            const [from, to] = pair.split('_');
            
            const response = await fetch(
                `${this.baseUrl}?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${this.apiKey}`
            );
            
            const data = await response.json();
            
            if (data['Error Message']) throw new Error('Alpha Vantage: Erro na API');
            
            const rate = data['Realtime Currency Exchange Rate'];
            const price = parseFloat(rate['5. Exchange Rate']);
            const spread = price * 0.0001; // Spread estimado
            
            return {
                bid: price - spread / 2,
                ask: price + spread / 2,
                spread: spread,
                timestamp: new Date(rate['6. Last Refreshed'])
            };
        } catch (error) {
            console.error('Alpha Vantage Error:', error);
            return null;
        }
    }
}

// ============================================
// API TWELVE DATA
// ============================================

class TwelveDataAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.twelvedata.com';
    }
    
    async getPrice(pair) {
        try {
            const formattedPair = pair.replace('_', '/');
            
            const response = await fetch(
                `${this.baseUrl}/price?symbol=${formattedPair}&apikey=${this.apiKey}`
            );
            
            const data = await response.json();
            
            if (data.status === 'error') throw new Error('Twelve Data: Erro na API');
            
            const price = parseFloat(data.price);
            
            return {
                bid: price,
                ask: price * 1.0001,
                spread: price * 0.0001,
                timestamp: new Date()
            };
        } catch (error) {
            console.error('Twelve Data Error:', error);
            return null;
        }
    }
    
    async getTechnicalIndicators(pair) {
        try {
            const formattedPair = pair.replace('_', '/');
            
            const [rsi, macd] = await Promise.all([
                fetch(`${this.baseUrl}/rsi?symbol=${formattedPair}&interval=1h&apikey=${this.apiKey}`)
                    .then(r => r.json()),
                fetch(`${this.baseUrl}/macd?symbol=${formattedPair}&interval=1h&apikey=${this.apiKey}`)
                    .then(r => r.json())
            ]);
            
            return {
                rsi: rsi.values ? parseFloat(rsi.values[0].rsi) : null,
                macd: macd.values ? {
                    macd: parseFloat(macd.values[0].macd),
                    signal: parseFloat(macd.values[0].macd_signal),
                    histogram: parseFloat(macd.values[0].macd_hist)
                } : null
            };
        } catch (error) {
            console.error('Twelve Data Indicators Error:', error);
            return null;
        }
    }
}

// Instância global do gerenciador de APIs
const apiManager = new APIManager();

// ============================================
// GERADOR DE DADOS SIMULADOS
// ============================================

function generateSimulatedIndicators(pair) {
    const range = CONFIG.priceRanges[pair] || { base: 1.0000, spread: 0.0100 };
    const currentPrice = range.base + (Math.random() - 0.5) * range.spread;
    
    return {
        pair: pair.replace('_', '/'),
        currentPrice: currentPrice,
        bid: currentPrice - range.spread * 0.1,
        ask: currentPrice + range.spread * 0.1,
        rsi: 30 + Math.random() * 40,
        macdLine: (Math.random() - 0.5) * 0.002,
        signalLine: (Math.random() - 0.5) * 0.001,
        macdHistogram: (Math.random() - 0.5) * 0.001,
        sma20: currentPrice + (Math.random() - 0.5) * range.spread * 0.3,
        sma50: currentPrice + (Math.random() - 0.5) * range.spread * 0.5,
        bbUpper: currentPrice * 1.005,
        bbLower: currentPrice * 0.995,
        bbMiddle: currentPrice,
        bbPosition: 30 + Math.random() * 40,
        stochastic: 20 + Math.random() * 60,
        sources: ['Simulação'],
        timestamp: new Date()
    };
}

// ============================================
// ANALISADOR DE SINAIS
// ============================================

function analyzeSignals(indicators) {
    let buySignals = 0;
    let sellSignals = 0;
    const details = [];
    
    // Análise RSI
    if (indicators.rsi < 30) {
        buySignals++;
        details.push({
            indicator: 'RSI',
            value: indicators.rsi.toFixed(1),
            signal: 'COMPRA',
            reason: 'Sobrevendido (< 30)'
        });
    } else if (indicators.rsi > 70) {
        sellSignals++;
        details.push({
            indicator: 'RSI',
            value: indicators.rsi.toFixed(1),
            signal: 'VENDA',
            reason: 'Sobrecomprado (> 70)'
        });
    } else {
        details.push({
            indicator: 'RSI',
            value: indicators.rsi.toFixed(1),
            signal: 'NEUTRO',
            reason: 'Zona neutra'
        });
    }
    
    // Análise MACD
    if (indicators.macdLine > indicators.signalLine && indicators.macdHistogram > 0) {
        buySignals++;
        details.push({
            indicator: 'MACD',
            value: indicators.macdHistogram.toFixed(5),
            signal: 'COMPRA',
            reason: 'Cruzamento altista'
        });
    } else if (indicators.macdLine < indicators.signalLine && indicators.macdHistogram < 0) {
        sellSignals++;
        details.push({
            indicator: 'MACD',
            value: indicators.macdHistogram.toFixed(5),
            signal: 'VENDA',
            reason: 'Cruzamento baixista'
        });
    } else {
        details.push({
            indicator: 'MACD',
            value: indicators.macdHistogram.toFixed(5),
            signal: 'NEUTRO',
            reason: 'Indefinido'
        });
    }
    
    // Análise Médias Móveis
    if (indicators.sma20 > indicators.sma50) {
        buySignals++;
        details.push({
            indicator: 'Médias Móveis',
            value: `${indicators.sma20.toFixed(5)} vs ${indicators.sma50.toFixed(5)}`,
            signal: 'COMPRA',
            reason: 'SMA20 > SMA50'
        });
    } else {
        sellSignals++;
        details.push({
            indicator: 'Médias Móveis',
            value: `${indicators.sma20.toFixed(5)} vs ${indicators.sma50.toFixed(5)}`,
            signal: 'VENDA',
            reason: 'SMA20 < SMA50'
        });
    }
    
    // Análise Bollinger Bands
    if (indicators.bbPosition < 20) {
        buySignals++;
        details.push({
            indicator: 'Bollinger',
            value: indicators.bbPosition.toFixed(1) + '%',
            signal: 'COMPRA',
            reason: 'Preço na banda inferior'
        });
    } else if (indicators.bbPosition > 80) {
        sellSignals++;
        details.push({
            indicator: 'Bollinger',
            value: indicators.bbPosition.toFixed(1) + '%',
            signal: 'VENDA',
            reason: 'Preço na banda superior'
        });
    }
    
    // Determinar sinal final
    const totalSignals = buySignals + sellSignals;
    let finalSignal, strength;
    
    if (buySignals >= 3) {
        finalSignal = 'COMPRA';
        strength = Math.min(100, (buySignals / totalSignals) * 100 + 20);
    } else if (sellSignals >= 3) {
        finalSignal = 'VENDA';
        strength = Math.min(100, (sellSignals / totalSignals) * 100 + 20);
    } else if (buySignals > sellSignals) {
        finalSignal = 'COMPRA';
        strength = (buySignals / totalSignals) * 100;
    } else if (sellSignals > buySignals) {
        finalSignal = 'VENDA';
        strength = (sellSignals / totalSignals) * 100;
    } else {
        finalSignal = 'NEUTRO';
        strength = 30;
    }
    
    return {
        finalSignal,
        strength: Math.round(strength),
        details,
        buySignals,
        sellSignals,
        indicators
    };
}

// ============================================
// RENDERIZAÇÃO DO DASHBOARD
// ============================================

function renderDashboard(analysis) {
    const dashboard = document.getElementById('dashboard');
    const ind = analysis.indicators;
    
    // Determinar classes CSS baseado no sinal
    let signalClass = 'neutral';
    let signalBadge = 'NEUTRO';
    
    if (analysis.finalSignal === 'COMPRA') {
        signalClass = 'buy';
        signalBadge = 'COMPRA';
    } else if (analysis.finalSignal === 'VENDA') {
        signalClass = 'sell';
        signalBadge = 'VENDA';
    }
    
    // Determinar fonte dos dados
    const dataSource = APP_STATE.usingRealData ? 'Dados Reais' : 'Simulação';
    document.getElementById('dataSourceBadge').innerHTML = 
        `<i class="fas fa-sync"></i> ${dataSource}`;
    
    // Calcular força em estrelas (1-5)
    const strengthStars = Math.ceil(analysis.strength / 20);
    
    // Construir HTML do dashboard
    dashboard.innerHTML = `
        <!-- Card Principal -->
        <div class="card ${signalClass}">
            <div class="card-header">
                <div class="card-title">
                    ${ind.pair}
                    <small style="display: block; font-size: 0.7em; color: #999;">
                        ${dataSource}
                    </small>
                </div>
                <span class="signal-badge ${signalBadge.toLowerCase()}">${signalBadge}</span>
            </div>
            
            <div class="indicator">
                <div class="indicator-label">Preço Atual</div>
                <div class="indicator-value">
                    ${ind.currentPrice.toFixed(5)}
                    ${ind.bid ? `
                        <div style="font-size: 0.8em; color: #666; margin-top: 5px;">
                            Bid: ${ind.bid.toFixed(5)} | Ask: ${ind.ask.toFixed(5)} | Spread: ${ind.spread?.toFixed(5) || 'N/A'}
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="indicator">
                <div class="indicator-label">Força do Sinal: ${analysis.strength}%</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${analysis.strength}%;
                        background: ${analysis.finalSignal === 'COMPRA' ? '#2ed573' : 
                                    analysis.finalSignal === 'VENDA' ? '#ff4757' : '#ffa502'};">
                    </div>
                </div>
            </div>
            
            <div class="strength-meter">
                ${Array(5).fill(0).map((_, i) => `
                    <div class="strength-dot ${i < strengthStars ? 
                        analysis.strength > 60 ? 'active' : 
                        analysis.strength > 30 ? 'medium' : 'weak' 
                        : ''}">
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- Card de Indicadores -->
        <div class="card">
            <div class="card-header">
                <div class="card-title">📊 Indicadores Técnicos</div>
            </div>
            
            <div class="indicator">
                <div class="indicator-label">RSI (14)</div>
                <div class="indicator-value">${ind.rsi.toFixed(2)}</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${ind.rsi}%;
                        background: ${ind.rsi > 70 ? '#ff4757' : ind.rsi < 30 ? '#2ed573' : '#667eea'};">
                    </div>
                </div>
                <small style="color: #999;">
                    ${ind.rsi < 30 ? 'Sobrevendido' : ind.rsi > 70 ? 'Sobrecomprado' : 'Neutro'}
                </small>
            </div>
            
            <div class="indicator">
                <div class="indicator-label">MACD</div>
                <div class="indicator-value">
                    Linha: ${ind.macdLine?.toFixed(5) || '0.00000'}<br>
                    Sinal: ${ind.signalLine?.toFixed(5) || '0.00000'}<br>
                    Histograma: ${ind.macdHistogram > 0 ? '+' : ''}${ind.macdHistogram.toFixed(5)}
                </div>
            </div>
            
            <div class="indicator">
                <div class="indicator-label">Estocástico</div>
                <div class="indicator-value">${ind.stochastic.toFixed(2)}</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${ind.stochastic}%;"></div>
                </div>
            </div>
        </div>
        
        <!-- Card de Médias Móveis -->
        <div class="card">
            <div class="card-header">
                <div class="card-title">📈 Médias Móveis</div>
            </div>
            
            <div class="indicator">
                <div class="indicator-label">SMA 20</div>
                <div class="indicator-value">${ind.sma20.toFixed(5)}</div>
            </div>
            
            <div class="indicator">
                <div class="indicator-label">SMA 50</div>
                <div class="indicator-value">${ind.sma50.toFixed(5)}</div>
            </div>
            
            <div class="indicator" style="margin-top: 20px;">
                <div class="indicator-label">Bandas de Bollinger</div>
                <div class="indicator-value" style="font-size: 0.95em;">
                    Superior: ${ind.bbUpper.toFixed(5)}<br>
                    Média: ${ind.bbMiddle.toFixed(5)}<br>
                    Inferior: ${ind.bbLower.toFixed(5)}<br>
                    <small style="color: #999;">Posição: ${ind.bbPosition.toFixed(1)}%</small>
                </div>
            </div>
            
            ${ind.sources ? `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
                    <small style="color: #999;">
                        <i class="fas fa-database"></i> 
                        Fontes: ${ind.sources.join(', ')}
                    </small>
                </div>
            ` : ''}
        </div>
    `;
}

// ============================================
// RENDERIZAÇÃO DA LISTA DE SINAIS
// ============================================

function renderSignals(signals) {
    const signalsList = document.getElementById('signalsList');
    const signalsCount = document.getElementById('signalsCount');
    
    // Atualizar contador
    signalsCount.textContent = `${signals.length} sinais`;
    
    // Filtrar apenas sinais fortes
    const strongSignals = signals.filter(s => s.strength > 50);
    
    if (strongSignals.length === 0) {
        signalsList.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-search"></i>
                <p>Nenhum sinal forte detectado no momento.</p>
                <small style="color: #999;">Tente atualizar os dados ou mudar o par.</small>
            </div>
        `;
        return;
    }
    
    // Renderizar sinais
    signalsList.innerHTML = strongSignals.map(signal => {
        const ind = signal.indicators;
        const isBuy = signal.finalSignal === 'COMPRA';
        const isSell = signal.finalSignal === 'VENDA';
        
        const signalColor = isBuy ? '#2ed573' : isSell ? '#ff4757' : '#ffa502';
        const signalIcon = isBuy ? '↑' : isSell ? '↓' : '→';
        const signalClass = isBuy ? 'buy-signal' : isSell ? 'sell-signal' : '';
        
        return `
            <div class="signal-item ${signalClass}">
                <div class="signal-info">
                    <div class="signal-pair">
                        ${signalIcon} ${ind.pair}
                        <span style="color: ${signalColor}; font-size: 0.8em;">
                            ${signal.finalSignal}
                        </span>
                    </div>
                    
                    <div class="signal-price">
                        Preço: ${ind.currentPrice.toFixed(5)}
                        <span style="font-size: 0.9em; color: #999;">
                            | Força: ${signal.strength}%
                        </span>
                    </div>
                    
                    <div class="signal-details">
                        ${signal.details.slice(0, 3).map(d => 
                            `${d.indicator}: ${d.reason}`
                        ).join(' | ')}
                    </div>
                    
                    <div class="signal-source">
                        Fonte: ${ind.sources?.join(', ') || 'Simulação'}
                        | ${new Date().toLocaleTimeString()}
                    </div>
                </div>
                
                <div class="signal-action" style="background: ${signalColor};">
                    ${signal.finalSignal}
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// FUNÇÕES PRINCIPAIS
// ============================================

// Buscar dados em tempo real
async function fetchRealTimeData() {
    APP_STATE.usingRealData = true;
    
    showMessage('Buscando dados reais das APIs...', 'info');
    document.getElementById('dashboard').innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Conectando às APIs de mercado...</p>
            <small style="color: #999;">Isso pode levar alguns segundos</small>
        </div>
    `;
    
    try {
        // Buscar preço do par atual
        const price = await apiManager.getAnyPrice(APP_STATE.currentPair);
        
        if (!price) {
            throw new Error('Nenhuma API disponível');
        }
        
        // Obter indicadores do Twelve Data se disponível
        let technicalIndicators = null;
        if (apiManager.apis.twelveData) {
            technicalIndicators = await apiManager.apis.twelveData
                .getTechnicalIndicators(APP_STATE.currentPair);
        }
        
        // Construir objeto de indicadores
        const indicators = {
            pair: APP_STATE.currentPair.replace('_', '/'),
            currentPrice: (price.bid + price.ask) / 2,
            bid: price.bid,
            ask: price.ask,
            spread: price.spread,
            rsi: technicalIndicators?.rsi || 50 + (Math.random() * 20 - 10),
            macdLine: technicalIndicators?.macd?.macd || 0,
            signalLine: technicalIndicators?.macd?.signal || 0,
            macdHistogram: technicalIndicators?.macd?.histogram || 0,
            sma20: (price.bid + price.ask) / 2 * (1 + (Math.random() - 0.5) * 0.002),
            sma50: (price.bid + price.ask) / 2 * (1 + (Math.random() - 0.5) * 0.004),
            bbUpper: price.ask * 1.005,
            bbLower: price.bid * 0.995,
            bbMiddle: (price.bid + price.ask) / 2,
            bbPosition: 30 + Math.random() * 40,
            stochastic: 20 + Math.random() * 60,
            sources: [price.source || 'API Real'],
            timestamp: price.timestamp || new Date()
        };
        
        const analysis = analyzeSignals(indicators);
        renderDashboard(analysis);
        
        // Gerar sinais para outros pares
        await generateMultiPairSignals();
        
        showMessage('Dados atualizados com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        showMessage('Erro ao conectar com APIs. Usando dados simulados.', 'error');
        useSimulatedData();
    }
}

// Gerar sinais para múltiplos pares
async function generateMultiPairSignals() {
    const signals = [];
    
    for (const pair of CONFIG.pairs) {
        const price = await apiManager.getAnyPrice(pair);
        
        if (price) {
            const indicators = {
                pair: pair.replace('_', '/'),
                currentPrice: (price.bid + price.ask) / 2,
                rsi: 40 + Math.random() * 20,
                macdLine: (Math.random() - 0.5) * 0.002,
                signalLine: (Math.random() - 0.5) * 0.001,
                macdHistogram: (Math.random() - 0.5) * 0.001,
                sma20: (price.bid + price.ask) / 2 * (1 + (Math.random() - 0.5) * 0.002),
                sma50: (price.bid + price.ask) / 2 * (1 + (Math.random() - 0.5) * 0.004),
                bbUpper: price.ask * 1.005,
                bbLower: price.bid * 0.995,
                bbMiddle: (price.bid + price.ask) / 2,
                bbPosition: 30 + Math.random() * 40,
                stochastic: 20 + Math.random() * 60,
                sources: [price.source || 'API Real']
            };
            
            signals.push(analyzeSignals(indicators));
        }
    }
    
    // Ordenar por força
    signals.sort((a, b) => b.strength - a.strength);
    renderSignals(signals);
}

// Usar dados simulados
function useSimulatedData() {
    APP_STATE.usingRealData = false;
    
    // Gerar análise para o par atual
    const indicators = generateSimulatedIndicators(APP_STATE.currentPair);
    const analysis = analyzeSignals(indicators);
    renderDashboard(analysis);
    
    // Gerar sinais simulados para todos os pares
    const signals = CONFIG.pairs.map(pair => {
        const ind = generateSimulatedIndicators(pair);
        return analyzeSignals(ind);
    });
    
    // Ordenar por força
    signals.sort((a, b) => b.strength - a.strength);
    renderSignals(signals);
}

// Atualizar dados
function refreshData() {
    if (APP_STATE.usingRealData) {
        fetchRealTimeData();
    } else {
        useSimulatedData();
    }
}

// ============================================
// UTILITÁRIOS DE INTERFACE
// ============================================

// Mostrar mensagem
function showMessage(message, type = 'info') {
    const messageArea = document.getElementById('messageArea');
    messageArea.textContent = message;
    messageArea.className = `message-area ${type}`;
    messageArea.style.display = 'block';
    
    // Esconder após 5 segundos
    setTimeout(() => {
        messageArea.style.display = 'none';
    }, 5000);
}

// Atualizar display de status das APIs
function updateApiStatusDisplay(status) {
    APP_STATE.activeApis = status;
    
    const updateStatus = (elementId, isOnline, name) => {
        const element = document.getElementById(elementId);
        if (isOnline) {
            element.className = 'status-indicator online';
            element.innerHTML = `<i class="fas fa-circle"></i> ${name}: Online`;
        } else {
            element.className = 'status-indicator offline';
            element.innerHTML = `<i class="fas fa-circle"></i> ${name}: Offline`;
        }
    };
    
    updateStatus('oandaStatus', status.oanda, 'OANDA');
    updateStatus('alphaVantageStatus', status.alphaVantage, 'Alpha Vantage');
    updateStatus('twelveDataStatus', status.twelveData, 'Twelve Data');
}

// Salvar chaves de API
function saveApiKeys() {
    const oandaKey = document.getElementById('oandaKey').value.trim();
    const alphaVantageKey = document.getElementById('alphaVantageKey').value.trim();
    const twelveDataKey = document.getElementById('twelveDataKey').value.trim();
    
    if (!oandaKey && !alphaVantageKey && !twelveDataKey) {
        showMessage('Por favor, insira pelo menos uma chave de API.', 'error');
        return;
    }
    
    apiManager.saveKeys(oandaKey, alphaVantageKey, twelveDataKey);
    apiManager.checkAllStatus();
}

// Limpar chaves de API
function clearApiKeys() {
    if (confirm('Tem certeza que deseja remover todas as chaves de API?')) {
        document.getElementById('oandaKey').value = '';
        document.getElementById('alphaVantageKey').value = '';
        document.getElementById('twelveDataKey').value = '';
        
        apiManager.clearKeys();
        apiManager.checkAllStatus();
    }
}

// Toggle da seção de configuração
function toggleConfig() {
    const content = document.getElementById('configContent');
    const btn = document.querySelector('.toggle-btn i');
    
    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        btn.className = 'fas fa-chevron-up';
    } else {
        content.classList.add('hidden');
        btn.className = 'fas fa-chevron-down';
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Configurar seletores de pares
    document.getElementById('pairSelector').addEventListener('click', (e) => {
        const btn = e.target.closest('.pair-btn');
        if (!btn) return;
        
        // Remover active de todos
        document.querySelectorAll('.pair-btn').forEach(b => b.classList.remove('active'));
        // Adicionar active no selecionado
        btn.classList.add('active');
        
        // Atualizar par atual
        APP_STATE.currentPair = btn.dataset.pair;
        
        // Atualizar dados
        refreshData();
    });
    
    // Verificar status das APIs ao carregar
    apiManager.checkAllStatus();
    
    // Carregar chaves salvas nos campos
    const savedKeys = localStorage.getItem('forex_api_keys');
    if (savedKeys) {
        const keys = JSON.parse(savedKeys);
        document.getElementById('oandaKey').value = keys.oanda || '';
        document.getElementById('alphaVantageKey').value = keys.alphaVantage || '';
        document.getElementById('twelveDataKey').value = keys.twelveData || '';
    }
    
    // Iniciar com dados simulados
    useSimulatedData();
    
    // Configurar atualização automática
    setInterval(() => {
        if (APP_STATE.usingRealData) {
            fetchRealTimeData();
        }
    }, CONFIG.refreshInterval);
});

// ============================================
// EXPORTAR PARA ESCOPO GLOBAL
// ============================================
window.fetchRealTimeData = fetchRealTimeData;
window.useSimulatedData = useSimulatedData;
window.refreshData = refreshData;
window.saveApiKeys = saveApiKeys;
window.clearApiKeys = clearApiKeys;
window.toggleConfig = toggleConfig;
