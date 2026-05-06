// ============================================
// SISTEMA DE BACKTESTING
// ============================================

class Backtester {
    constructor() {
        this.results = null;
        this.trades = [];
    }

    // Executar backtest
    async runBacktest(data, strategy, initialCapital = 10000) {
        console.log('🔄 Iniciando backtesting...');
        const startTime = performance.now();
        
        this.trades = [];
        let capital = initialCapital;
        let position = null;
        let equityCurve = [initialCapital];
        
        // Parâmetros da estratégia
        const params = this.getStrategyParams(strategy);
        
        // Iterar sobre os dados
        for (let i = 50; i < data.length; i++) {
            const window = data.slice(i - 50, i);
            const currentPrice = data[i].close;
            
            // Gerar sinal
            const signal = this.generateSignal(window, strategy, params);
            
            // Fechar posição existente
            if (position) {
                const exitSignal = this.checkExit(position, currentPrice, data[i], params);
                if (exitSignal) {
                    const pnl = position.type === 'long' 
                        ? (currentPrice - position.entry) / position.entry * 100
                        : (position.entry - currentPrice) / position.entry * 100;
                    
                    const positionSize = this.calculatePositionSize(capital, params.riskPerTrade);
                    const profitLoss = (pnl / 100) * (capital * (positionSize / 100));
                    
                    capital += profitLoss;
                    
                    this.trades.push({
                        entry: position.entry,
                        exit: currentPrice,
                        type: position.type,
                        pnl: pnl,
                        profitLoss: profitLoss,
                        timestamp: data[i].timestamp,
                        duration: i - position.entryIndex
                    });
                    
                    position = null;
                }
            }
            
            // Abrir nova posição
            if (!position && signal !== 'neutral') {
                position = {
                    type: signal,
                    entry: currentPrice,
                    entryIndex: i,
                    stopLoss: this.calculateStopLoss(currentPrice, signal, params),
                    takeProfit: this.calculateTakeProfit(currentPrice, signal, params)
                };
            }
            
            equityCurve.push(capital);
        }
        
        // Fechar posição final se existir
        if (position) {
            const finalPrice = data[data.length - 1].close;
            const pnl = position.type === 'long'
                ? (finalPrice - position.entry) / position.entry * 100
                : (position.entry - finalPrice) / position.entry * 100;
            
            capital += pnl / 100 * capital;
            
            this.trades.push({
                entry: position.entry,
                exit: finalPrice,
                type: position.type,
                pnl: pnl,
                profitLoss: pnl / 100 * capital,
                timestamp: data[data.length - 1].timestamp,
                duration: data.length - 1 - position.entryIndex
            });
        }
        
        // Calcular métricas
        const metrics = this.calculateMetrics(initialCapital, capital, this.trades, equityCurve);
        
        const endTime = performance.now();
        console.log(`✅ Backtest concluído em ${(endTime - startTime).toFixed(0)}ms`);
        
        this.results = {
            initialCapital,
            finalCapital: capital,
            totalReturn: ((capital - initialCapital) / initialCapital) * 100,
            trades: this.trades,
            equityCurve,
            metrics,
            processingTime: endTime - startTime
        };
        
        return this.results;
    }

    // Gerar sinal baseado na estratégia
    generateSignal(data, strategy, params) {
        const prices = data.map(d => d.close);
        
        switch (strategy) {
            case 'rsi_macd':
                const rsi = indicators.calculateRSI(prices, params.rsiPeriod);
                const macd = indicators.calculateMACD(prices);
                
                if (!rsi || !macd) return 'neutral';
                
                const lastRSI = rsi[rsi.length - 1];
                const lastMACD = macd.histogram[macd.histogram.length - 1];
                
                if (lastRSI < params.rsiOversold && lastMACD > 0) return 'long';
                if (lastRSI > params.rsiOverbought && lastMACD < 0) return 'short';
                return 'neutral';
                
            case 'ma_crossover':
                const smaFast = indicators.calculateSMA(prices, params.fastPeriod);
                const smaSlow = indicators.calculateSMA(prices, params.slowPeriod);
                
                if (!smaFast || !smaSlow) return 'neutral';
                
                const fastLast = smaFast[smaFast.length - 1];
                const slowLast = smaSlow[smaSlow.length - 1];
                const fastPrev = smaFast[smaFast.length - 2];
                const slowPrev = smaSlow[smaSlow.length - 2];
                
                if (fastPrev <= slowPrev && fastLast > slowLast) return 'long';
                if (fastPrev >= slowPrev && fastLast < slowLast) return 'short';
                return 'neutral';
                
            case 'bollinger':
                const bb = indicators.calculateBollingerBands(prices, params.bbPeriod);
                
                if (!bb) return 'neutral';
                
                const lastBB = bb.percentB[bb.percentB.length - 1];
                
                if (lastBB < 5) return 'long';  // Preço abaixo da banda inferior
                if (lastBB > 95) return 'short'; // Preço acima da banda superior
                return 'neutral';
                
            default:
                return 'neutral';
        }
    }

    // Verificar condições de saída
    checkExit(position, currentPrice, currentData, params) {
        // Stop Loss
        if (position.type === 'long' && currentPrice <= position.stopLoss) return true;
        if (position.type === 'short' && currentPrice >= position.stopLoss) return true;
        
        // Take Profit
        if (position.type === 'long' && currentPrice >= position.takeProfit) return true;
        if (position.type === 'short' && currentPrice <= position.takeProfit) return true;
        
        return false;
    }

    // Calcular métricas
    calculateMetrics(initialCapital, finalCapital, trades, equityCurve) {
        if (trades.length === 0) {
            return {
                totalTrades: 0,
                winRate: 0,
                profitFactor: 0,
                sharpeRatio: 0,
                maxDrawdown: 0
            };
        }
        
        const winningTrades = trades.filter(t => t.pnl > 0);
        const losingTrades = trades.filter(t => t.pnl <= 0);
        
        const winRate = (winningTrades.length / trades.length) * 100;
        
        const totalProfit = winningTrades.reduce((sum, t) => sum + t.profitLoss, 0);
        const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.profitLoss, 0));
        const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : Infinity;
        
        // Sharpe Ratio
        const returns = [];
        for (let i = 1; i < equityCurve.length; i++) {
            returns.push((equityCurve[i] - equityCurve[i - 1]) / equityCurve[i - 1]);
        }
        
        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const stdReturn = Math.sqrt(
            returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
        );
        
        const sharpeRatio = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(252) : 0;
        
        // Max Drawdown
        let maxDrawdown = 0;
        let peak = equityCurve[0];
        
        for (const value of equityCurve) {
            if (value > peak) peak = value;
            const drawdown = ((peak - value) / peak) * 100;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        }
        
        return {
            totalTrades: trades.length,
            winningTrades: winningTrades.length,
            losingTrades: losingTrades.length,
            winRate,
            profitFactor,
            sharpeRatio,
            maxDrawdown,
            avgProfit: winningTrades.length > 0 ? totalProfit / winningTrades.length : 0,
            avgLoss: losingTrades.length > 0 ? totalLoss / losingTrades.length : 0
        };
    }

    // Calcular tamanho da posição
    calculatePositionSize(capital, riskPerTrade) {
        // Implementação do Critério de Kelly
        const winRate = this.trades.length > 0 
            ? this.trades.filter(t => t.pnl > 0).length / this.trades.length 
            : 0.5;
        
        const avgWin = this.trades
            .filter(t => t.pnl > 0)
            .reduce((sum, t) => sum + t.pnl, 0) / (this.trades.filter(t => t.pnl > 0).length || 1);
        
        const avgLoss = Math.abs(this.trades
            .filter(t => t.pnl <= 0)
            .reduce((sum, t) => sum + t.pnl, 0) / (this.trades.filter(t => t.pnl <= 0).length || 1));
        
        if (avgLoss === 0) return riskPerTrade;
        
        const kelly = winRate - ((1 - winRate) / (avgWin / avgLoss));
        return Math.max(1, Math.min(riskPerTrade, kelly * 100));
    }

    calculateStopLoss(price, type, params) {
        const slPercent = params.stopLossPercent || 0.02;
        return type === 'long' ? price * (1 - slPercent) : price * (1 + slPercent);
    }

    calculateTakeProfit(price, type, params) {
        const tpPercent = params.takeProfitPercent || 0.04;
        return type === 'long' ? price * (1 + tpPercent) : price * (1 - tpPercent);
    }

    getStrategyParams(strategy) {
        const defaultParams = {
            riskPerTrade: 1,
            stopLossPercent: 0.02,
            takeProfitPercent: 0.04
        };
        
        switch (strategy) {
            case 'rsi_macd':
                return { ...defaultParams, rsiPeriod: 14, rsiOversold: 30, rsiOverbought: 70 };
            case 'ma_crossover':
                return { ...defaultParams, fastPeriod: 20, slowPeriod: 50 };
            case 'bollinger':
                return { ...defaultParams, bbPeriod: 20, bbDeviations: 2 };
            default:
                return defaultParams;
        }
    }
}

// Instância global
const backtester = new Backtester();
