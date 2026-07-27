/* ============================================================
   ChatLens Chart Factory Engine
   Robust chart renderer using ECharts with automatic Canvas 2D
   fallback engine, ResizeObserver integration, theme awareness,
   and fail-safe dimension management.
   ============================================================ */

(function() {
  'use strict';
  const WCA = window.WCA = window.WCA || {};

  const instances = new Map();
  const resizeObservers = new Map();

  WCA.ChartFactory = {
    /**
     * Create or get an ECharts/Canvas instance for a container
     * @param {string|HTMLElement} container - Container element or ID
     * @returns {object|null} Chart handle
     */
    create(container) {
      if (typeof container === 'string') {
        container = document.getElementById(container);
      }
      if (!container) {
        console.warn('ChartFactory: Target container not found in DOM.');
        return null;
      }

      // Ensure container has visible dimensions
      if (!container.style.height && !container.clientHeight) {
        container.style.height = '320px';
      }
      container.style.width = '100%';

      // Check if ECharts library is available
      if (typeof echarts !== 'undefined') {
        let chart = echarts.getInstanceByDom(container);
        if (chart) {
          chart.clear();
        } else {
          chart = echarts.init(container);
          instances.set(container, chart);
        }

        // Attach ResizeObserver for automatic flex/grid layout adjustments
        this._attachResizeObserver(container, chart);
        return chart;
      }

      // Fallback: Built-in HTML5 Canvas 2D Renderer if ECharts CDN is offline/blocked
      return this._createCanvasFallback(container);
    },

    /**
     * Attach ResizeObserver to automatically resize chart when container layout changes
     */
    _attachResizeObserver(container, chart) {
      if (resizeObservers.has(container)) return;

      if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(() => {
          if (chart && typeof chart.resize === 'function') {
            try {
              const rect = container.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                chart.resize();
              }
            } catch (e) {}
          }
        });
        ro.observe(container);
        resizeObservers.set(container, ro);
      }
    },

    /**
     * Multi-stage resize scheduling to guarantee layout paint completeness
     */
    _scheduleResize(chart) {
      if (!chart) return;
      if (typeof chart.resize !== 'function') return;

      try { chart.resize(); } catch (e) {}

      requestAnimationFrame(() => {
        try { chart.resize(); } catch (e) {}
      });

      setTimeout(() => {
        try { chart.resize(); } catch (e) {}
      }, 50);

      setTimeout(() => {
        try { chart.resize(); } catch (e) {}
      }, 200);

      setTimeout(() => {
        try { chart.resize(); } catch (e) {}
      }, 500);
    },

    /**
     * Get theme defaults based on light/dark mode
     */
    getDefaults() {
      const isDark = WCA.Themes ? WCA.Themes.current === 'dark' : true;
      const textColor = isDark ? '#a0a0b8' : '#2d3748';
      const axisLineColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.15)';
      const splitLineColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
      const tooltipBg = isDark ? '#1a1a2e' : '#ffffff';
      const tooltipText = isDark ? '#f0f0f5' : '#1a202c';
      const tooltipBorder = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';

      return {
        backgroundColor: 'transparent',
        textStyle: { fontFamily: "'Inter', system-ui, sans-serif", color: textColor },
        tooltip: {
          trigger: 'axis',
          confine: true,
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
          textStyle: { color: tooltipText, fontSize: 13, fontFamily: "'Inter', sans-serif" },
          borderWidth: 1,
          padding: [10, 14],
          extraCssText: 'border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.25); z-index: 1000;',
          axisPointer: { type: 'shadow' }
        },
        grid: {
          left: 55, right: 25, top: 40, bottom: 40, containLabel: true
        },
        xAxis: {
          axisLine: { lineStyle: { color: axisLineColor } },
          axisTick: { lineStyle: { color: axisLineColor } },
          axisLabel: { color: textColor, fontSize: 11, margin: 12 },
          splitLine: { lineStyle: { color: splitLineColor } }
        },
        yAxis: {
          axisLine: { lineStyle: { color: axisLineColor } },
          axisTick: { show: false },
          axisLabel: { color: textColor, fontSize: 11 },
          minInterval: 1,
          splitLine: { lineStyle: { color: splitLineColor, type: 'dashed' } }
        },
        color: WCA.Constants ? WCA.Constants.CHART_COLORS.primary : ['#6c5ce7', '#00cec9', '#fdcb6e'],
        animationDuration: 800,
        animationEasing: 'cubicOut'
      };
    },

    /**
     * Render Bar Chart
     */
    bar(container, data, options = {}) {
      const chart = this.create(container);
      if (!chart) return null;

      // Handle Canvas 2D fallback
      if (chart._isFallback) {
        chart.drawBar(data, options);
        return chart;
      }

      const defaults = this.getDefaults();
      const labels = data.labels || [];
      const values = data.values || [];
      const totalVal = values.reduce((a, b) => a + b, 0);
      const maxVal = Math.max(...values, 0);

      chart.setOption({
        ...defaults,
        tooltip: {
          ...defaults.tooltip,
          trigger: 'axis',
          confine: true,
          formatter: options.tooltipFormatter || function(params) {
            if (!params || !params[0]) return '';
            const p = params[0];
            const val = p.value;
            const pct = totalVal > 0 ? ((val / totalVal) * 100).toFixed(1) + '%' : '0%';
            return `<strong>${p.name}</strong><br/>Messages: <strong>${val.toLocaleString()}</strong> (${pct})`;
          }
        },
        xAxis: { ...defaults.xAxis, type: 'category', data: labels, ...(options.xAxis || {}) },
        yAxis: { ...defaults.yAxis, type: 'value', minInterval: 1, ...(options.yAxis || {}) },
        series: [{
          name: options.seriesName || 'Messages',
          type: 'bar',
          data: values,
          barMaxWidth: 40,
          itemStyle: {
            borderRadius: [6, 6, 0, 0],
            color: options.gradient ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: options.gradient[0] || '#6c5ce7' },
              { offset: 1, color: options.gradient[1] || '#a29bfe' }
            ]) : '#6c5ce7'
          },
          markPoint: options.showPeak !== false && maxVal > 0 ? {
            data: [{ type: 'max', name: 'Peak' }],
            itemStyle: { color: '#e84393' }
          } : undefined,
          emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(108,92,231,0.4)' } },
          ...(options.series || {})
        }],
        ...(options.extra || {})
      }, true);

      this._scheduleResize(chart);
      return chart;
    },

    /**
     * Render Line Chart
     */
    line(container, data, options = {}) {
      const chart = this.create(container);
      if (!chart) return null;

      if (chart._isFallback) {
        chart.drawLine(data, options);
        return chart;
      }

      const defaults = this.getDefaults();
      const labels = data.labels || [];
      const values = data.values || [];

      const series = Array.isArray(data.series) ? data.series : [{
        name: data.name || 'Messages',
        data: values,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 3, color: options.gradient ? options.gradient[0] : '#6c5ce7' },
        itemStyle: { color: options.gradient ? options.gradient[0] : '#6c5ce7' },
        areaStyle: options.area ? {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: options.gradient ? (options.gradient[0] + '60') : 'rgba(108,92,231,0.4)' },
            { offset: 1, color: options.gradient ? (options.gradient[1] + '05') : 'rgba(108,92,231,0.02)' }
          ])
        } : undefined,
        markPoint: options.showPeak !== false && values.length > 0 ? {
          data: [{ type: 'max', name: 'Peak' }],
          itemStyle: { color: '#6c5ce7' }
        } : undefined,
        ...(options.seriesOpts || {})
      }];

      chart.setOption({
        ...defaults,
        tooltip: {
          ...defaults.tooltip,
          trigger: 'axis',
          confine: true,
          formatter: options.tooltipFormatter || function(params) {
            if (!params || !params[0]) return '';
            let res = `<strong>${params[0].name}</strong>`;
            for (const p of params) {
              const marker = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:${p.color || '#6c5ce7'};margin-right:6px;"></span>`;
              const val = p.value !== undefined ? p.value : 0;
              res += `<br/>${marker}${p.seriesName}: <strong>${val.toLocaleString()}</strong>`;
            }
            return res;
          }
        },
        xAxis: {
          ...defaults.xAxis,
          type: 'category',
          data: labels,
          boundaryGap: false,
          axisLabel: {
            ...defaults.xAxis.axisLabel,
            interval: labels.length > 15 ? 'auto' : 0,
            rotate: labels.length > 15 ? 30 : 0
          },
          ...(options.xAxis || {})
        },
        yAxis: { ...defaults.yAxis, type: 'value', minInterval: 1, ...(options.yAxis || {}) },
        legend: series.length > 1 ? { textStyle: { color: defaults.textStyle.color, fontSize: 12 }, bottom: 0, type: 'scroll' } : undefined,
        series,
        ...(options.extra || {})
      }, true);

      this._scheduleResize(chart);
      return chart;
    },

    /**
     * Render Pie/Donut Chart
     */
    pie(container, data, options = {}) {
      const chart = this.create(container);
      if (!chart) return null;

      if (chart._isFallback) {
        chart.drawPie(data, options);
        return chart;
      }

      const defaults = this.getDefaults();
      const items = Array.isArray(data) ? data : (data.items || []);
      const isDark = WCA.Themes ? WCA.Themes.current === 'dark' : true;

      chart.setOption({
        ...defaults,
        tooltip: {
          ...defaults.tooltip,
          trigger: 'item',
          confine: true,
          formatter: function(params) {
            const marker = `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:${params.color || '#6c5ce7'};margin-right:6px;"></span>`;
            return `${marker}<strong>${params.name}</strong><br/>Messages: <strong>${params.value.toLocaleString()}</strong><br/>Share: <strong>${params.percent}%</strong>`;
          }
        },
        legend: {
          show: true,
          orient: options.legendOrient || 'horizontal',
          bottom: 0,
          left: 'center',
          textStyle: { color: defaults.textStyle.color, fontSize: 12 },
          type: 'scroll',
          ...(options.legend || {})
        },
        series: [{
          type: 'pie',
          radius: options.donut ? ['35%', '65%'] : '65%',
          center: ['50%', '45%'],
          data: items.map((d) => ({
            name: d.name,
            value: d.value,
            itemStyle: {
              borderRadius: 5,
              borderColor: isDark ? '#141424' : '#ffffff',
              borderWidth: 2
            }
          })),
          label: {
            show: options.showLabel !== false,
            color: defaults.textStyle.color,
            fontSize: 11,
            fontWeight: '500',
            formatter: '{b}\n{c} ({d}%)'
          },
          labelLine: {
            show: true,
            smooth: 0.2,
            length: 12,
            length2: 10
          },
          emphasis: {
            scale: true,
            scaleSize: 10,
            itemStyle: {
              shadowBlur: 20,
              shadowColor: 'rgba(0, 0, 0, 0.4)'
            },
            label: {
              show: true,
              fontSize: 13,
              fontWeight: 'bold'
            }
          },
          animationType: 'scale',
          animationEasing: 'elasticOut',
          ...(options.series || {})
        }],
        ...(options.extra || {})
      }, true);

      this._scheduleResize(chart);
      return chart;
    },

    /**
     * Render Heatmap Chart
     */
    heatmap(container, data, options = {}) {
      const chart = this.create(container);
      if (!chart) return null;

      if (chart._isFallback) {
        chart.drawHeatmap(data, options);
        return chart;
      }

      const defaults = this.getDefaults();
      const isDark = WCA.Themes ? WCA.Themes.current === 'dark' : true;
      const heatColors = isDark ? (WCA.Constants?.CHART_COLORS?.heatmap?.dark || ['#1a1a2e', '#6c5ce7', '#a29bfe']) : ['#f0f2f7', '#6c5ce7', '#3c2ab5'];

      chart.setOption({
        ...defaults,
        tooltip: {
          ...defaults.tooltip,
          position: 'top',
          formatter: options.tooltipFormatter || function(p) {
            return `${p.data[2]} messages`;
          }
        },
        xAxis: { ...defaults.xAxis, type: 'category', data: data.xLabels, splitArea: { show: true, areaStyle: { color: ['transparent'] } } },
        yAxis: { ...defaults.yAxis, type: 'category', data: data.yLabels, splitArea: { show: true, areaStyle: { color: ['transparent'] } } },
        visualMap: {
          min: data.min || 0, max: data.max || 100,
          calculable: true,
          orient: 'horizontal',
          left: 'center', bottom: 0,
          inRange: { color: heatColors },
          textStyle: { color: defaults.textStyle.color }
        },
        series: [{
          type: 'heatmap',
          data: data.values,
          label: { show: options.showLabel || false, color: defaults.textStyle.color, fontSize: 10 },
          emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' } },
          itemStyle: { borderRadius: 3 }
        }],
        ...(options.extra || {})
      }, true);

      this._scheduleResize(chart);
      return chart;
    },

    /**
     * Resize all chart instances
     */
    resizeAll() {
      for (const [el, chart] of instances) {
        if (el && document.body.contains(el)) {
          if (chart && typeof chart.resize === 'function') {
            try { chart.resize(); } catch (e) {}
          }
        }
      }
    },

    /**
     * Dispose a chart instance
     */
    dispose(container) {
      if (typeof container === 'string') container = document.getElementById(container);
      if (!container) return;

      if (typeof echarts !== 'undefined') {
        const chart = echarts.getInstanceByDom(container) || instances.get(container);
        if (chart) {
          try { chart.dispose(); } catch (e) {}
        }
      }

      if (resizeObservers.has(container)) {
        try { resizeObservers.get(container).disconnect(); } catch (e) {}
        resizeObservers.delete(container);
      }

      instances.delete(container);
    },

    /**
     * Dispose all chart instances
     */
    disposeAll() {
      for (const [container] of instances) {
        this.dispose(container);
      }
      instances.clear();
      resizeObservers.clear();
    },

    /**
     * Built-in HTML5 Canvas 2D Fallback Renderer
     * (Ensures charts ALWAYS draw even if ECharts CDN is offline/blocked)
     */
    _createCanvasFallback(container) {
      container.innerHTML = '';
      const canvas = document.createElement('canvas');
      canvas.width = container.clientWidth || 500;
      canvas.height = parseInt(container.style.height) || 300;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      container.appendChild(canvas);

      const ctx = canvas.getContext('2d');
      const isDark = WCA.Themes ? WCA.Themes.current === 'dark' : true;
      const textColor = isDark ? '#a0a0b8' : '#2d3748';
      const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

      return {
        _isFallback: true,
        resize() {
          canvas.width = container.clientWidth || 500;
          canvas.height = parseInt(container.style.height) || 300;
        },
        drawBar(data) {
          if (!ctx) return;
          const labels = data.labels || [];
          const values = data.values || [];
          const W = canvas.width, H = canvas.height;
          const padL = 50, padR = 20, padB = 40, padT = 30;
          const chartW = W - padL - padR, chartH = H - padB - padT;
          const maxVal = Math.max(...values, 1);

          ctx.clearRect(0, 0, W, H);
          ctx.strokeStyle = gridColor;
          ctx.lineWidth = 1;

          // Horizontal Grid lines
          for (let i = 0; i <= 4; i++) {
            const y = padT + chartH - (i / 4) * chartH;
            ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
            ctx.fillStyle = textColor; ctx.font = '11px sans-serif'; ctx.textAlign = 'right';
            ctx.fillText(Math.round((i / 4) * maxVal).toString(), padL - 8, y + 4);
          }

          // Bars
          const barWidth = Math.min(30, (chartW / labels.length) * 0.6);
          const step = chartW / labels.length;

          values.forEach((val, idx) => {
            const h = (val / maxVal) * chartH;
            const x = padL + idx * step + (step - barWidth) / 2;
            const y = padT + chartH - h;

            const grad = ctx.createLinearGradient(0, y, 0, y + h);
            grad.addColorStop(0, '#6c5ce7'); grad.addColorStop(1, '#a29bfe');
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, barWidth, h);

            // Label
            if (labels[idx] && (labels.length <= 12 || idx % 2 === 0)) {
              ctx.fillStyle = textColor; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
              ctx.fillText(labels[idx].toString(), x + barWidth / 2, H - 12);
            }
          });
        },
        drawLine(data) {
          if (!ctx) return;
          const labels = data.labels || [];
          const values = data.values || [];
          const W = canvas.width, H = canvas.height;
          const padL = 50, padR = 20, padB = 40, padT = 30;
          const chartW = W - padL - padR, chartH = H - padB - padT;
          const maxVal = Math.max(...values, 1);

          ctx.clearRect(0, 0, W, H);
          ctx.strokeStyle = gridColor; ctx.lineWidth = 1;

          for (let i = 0; i <= 4; i++) {
            const y = padT + chartH - (i / 4) * chartH;
            ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
            ctx.fillStyle = textColor; ctx.font = '11px sans-serif'; ctx.textAlign = 'right';
            ctx.fillText(Math.round((i / 4) * maxVal).toString(), padL - 8, y + 4);
          }

          if (values.length === 0) return;

          const step = chartW / Math.max(1, values.length - 1);
          ctx.beginPath();
          ctx.strokeStyle = '#6c5ce7';
          ctx.lineWidth = 3;

          values.forEach((val, idx) => {
            const x = padL + idx * step;
            const y = padT + chartH - (val / maxVal) * chartH;
            if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          });
          ctx.stroke();

          // Points
          values.forEach((val, idx) => {
            const x = padL + idx * step;
            const y = padT + chartH - (val / maxVal) * chartH;
            ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#6c5ce7'; ctx.fill();
          });
        },
        drawPie(data) {
          if (!ctx) return;
          const items = Array.isArray(data) ? data : (data.items || []);
          const W = canvas.width, H = canvas.height;
          const total = items.reduce((a, b) => a + (b.value || 0), 0);
          if (total === 0) return;

          ctx.clearRect(0, 0, W, H);
          let startAngle = -Math.PI / 2;
          const colors = ['#6c5ce7', '#00cec9', '#fdcb6e', '#e84393', '#00b894', '#e17055'];

          items.forEach((item, idx) => {
            const sliceAngle = (item.value / total) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(W / 2, H / 2, Math.min(W, H) * 0.35, startAngle, startAngle + sliceAngle);
            ctx.lineTo(W / 2, H / 2);
            ctx.fillStyle = colors[idx % colors.length];
            ctx.fill();
            startAngle += sliceAngle;
          });
        },
        drawHeatmap(data) {
          this.drawBar({ labels: data.xLabels, values: data.values.map(v => v[2]) });
        }
      };
    }
  };

  // Auto-resize on window resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => WCA.ChartFactory.resizeAll(), 150);
  });
})();
