// ============================================
// SISTEMA DE RENDERIZAÇÃO DE GRÁFICOS COM CANVAS
// ============================================

class ChartRenderer {
    constructor() {
        this.charts = new Map();
        this.colors = {
            bull: '#2ed573',
            bear: '#ff4757',
            neutral: '#ffa502',
            grid: 'rgba(0,0,0,0.1)',
            text: '#666',
            background: '#ffffff',
            volume: 'rgba(100,100,255,0.3)'
        };
    }

    // Inicializar gráfico principal
    initMainChart(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const chart = {
            canvas,
            ctx,
            data: [],
            indicators: [],
            scale: 1,
            offset: { x: 0, y: 0 },
            dragging: false,
            dragStart: { x: 0, y: 0 }
        };

        this.setupCanvasSize(canvas, chart);
        this.setupInteraction(canvas, chart);
        
        this.charts.set('main', chart);
        return chart;
    }

    // Configurar tamanho do canvas
    setupCanvasSize(canvas, chart) {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth * window.devicePixelRatio;
        canvas.height = container.clientHeight * window.devicePixelRatio;
        chart.width = container.clientWidth;
        chart.height = container.clientHeight;
    }

    // Configurar interações
    setupInteraction(canvas, chart) {
        // Zoom com scroll
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            chart.scale *= zoomFactor;
            chart.scale = Math.max(0.5, Math.min(5, chart.scale));
            this.renderChart('main');
        });

        // Drag para mover
        canvas.addEventListener('mousedown', (e) => {
            chart.dragging = true;
            chart.dragStart = { x: e.clientX, y: e.clientY };
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!chart.dragging) return;
            
            const dx = e.clientX - chart.dragStart.x;
            const dy = e.clientY - chart.dragStart.y;
            
            chart.offset.x += dx;
            chart.offset.y += dy;
            
            chart.dragStart = { x: e.clientX, y: e.clientY };
            this.renderChart('main');
        });

        canvas.addEventListener('mouseup', () => {
            chart.dragging = false;
        });

        canvas.addEventListener('mouseleave', () => {
            chart.dragging = false;
        });

        // Touch para dispositivos móveis
        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                chart.pinchStart = this.getPinchDistance(e);
            }
        });

        canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                const distance = this.getPinchDistance(e);
                const scale = distance / chart.pinchStart;
                chart.scale *= scale;
                chart.scale = Math.max(0.5, Math.min(5, chart.scale));
                chart.pinchStart = distance;
                this.renderChart('main');
            }
        });
    }

    // Renderizar gráfico principal
    renderChart(chartId) {
        const chart = this.charts.get(chartId);
        if (!chart || !chart.data.length) return;

        const ctx = chart.ctx;
        const { width, height } = chart;
        
        // Limpar canvas
        ctx.clearRect(0, 0, width * window.devicePixelRatio, height * window.devicePixelRatio);
        
        // Aplicar transformações
        ctx.save();
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        ctx.translate(chart.offset.x, chart.offset.y);
        ctx.scale(chart.scale, 1);

        // Desenhar grid
        this.drawGrid(ctx, width, height, chart);
        
        // Desenhar candles
        this.drawCandles(ctx, chart.data, width, height);
        
        // Desenhar indicadores
        chart.indicators.forEach(indicator => {
            this.drawIndicator(ctx, indicator, chart.data, width, height);
        });

        // Desenhar crosshair se hover
        if (chart.crosshair) {
            this.drawCrosshair(ctx, chart.crosshair, width, height);
        }

        ctx.restore();
    }

    // Desenhar grid
    drawGrid(ctx, width, height, chart) {
        ctx.strokeStyle = this.colors.grid;
        ctx.lineWidth = 0.5;

        // Linhas horizontais
        const horizontalLines = 10;
        for (let i = 0; i <= horizontalLines; i++) {
            const y = (height / horizontalLines) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();

            // Preço no eixo Y
            if (chart.data.length > 0) {
                const prices = chart.data.map(d => d.close);
                const min = Math.min(...prices);
                const max = Math.max(...prices);
                const price = max - ((max - min) / horizontalLines) * i;
                ctx.fillStyle = this.colors.text;
                ctx.font = '10px Arial';
                ctx.fillText(price.toFixed(5), 5, y - 5);
            }
        }

        // Linhas verticais
        const verticalLines = 20;
        for (let i = 0; i <= verticalLines; i++) {
            const x = (width / verticalLines) * i;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
    }

    // Desenhar candles
    drawCandles(ctx, data, width, height) {
        const prices = data.map(d => d.close);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const range = max - min;
        
        const candleWidth = Math.max(2, (width / data.length) * 0.8);
        const spacing = width / data.length;

        data.forEach((candle, i) => {
            const x = i * spacing + spacing / 2;
            
            // Coordenadas Y
            const openY = height - ((candle.open - min) / range) * height;
            const closeY = height - ((candle.close - min) / range) * height;
            const highY = height - ((candle.high - min) / range) * height;
            const lowY = height - ((candle.low - min) / range) * height;
            
            const isBullish = candle.close > candle.open;
            
            // Pavio superior
            ctx.strokeStyle = isBullish ? this.colors.bull : this.colors.bear;
            ctx.beginPath();
            ctx.moveTo(x, highY);
            ctx.lineTo(x, Math.min(openY, closeY));
            ctx.stroke();

            // Pavio inferior
            ctx.beginPath();
            ctx.moveTo(x, Math.max(openY, closeY));
            ctx.lineTo(x, lowY);
            ctx.stroke();

            // Corpo
            ctx.fillStyle = isBullish ? this.colors.bull : this.colors.bear;
            const bodyHeight = Math.abs(closeY - openY);
            ctx.fillRect(
                x - candleWidth / 2,
                Math.min(openY, closeY),
                candleWidth,
                Math.max(1, bodyHeight)
            );

            // Volume (barra inferior)
            if (candle.volume) {
                const volumeHeight = (candle.volume / Math.max(...data.map(d => d.volume || 1))) * 30;
                ctx.fillStyle = this.colors.volume;
                ctx.fillRect(
                    x - candleWidth / 2,
                    height - volumeHeight,
                    candleWidth,
                    volumeHeight
                );
            }
        });
    }

    // Desenhar indicador
    drawIndicator(ctx, indicator, data, width, height) {
        if (!indicator.data || !indicator.data.length) return;

        ctx.strokeStyle = indicator.color || '#667eea';
        ctx.lineWidth = indicator.lineWidth || 2;
        ctx.beginPath();

        const values = indicator.data;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;

        values.forEach((value, i) => {
            const x = (i / values.length) * width;
            const y = height - ((value - min) / range) * (height * 0.3) - height * 0.6;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();

        // Legenda
        if (indicator.label) {
            ctx.fillStyle = this.colors.text;
            ctx.font = '11px Arial';
            ctx.fillText(
                `${indicator.label}: ${values[values.length - 1].toFixed(2)}`,
                10,
                20
            );
        }
    }

    // Desenhar crosshair
    drawCrosshair(ctx, position, width, height) {
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);

        // Linha vertical
        ctx.beginPath();
        ctx.moveTo(position.x, 0);
        ctx.lineTo(position.x, height);
        ctx.stroke();

        // Linha horizontal
        ctx.beginPath();
        ctx.moveTo(0, position.y);
        ctx.lineTo(width, position.y);
        ctx.stroke();

        ctx.setLineDash([]);
    }

    // Adicionar indicador ao gráfico
    addIndicator(chartId, indicatorConfig) {
        const chart = this.charts.get(chartId);
        if (!chart) return;

        chart.indicators.push(indicatorConfig);
        this.renderChart(chartId);
    }

    // Remover indicador
    removeIndicator(chartId, indicatorLabel) {
        const chart = this.charts.get(chartId);
        if (!chart) return;

        chart.indicators = chart.indicators.filter(ind => ind.label !== indicatorLabel);
        this.renderChart(chartId);
    }

    // Atualizar dados
    updateData(chartId, newData) {
        const chart = this.charts.get(chartId);
        if (!chart) return;

        chart.data = newData;
        this.renderChart(chartId);
    }

    // Capturar screenshot
    captureScreenshot(chartId) {
        const chart = this.charts.get(chartId);
        if (!chart) return null;

        return chart.canvas.toDataURL('image/png');
    }

    // Calcular distância para pinch zoom
    getPinchDistance(e) {
        return Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
    }

    // Destruir gráfico
    destroy(chartId) {
        this.charts.delete(chartId);
    }
}

// Instância global
const chartRenderer = new ChartRenderer();
