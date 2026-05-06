// ============================================
// SISTEMA DE MACHINE LEARNING SIMPLES
// ============================================

class MLPredictor {
    constructor() {
        this.model = null;
        this.trainingData = [];
        this.accuracy = 0;
        this.features = [
            'rsi', 'macd_histogram', 'sma_diff', 
            'bb_position', 'volume_change', 'atr'
        ];
    }

    // Preparar dados de treinamento
    prepareTrainingData(historicalData) {
        const features = [];
        const labels = [];

        for (let i = 50; i < historicalData.length - 1; i++) {
            const window = historicalData.slice(i - 50, i);
            const nextPrice = historicalData[i + 1].close;
            const currentPrice = historicalData[i].close;
            
            // Features
            const featureVector = this.extractFeatures(window);
            features.push(featureVector);
            
            // Label (1 = subiu, 0 = desceu)
            labels.push(nextPrice > currentPrice ? 1 : 0);
        }

        return { features, labels };
    }

    // Extrair features dos dados
    extractFeatures(dataWindow) {
        const prices = dataWindow.map(d => d.close);
        const volumes = dataWindow.map(d => d.volume);
        
        // Calcular indicadores
        const rsiValues = indicators.calculateRSI(prices, 14);
        const macdData = indicators.calculateMACD(prices);
        const sma20 = indicators.calculateSMA(prices, 20);
        const sma50 = indicators.calculateSMA(prices, 50);
        const bb = indicators.calculateBollingerBands(prices);
        const atr = indicators.calculateATR(
            dataWindow.map(d => d.high),
            dataWindow.map(d => d.low),
            prices
        );
        
        // Últimos valores
        const lastRSI = rsiValues ? rsiValues[rsiValues.length - 1] : 50;
        const lastMACDHist = macdData ? macdData.histogram[macdData.histogram.length - 1] : 0;
        const lastSMADiff = (sma20 && sma50) ? sma20[sma20.length - 1] - sma50[sma50.length - 1] : 0;
        const lastBBPos = bb ? bb.percentB[bb.percentB.length - 1] : 50;
        
        // Volume change
        const avgVolume = volumes.reduce((a, b) => a + b) / volumes.length;
        const lastVolume = volumes[volumes.length - 1];
        const volumeChange = ((lastVolume - avgVolume) / avgVolume) * 100;
        
        // ATR
        const lastATR = atr ? atr[atr.length - 1] : 0;
        
        // Normalizar features
        return [
            this.normalize(lastRSI, 0, 100),
            this.normalize(lastMACDHist, -0.01, 0.01),
            this.normalize(lastSMADiff, -0.01, 0.01),
            this.normalize(lastBBPos, 0, 100),
            this.normalize(volumeChange, -100, 100),
            this.normalize(lastATR, 0, 0.01)
        ];
    }

    // Normalizar valores
    normalize(value, min, max) {
        if (max === min) return 0;
        return (value - min) / (max - min);
    }

    // Treinar modelo (Regressão Logística Simples)
    async trainModel(historicalData) {
        console.log('🧠 Iniciando treinamento do modelo ML...');
        
        const { features, labels } = this.prepareTrainingData(historicalData);
        
        if (features.length < 100) {
            throw new Error('Dados insuficientes para treinamento');
        }

        // Dividir dados em treino e teste
        const splitIndex = Math.floor(features.length * 0.8);
        const trainFeatures = features.slice(0, splitIndex);
        const trainLabels = labels.slice(0, splitIndex);
        const testFeatures = features.slice(splitIndex);
        const testLabels = labels.slice(splitIndex);

        // Inicializar pesos
        this.weights = new Array(this.features.length).fill(0).map(() => Math.random() * 0.1);
        this.bias = 0;
        
        // Hiperparâmetros
        const learningRate = 0.01;
        const epochs = 100;
        
        // Treinamento
        for (let epoch = 0; epoch < epochs; epoch++) {
            let totalLoss = 0;
            
            for (let i = 0; i < trainFeatures.length; i++) {
                // Forward pass
                const prediction = this.sigmoid(this.dotProduct(trainFeatures[i], this.weights) + this.bias);
                
                // Loss
                totalLoss += -(trainLabels[i] * Math.log(prediction + 1e-10) + 
                             (1 - trainLabels[i]) * Math.log(1 - prediction + 1e-10));
                
                // Backpropagation
                const error = prediction - trainLabels[i];
                
                // Atualizar pesos
                for (let j = 0; j < this.weights.length; j++) {
                    this.weights[j] -= learningRate * error * trainFeatures[i][j];
                }
                this.bias -= learningRate * error;
            }
            
            if (epoch % 20 === 0) {
                console.log(`  Época ${epoch}: Loss = ${(totalLoss / trainFeatures.length).toFixed(4)}`);
            }
        }

        // Avaliar modelo
        let correctPredictions = 0;
        for (let i = 0; i < testFeatures.length; i++) {
            const prediction = this.predict(testFeatures[i]);
            if (prediction === testLabels[i]) {
                correctPredictions++;
            }
        }
        
        this.accuracy = (correctPredictions / testFeatures.length) * 100;
        console.log(`✅ Modelo treinado! Acurácia: ${this.accuracy.toFixed(2)}%`);
        
        return {
            accuracy: this.accuracy,
            weights: this.weights,
            bias: this.bias,
            features: this.features
        };
    }

    // Fazer previsão
    predict(features) {
        if (!this.weights) return null;
        
        const probability = this.sigmoid(this.dotProduct(features, this.weights) + this.bias);
        return probability > 0.5 ? 1 : 0;
    }

    // Prever com probabilidade
    predictProbability(features) {
        if (!this.weights) return null;
        
        return this.sigmoid(this.dotProduct(features, this.weights) + this.bias);
    }

    // Funções auxiliares
    sigmoid(x) {
        return 1 / (1 + Math.exp(-x));
    }

    dotProduct(a, b) {
        return a.reduce((sum, val, i) => sum + val * b[i], 0);
    }

    // Salvar modelo
    saveModel() {
        if (!this.weights) return null;
        
        return {
            weights: this.weights,
            bias: this.bias,
            accuracy: this.accuracy,
            features: this.features,
            timestamp: Date.now()
        };
    }

    // Carregar modelo
    loadModel(modelData) {
        this.weights = modelData.weights;
        this.bias = modelData.bias;
        this.accuracy = modelData.accuracy;
        this.features = modelData.features;
    }
}

// Instância global
const mlPredictor = new MLPredictor();
