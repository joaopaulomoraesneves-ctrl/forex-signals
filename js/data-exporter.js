// ============================================
// SISTEMA DE EXPORTAÇÃO DE DADOS
// ============================================

class DataExporter {
    constructor() {
        this.formats = ['csv', 'json', 'pdf', 'excel'];
    }

    // Exportar sinais
    exportSignals(signals, format = 'csv') {
        const data = this.prepareSignalsData(signals);
        
        switch (format) {
            case 'csv':
                return this.exportCSV(data, 'sinais_forex');
            case 'json':
                return this.exportJSON(data, 'sinais_forex');
            case 'excel':
                return this.exportExcel(data, 'sinais_forex');
            default:
                throw new Error(`Formato ${format} não suportado`);
        }
    }

    // Exportar resultados de backtest
    exportBacktestResults(results, format = 'csv') {
        const data = this.prepareBacktestData(results);
        
        switch (format) {
            case 'csv':
                return this.exportCSV(data, 'backtest_resultados');
            case 'json':
                return this.exportJSON(data, 'backtest_resultados');
            case 'pdf':
                return this.exportPDF(data, 'backtest_resultados');
            default:
                throw new Error(`Formato ${format} não suportado`);
        }
    }

    // Exportar dados de mercado
    exportMarketData(data, pair, timeframe, format = 'csv') {
        const prepared = this.prepareMarketData(data, pair, timeframe);
        return this.exportCSV(prepared, `market_data_${pair}_${timeframe}`);
    }

    // Preparar dados de sinais
    prepareSignalsData(signals) {
        return signals.map(signal => ({
            timestamp: new Date().toISOString(),
            pair: signal.indicators.pair,
            price: signal.indicators.currentPrice,
            signal: signal.finalSignal,
            strength: signal.strength,
            rsi: signal.indicators.rsi,
            macd: signal.indicators.macdHistogram,
            sma20: signal.indicators.sma20,
            sma50: signal.indicators.sma50,
            details: signal.details.map(d => `${d.indicator}: ${d.reason}`).join('; ')
        }));
    }

    // Preparar dados de backtest
    prepareBacktestData(results) {
        // Trades
        const trades = results.trades.map((trade, i) => ({
            id: i + 1,
            timestamp: trade.timestamp,
            pair: results.pair || 'N/A',
            type: trade.type,
            entry: trade.entry,
            exit: trade.exit,
            pnl: trade.pnl,
            profitLoss: trade.profitLoss,
            duration: trade.duration,
            result: trade.pnl > 0 ? 'WIN' : 'LOSS'
        }));

        // Métricas
        const metrics = [{
            initialCapital: results.initialCapital,
            finalCapital: results.finalCapital,
            totalReturn: results.totalReturn,
            totalTrades: results.metrics.totalTrades,
            winRate: results.metrics.winRate,
            profitFactor: results.metrics.profitFactor,
            sharpeRatio: results.metrics.sharpeRatio,
            maxDrawdown: results.metrics.maxDrawdown,
            processingTime: results.processingTime
        }];

        return { trades, metrics };
    }

    // Preparar dados de mercado
    prepareMarketData(data, pair, timeframe) {
        return data.map(candle => ({
            timestamp: candle.timestamp || candle.time,
            pair,
            timeframe,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume: candle.volume || 0,
            spread: candle.spread || 0
        }));
    }

    // Exportar como CSV
    exportCSV(data, filename) {
        if (!data || !data.length) {
            throw new Error('Sem dados para exportar');
        }

        // Cabeçalhos
        const headers = Object.keys(data[0]);
        
        // Linhas
        const rows = data.map(row => 
            headers.map(header => {
                const value = row[header];
                // Escapar valores com vírgula
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value}"`;
                }
                return value;
            }).join(',')
        );

        // Montar CSV
        const csv = [headers.join(','), ...rows].join('\n');
        
        // Download
        this.downloadFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8');
        return csv;
    }

    // Exportar como JSON
    exportJSON(data, filename) {
        const json = JSON.stringify(data, null, 2);
        this.downloadFile(json, `${filename}.json`, 'application/json');
        return json;
    }

    // Exportar como Excel (usando HTML table)
    exportExcel(data, filename) {
        if (!data || !data.length) {
            throw new Error('Sem dados para exportar');
        }

        const headers = Object.keys(data[0]);
        
        // Criar tabela HTML
        let html = '<table border="1">';
        
        // Cabeçalho
        html += '<thead><tr>';
        headers.forEach(header => {
            html += `<th style="background-color: #667eea; color: white;">${header}</th>`;
        });
        html += '</tr></thead>';
        
        // Corpo
        html += '<tbody>';
        data.forEach(row => {
            html += '<tr>';
            headers.forEach(header => {
                html += `<td>${row[header] || ''}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody></table>';

        // Download como .xls
        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        this.downloadBlob(blob, `${filename}.xls`);
        return html;
    }

    // Exportar como PDF (simples, usando window.print)
    exportPDF(data, filename) {
        const printWindow = window.open('', '_blank');
        
        printWindow.document.write(`
            <html>
            <head>
                <title>${filename}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
                    th { background-color: #667eea; color: white; }
                    .header { text-align: center; margin-bottom: 20px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Relatório de Backtesting</h1>
                    <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                </div>
                ${this.generatePDFContent(data)}
            </body>
            </html>
        `);
        
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    }

    // Gerar conteúdo PDF
    generatePDFContent(data) {
        let html = '';
        
        // Métricas
        if (data.metrics) {
            html += '<h2>Métricas de Performance</h2>';
            html += '<table>';
            const metrics = data.metrics[0];
            for (const [key, value] of Object.entries(metrics)) {
                html += `<tr><td><strong>${key}</strong></td><td>${value}</td></tr>`;
            }
            html += '</table><br>';
        }
        
        // Trades
        if (data.trades && data.trades.length > 0) {
            html += '<h2>Histórico de Trades</h2>';
            html += '<table><thead><tr>';
            const headers = Object.keys(data.trades[0]);
            headers.forEach(h => {
                html += `<th>${h}</th>`;
            });
            html += '</tr></thead><tbody>';
            
            data.trades.forEach(trade => {
                html += '<tr>';
                headers.forEach(h => {
                    html += `<td>${trade[h]}</td>`;
                });
                html += '</tr>';
            });
            
            html += '</tbody></table>';
        }
        
        return html;
    }

    // Download de arquivo
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        this.downloadBlob(blob, filename);
    }

    // Download de blob
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Agendar exportação automática
    scheduleExport(callback, interval) {
        return setInterval(callback, interval);
    }
}

// Instância global
const dataExporter = new DataExporter();
