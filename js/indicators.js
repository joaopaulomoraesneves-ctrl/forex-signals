// ============================================
// SISTEMA AVANÇADO DE INDICADORES TÉCNICOS
// ============================================

class TechnicalIndicators {
    constructor() {
        this.cache = new Map();
    }

    // ============================================
    // RSI - Relative Strength Index
    // ============================================
    calculateRSI(prices, period = 14) {
        const cacheKey = `rsi_${period}_${prices.length}`;
        if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

        if (prices.length < period + 1) return null;

        let gains = 0;
        let losses = 0;

        // Primeiro RSI
        for (let i = 1; i <= period; i++) {
            const difference = prices[i] - prices[i - 1];
            if (difference >= 0) {
                gains += difference;
            } else {
                losses -= difference;
            }
        }

        let avgGain = gains / period;
        let avgLoss = losses / period;
        
        const rsiValues = [];
        
        // Primeiro valor
        let rs = avgGain / (avgLoss || 1); // Evitar divisão por zero
        rsiValues.push(100 - (100 / (1 + rs)));

        // Demais valores
        for (let i = period + 1; i < prices.length; i++) {
            const difference = prices[i] - prices[i - 1];
            
            if (difference >= 0) {
                avgGain = (avgGain * (period - 1) + difference) / period;
                avgLoss = (avgLoss * (period - 1)) / period;
            } else {
                avgGain = (avgGain * (period - 1)) / period;
                avgLoss = (avgLoss * (period - 1) - difference) / period;
            }
            
            rs = avgGain / (avgLoss || 1);
            rsiValues.push(100 - (100 / (1 + rs)));
        }

        this.cache.set(cacheKey, rsiValues);
        return rsiValues;
    }

    // ============================================
    // MACD - Moving Average Convergence Divergence
    // ============================================
    calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        const cacheKey = `macd_${fastPeriod}_${slowPeriod}_${signalPeriod}`;
        if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

        const emaFast = this.calculateEMA(prices, fastPeriod);
        const emaSlow = this.calculateEMA(prices, slowPeriod);
        
        if (!emaFast || !emaSlow) return null;

        // MACD Line
        const macdLine = emaFast.map((fast, i) => fast - emaSlow[i]);
        
        // Signal Line
        const signalLine = this.calculateEMA(macdLine, signalPeriod);
        
        // Histogram
        const histogram = macdLine.map((macd, i) => macd - signalLine[i]);

        const result = {
            macdLine,
            signalLine,
            histogram,
            crossovers: this.findCrossovers(macdLine, signalLine)
        };

        this.cache.set(cacheKey, result);
        return result;
    }

    // ============================================
    // EMA - Exponential Moving Average
    // ============================================
    calculateEMA(prices, period) {
        if (prices.length < period) return null;

        const multiplier = 2 / (period + 1);
        const ema = [];
        
        // Primeiro valor é SMA
        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += prices[i];
        }
        ema.push(sum / period);

        // Demais valores
        for (let i = period; i < prices.length; i++) {
            ema.push((prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1]);
        }

        return ema;
    }

    // ============================================
    // Bollinger Bands
    // ============================================
    calculateBollingerBands(prices, period = 20, deviations = 2) {
        const cacheKey = `bb_${period}_${deviations}`;
        if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

        const sma = this.calculateSMA(prices, period);
        if (!sma) return null;

        const bands = {
            middle: sma,
            upper: [],
            lower: [],
            width: [],
            percentB: []
        };

        for (let i = period - 1; i < prices.length; i++) {
            const slice = prices.slice(i - period + 1, i + 1);
            const std = this.calculateStandardDeviation(slice);
            
            bands.upper.push(sma[i - period + 1] + (deviations * std));
            bands.lower.push(sma[i - period + 1] - (deviations * std));
            bands.width.push((bands.upper[bands.upper.length - 1] - bands.lower[bands.lower.length - 1]) / sma[i - period + 1] * 100);
            
            // %B - Posição do preço em relação às bandas
            const percentB = (prices[i] - bands.lower[bands.lower.length - 1]) / 
                           (bands.upper[bands.upper.length - 1] - bands.lower[bands.lower.length - 1]);
            bands.percentB.push(percentB * 100);
        }

        this.cache.set(cacheKey, bands);
        return bands;
    }

    // ============================================
    // Fibonacci Retracement
    // ============================================
    calculateFibonacci(high, low, trend = 'down') {
        const difference = high - low;
        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        
        return levels.map(level => {
            if (trend === 'down') {
                return {
                    level: level * 100,
                    price: high - (difference * level),
                    type: this.getFibonacciType(level)
                };
            } else {
                return {
                    level: level * 100,
                    price: low + (difference * level),
                    type: this.getFibonacciType(level)
                };
            }
        });
    }

    getFibonacciType(level) {
        if (level === 0) return 'Start';
        if (level === 0.236) return 'Weak';
        if (level === 0.382) return 'Moderate';
        if (level === 0.5) return 'Midpoint';
        if (level === 0.618) return 'Golden Ratio';
        if (level === 0.786) return 'Deep';
        if (level === 1) return 'Full';
        return 'Other';
    }

    // ============================================
    // ATR - Average True Range
    // ============================================
    calculateATR(highs, lows, closes, period = 14) {
        if (highs.length < period + 1) return null;

        const trueRanges = [];
        
        for (let i = 1; i < highs.length; i++) {
            const tr1 = highs[i] - lows[i];
            const tr2 = Math.abs(highs[i] - closes[i - 1]);
            const tr3 = Math.abs(lows[i] - closes[i - 1]);
            trueRanges.push(Math.max(tr1, tr2, tr3));
        }

        // Primeiro ATR é média simples
        let atr = trueRanges.slice(0, period).reduce((a, b) => a + b) / period;
        const atrValues = [atr];

        // Demais valores com smoothing
        for (let i = period; i < trueRanges.length; i++) {
            atr = (atr * (period - 1) + trueRanges[i]) / period;
            atrValues.push(atr);
        }

        return atrValues;
    }

    // ============================================
    // Suporte e Resistência
    // ============================================
    findSupportResistance(prices, period = 20, threshold = 0.02) {
        const levels = {
            support: [],
            resistance: []
        };

        for (let i = period; i < prices.length - period; i++) {
            // Encontrar mínimos locais
            if (this.isLocalMinimum(prices, i, period)) {
                const level = prices[i];
                if (!levels.support.some(s => Math.abs(s.price - level) / level < threshold)) {
                    levels.support.push({
                        price: level,
                        strength: this.calculateLevelStrength(prices, level, 'support'),
                        touches: 0
                    });
                }
            }
            
            // Encontrar máximos locais
            if (this.isLocalMaximum(prices, i, period)) {
                const level = prices[i];
                if (!levels.resistance.some(r => Math.abs(r.price - level) / level < threshold)) {
                    levels.resistance.push({
                        price: level,
                        strength: this.calculateLevelStrength(prices, level, 'resistance'),
                        touches: 0
                    });
                }
            }
        }

        // Ordenar por força
        levels.support.sort((a, b) => b.strength - a.strength);
        levels.resistance.sort((a, b) => b.strength - a.strength);

        return levels;
    }

    isLocalMinimum(prices, index, period) {
        const value = prices[index];
        for (let i = index - period; i <= index + period; i++) {
            if (i >= 0 && i < prices.length && prices[i] < value) {
                return false;
            }
        }
        return true;
    }

    isLocalMaximum(prices, index, period) {
        const value = prices[index];
        for (let i = index - period; i <= index + period; i++) {
            if (i >= 0 && i < prices.length && prices[i] > value) {
                return false;
            }
        }
        return true;
    }

    calculateLevelStrength(prices, level, type) {
        let touches = 0;
        const threshold = level * 0.001;
        
        prices.forEach(price => {
            if (Math.abs(price - level) <= threshold) {
                touches++;
            }
        });
        
        return Math.min(100, touches * 10);
    }

    // ============================================
    // Funções Auxiliares
    // ============================================
    calculateSMA(prices, period) {
        if (prices.length < period) return null;
        
        const sma = [];
        for (let i = period - 1; i < prices.length; i++) {
            const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            sma.push(sum / period);
        }
        return sma;
    }

    calculateStandardDeviation(values) {
        const avg = values.reduce((a, b) => a + b) / values.length;
        const squareDiffs = values.map(value => Math.pow(value - avg, 2));
        return Math.sqrt(squareDiffs.reduce((a, b) => a + b) / values.length);
    }

    findCrossovers(line1, line2) {
        const crossovers = [];
        
        for (let i = 1; i < line1.length; i++) {
            if (line1[i - 1] <= line2[i - 1] && line1[i] > line2[i]) {
                crossovers.push({ index: i, type: 'bullish' });
            } else if (line1[i - 1] >= line2[i - 1] && line1[i] < line2[i]) {
                crossovers.push({ index: i, type: 'bearish' });
            }
        }
        
        return crossovers;
    }

    clearCache() {
        this.cache.clear();
    }
}

// Instância global
const indicators = new TechnicalIndicators();
