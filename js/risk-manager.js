// ============================================
// SISTEMA DE GERENCIAMENTO DE RISCO
// ============================================

class RiskManager {
    constructor() {
        this.positions = [];
        this.closedPositions = [];
        this.riskLimits = {
            maxPositionSize: 5, // % do capital
            maxDailyLoss: 5, // % do capital
            maxTotalRisk: 10, // % do capital em risco total
            minRiskReward: 2, // ratio mínimo
            maxCorrelation: 0.7 // correlação máxima entre posições
        };
    }

    // Calcular tamanho da posição
    calculatePositionSize(accountCapital, entryPrice, stopLoss, riskPercentage = 1) {
        // Validar inputs
        if (accountCapital <= 0 || entryPrice <= 0 || stopLoss <= 0) {
            throw new Error('Parâmetros inválidos para cálculo de posição');
        }

        // Risco em dinheiro
        const riskAmount = accountCapital * (riskPercentage / 100);
        
        // Distância do stop em pips
        const stopDistance = Math.abs(entryPrice - stopLoss);
        
        // Valor por pip (aproximado para Forex)
        const pipValue = this.calculatePipValue(entryPrice);
        
        // Tamanho da posição em lotes
        const positionSize = riskAmount / (stopDistance * pipValue);
        
        // Arredondar para 2 decimais (lotes padrão)
        return Math.round(positionSize * 100) / 100;
    }

    // Calcular valor do pip
    calculatePipValue(price) {
        // Para pares com USD como moeda de cotação
        if (price < 10) { // EUR/USD, GBP/USD, etc.
            return 10; // $10 por pip para 1 lote padrão
        } else { // USD/JPY, etc.
            return 1000 / price;
        }
    }

    // Validar nova posição
    validateNewPosition(position, currentPositions, accountCapital) {
        const errors = [];
        const warnings = [];

        // Verificar tamanho máximo
        const positionSizePercent = (position.size * position.entryPrice / accountCapital) * 100;
        if (positionSizePercent > this.riskLimits.maxPositionSize) {
            errors.push(`Tamanho da posição (${positionSizePercent.toFixed(1)}%) excede o limite de ${this.riskLimits.maxPositionSize}%`);
        }

        // Verificar risco total
        const totalRisk = this.calculateTotalRisk(currentPositions, accountCapital);
        const newPositionRisk = Math.abs(position.entryPrice - position.stopLoss) * position.size / accountCapital * 100;
        
        if (totalRisk + newPositionRisk > this.riskLimits.maxTotalRisk) {
            errors.push(`Risco total (${(totalRisk + newPositionRisk).toFixed(1)}%) excede o limite de ${this.riskLimits.maxTotalRisk}%`);
        }

        // Verificar perda diária
        const dailyLoss = this.calculateDailyLoss();
        if (dailyLoss >= this.riskLimits.maxDailyLoss) {
            errors.push(`Limite de perda diária (${this.riskLimits.maxDailyLoss}%) atingido`);
        }

        // Verificar risk/reward
        const risk = Math.abs(position.entryPrice - position.stopLoss);
        const reward = Math.abs(position.takeProfit - position.entryPrice);
        const riskRewardRatio = reward / risk;
        
        if (riskRewardRatio < this.riskLimits.minRiskReward) {
            warnings.push(`Ratio risco/retorno (${riskRewardRatio.toFixed(2)}) abaixo do mínimo recomendado (${this.riskLimits.minRiskReward})`);
        }

        // Verificar correlação
        const correlation = this.checkCorrelation(position.pair, currentPositions);
        if (correlation > this.riskLimits.maxCorrelation) {
            warnings.push(`Alta correlação (${(correlation * 100).toFixed(0)}%) com posições existentes`);
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    // Calcular risco total das posições abertas
    calculateTotalRisk(positions, accountCapital) {
        let totalRisk = 0;

        positions.forEach(pos => {
            const risk = Math.abs(pos.entryPrice - pos.stopLoss) * pos.size;
            totalRisk += (risk / accountCapital) * 100;
        });

        return totalRisk;
    }

    // Calcular perda diária
    calculateDailyLoss() {
        const today = new Date().toDateString();
        const dailyLoss = this.closedPositions
            .filter(pos => new Date(pos.closeTime).toDateString() === today)
            .reduce((sum, pos) => sum + Math.min(0, pos.profitLoss), 0);

        return Math.abs(dailyLoss);
    }

    // Verificar correlação entre pares
    checkCorrelation(newPair, existingPositions) {
        const correlationMatrix = {
            'EUR_USD': { 'GBP_USD': 0.8, 'USD_CHF': -0.9, 'EUR_GBP': 0.5 },
            'GBP_USD': { 'EUR_USD': 0.8, 'USD_CHF': -0.7, 'GBP_JPY': 0.6 },
            'USD_JPY': { 'USD_CHF': 0.3, 'EUR_JPY': 0.8, 'GBP_JPY': 0.7 },
            'USD_CHF': { 'EUR_USD': -0.9, 'GBP_USD': -0.7, 'USD_JPY': 0.3 },
            'AUD_USD': { 'NZD_USD': 0.9, 'USD_CAD': -0.5 },
            'USD_CAD': { 'AUD_USD': -0.5, 'NZD_USD': -0.4 },
            'NZD_USD': { 'AUD_USD': 0.9, 'USD_CAD': -0.4 },
            'EUR_GBP': { 'EUR_USD': 0.5, 'GBP_USD': -0.3 }
        };

        let maxCorrelation = 0;

        existingPositions.forEach(pos => {
            const pair1 = newPair.replace('/', '_');
            const pair2 = pos.pair.replace('/', '_');
            
            const corr1 = correlationMatrix[pair1]?.[pair2] || 0;
            const corr2 = correlationMatrix[pair2]?.[pair1] || 0;
            
            maxCorrelation = Math.max(maxCorrelation, Math.abs(corr1), Math.abs(corr2));
        });

        return maxCorrelation;
    }

    // Calcular métricas de risco do portfólio
    calculatePortfolioMetrics(positions, accountCapital) {
        if (positions.length === 0) {
            return {
                totalRisk: 0,
                diversification: 100,
                riskPerTrade: 0,
                marginUsed: 0
            };
        }

        // Risco total
        const totalRisk = this.calculateTotalRisk(positions, accountCapital);

        // Diversificação (baseada em correlação)
        const pairs = positions.map(p => p.pair);
        const uniquePairs = new Set(pairs);
        const diversification = (uniquePairs.size / positions.length) * 100;

        // Risco médio por trade
        const risks = positions.map(pos => 
            (Math.abs(pos.entryPrice - pos.stopLoss) * pos.size / accountCapital) * 100
        );
        const avgRiskPerTrade = risks.reduce((a, b) => a + b, 0) / risks.length;

        // Margem utilizada (estimativa)
        const marginUsed = positions.reduce((sum, pos) => 
            sum + (pos.size * pos.entryPrice * 0.02), 0 // 2% margem típica
        );
        const marginPercent = (marginUsed / accountCapital) * 100;

        return {
            totalRisk,
            diversification,
            avgRiskPerTrade,
            marginUsed: marginPercent,
            totalPositions: positions.length,
            largestPosition: Math.max(...positions.map(p => p.size * p.entryPrice)),
            totalExposure: positions.reduce((sum, p) => sum + p.size * p.entryPrice, 0)
        };
    }

    // Sugerir ajustes de risco
    suggestAdjustments(positions, metrics) {
        const suggestions = [];

        if (metrics.totalRisk > this.riskLimits.maxTotalRisk) {
            suggestions.push({
                type: 'warning',
                message: 'Reduza o tamanho das posições para diminuir o risco total',
                action: 'reduzir_risco'
            });
        }

        if (metrics.diversification < 50) {
            suggestions.push({
                type: 'info',
                message: 'Considere diversificar em pares menos correlacionados',
                action: 'diversificar'
            });
        }

        if (metrics.marginUsed > 50) {
            suggestions.push({
                type: 'warning',
                message: 'Margem utilizada está alta. Risco de margin call',
                action: 'reduzir_margem'
            });
        }

        return suggestions;
    }

    // Atualizar limites de risco
    updateRiskLimits(newLimits) {
        this.riskLimits = { ...this.riskLimits, ...newLimits };
        this.saveRiskSettings();
    }

    // Salvar configurações de risco
    saveRiskSettings() {
        localStorage.setItem('risk_settings', JSON.stringify(this.riskLimits));
    }

    // Carregar configurações
    loadRiskSettings() {
        const saved = localStorage.getItem('risk_settings');
        if (saved) {
            this.riskLimits = { ...this.riskLimits, ...JSON.parse(saved) };
        }
    }
}

// Instância global
const riskManager = new RiskManager();
