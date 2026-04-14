// Analytics — D3.js-based scan analytics module

const Analytics = {
  _statsCache: null,
  _currentDays: 30,
  _currentQrId: null,
  _mapInstance: null,
  _heatLayer: null,
  _tileLayer: null,

  // ── Color palette (Tailwind-consistent) ──

  _palette: ['#6366f1', '#10b981', '#f59e0b', '#0ea5e9', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280'],

  _theme() {
    const dark = document.documentElement.classList.contains('dark');
    return {
      text: dark ? '#e2e8f0' : '#111827',
      subtext: dark ? '#94a3b8' : '#6b7280',
      grid: dark ? '#334155' : '#e5e7eb',
      line: dark ? '#818cf8' : '#6366f1',
      area: dark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
    };
  },

  // ── Data fetching ──

  async loadStats(userId, qrId, days) {
    this._currentDays = days || 30;
    this._currentQrId = qrId || null;
    const [stats, topQR, geo] = await Promise.all([
      DB.getScanStats(userId, qrId, days),
      qrId ? Promise.resolve([]) : DB.getTopQR(userId, 10),
      DB.getGeoStats(userId, qrId, days)
    ]);
    this._statsCache = { stats, topQR, geo };
    return this._statsCache;
  },

  // ── Render all ──

  async renderAll(userId, qrId, days) {
    const data = await this.loadStats(userId, qrId, days);
    this.renderKPIs(data.stats, data.topQR);
    this.renderLineChart(data.stats.daily);
    this.renderPieChart(data.stats.devices);
    this.renderBarChart(data.stats.browsers);
    if (!qrId) this.renderTopChart(data.topQR);
    if (data.geo) {
      this.renderMap(data.geo.locations || []);
      this.renderGeoTable(data.geo.countries || [], data.geo.cities || []);
    }
  },

  reRender() {
    if (!this._statsCache) return;
    const { stats, topQR, geo } = this._statsCache;
    this.renderKPIs(stats, topQR);
    this.renderLineChart(stats.daily);
    this.renderPieChart(stats.devices);
    this.renderBarChart(stats.browsers);
    if (!this._currentQrId) this.renderTopChart(topQR);
    if (geo) {
      this._updateMapTiles();
      this.renderGeoTable(geo.countries || [], geo.cities || []);
    }
  },

  // ── KPIs ──

  renderKPIs(stats, topQR) {
    const t = stats.totals;
    const topName = topQR.length ? topQR[0].name : '—';
    const kpis = [
      { label: 'Total escaneos', value: t.total },
      { label: 'Escaneos hoy', value: t.today },
      { label: 'Promedio diario', value: t.avg_daily },
      { label: 'QR más popular', value: topName },
    ];
    const $c = $('#analytics-kpis').empty();
    kpis.forEach(k => {
      $c.append(
        '<div class="bg-white rounded-lg border border-gray-200 p-4 dark:bg-slate-900 dark:border-slate-800">' +
          '<p class="text-sm text-gray-500 dark:text-slate-400">' + k.label + '</p>' +
          '<p class="text-2xl font-bold text-gray-900 mt-1 truncate dark:text-slate-100">' + k.value + '</p>' +
        '</div>'
      );
    });
  },

  // ── Line chart (escaneos por día) ──

  renderLineChart(dailyData) {
    const container = '#chart-line';
    d3.select(container).selectAll('*').remove();
    if (!dailyData.length) {
      d3.select(container).append('p').attr('class', 'text-sm text-gray-400 dark:text-slate-500 text-center py-8').text('Sin datos de escaneo');
      return;
    }

    const theme = this._theme();
    const margin = { top: 20, right: 20, bottom: 40, left: 45 };
    const width = 700;
    const height = 280;
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const data = dailyData.map(d => ({ date: new Date(d.date + 'T00:00:00'), count: d.count }));

    const svg = d3.select(container).append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('class', 'w-full h-auto');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.date))
      .range([0, innerW]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count) || 1])
      .nice()
      .range([innerH, 0]);

    // Grid lines
    g.append('g').attr('class', 'grid')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(6).tickSize(-innerH).tickFormat(''))
      .selectAll('line').attr('stroke', theme.grid).attr('stroke-dasharray', '3,3');
    g.selectAll('.grid .domain').remove();

    g.append('g').attr('class', 'grid')
      .call(d3.axisLeft(y).ticks(5).tickSize(-innerW).tickFormat(''))
      .selectAll('line').attr('stroke', theme.grid).attr('stroke-dasharray', '3,3');
    g.selectAll('.grid .domain').remove();

    // Area
    const area = d3.area()
      .x(d => x(d.date))
      .y0(innerH)
      .y1(d => y(d.count))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('fill', theme.area)
      .attr('d', area);

    // Line
    const line = d3.line()
      .x(d => x(d.date))
      .y(d => y(d.count))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', theme.line)
      .attr('stroke-width', 2.5)
      .attr('d', line);

    // Dots
    g.selectAll('.dot')
      .data(data)
      .enter().append('circle')
      .attr('cx', d => x(d.date))
      .attr('cy', d => y(d.count))
      .attr('r', 3.5)
      .attr('fill', theme.line)
      .attr('stroke', 'white')
      .attr('stroke-width', 1.5);

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat('%d/%m')))
      .selectAll('text').attr('fill', theme.subtext).attr('font-size', '11px');
    g.selectAll('.domain').attr('stroke', theme.grid);

    g.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('d')))
      .selectAll('text').attr('fill', theme.subtext).attr('font-size', '11px');

    // Tooltip
    const tooltip = d3.select(container).append('div')
      .attr('class', 'absolute hidden bg-gray-900 text-white text-xs rounded px-2 py-1 pointer-events-none dark:bg-slate-700')
      .style('z-index', '10');

    const containerNode = d3.select(container).node();
    g.selectAll('circle')
      .on('mouseover', function (event, d) {
        const [mx, my] = d3.pointer(event, containerNode);
        tooltip.classed('hidden', false)
          .html(d.date.toLocaleDateString('es') + ': <b>' + d.count + '</b>')
          .style('left', mx + 'px').style('top', (my - 30) + 'px');
        d3.select(this).attr('r', 5);
      })
      .on('mouseout', function () {
        tooltip.classed('hidden', true);
        d3.select(this).attr('r', 3.5);
      });
  },

  // ── Pie chart (dispositivos) ──

  renderPieChart(deviceData) {
    const container = '#chart-pie';
    d3.select(container).selectAll('*').remove();
    if (!deviceData.length) {
      d3.select(container).append('p').attr('class', 'text-sm text-gray-400 dark:text-slate-500 text-center py-8').text('Sin datos');
      return;
    }

    const theme = this._theme();
    const palette = this._palette;
    const size = 240;
    const radius = size / 2;

    const svg = d3.select(container).append('svg')
      .attr('viewBox', `0 0 ${size} ${size}`)
      .attr('class', 'w-full h-auto max-w-[240px] mx-auto');

    const g = svg.append('g').attr('transform', `translate(${radius},${radius})`);

    const pie = d3.pie().value(d => d.count).sort(null);
    const arc = d3.arc().innerRadius(radius * 0.45).outerRadius(radius - 10);

    const arcs = g.selectAll('.arc')
      .data(pie(deviceData))
      .enter().append('g');

    arcs.append('path')
      .attr('d', arc)
      .attr('fill', (d, i) => palette[i % palette.length])
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .transition().duration(400)
      .attrTween('d', function (d) {
        const interp = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return t => arc(interp(t));
      });

    // Legend
    const legend = d3.select(container).append('div')
      .attr('class', 'flex flex-wrap justify-center gap-3 mt-3');

    deviceData.forEach((d, i) => {
      legend.append('span')
        .attr('class', 'inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-300')
        .html('<span class="w-2.5 h-2.5 rounded-full inline-block" style="background:' + palette[i % palette.length] + '"></span>' + d.type + ' (' + d.count + ')');
    });
  },

  // ── Bar chart (navegadores) ──

  renderBarChart(browserData) {
    const container = '#chart-bar';
    d3.select(container).selectAll('*').remove();
    if (!browserData.length) {
      d3.select(container).append('p').attr('class', 'text-sm text-gray-400 dark:text-slate-500 text-center py-8').text('Sin datos');
      return;
    }

    const theme = this._theme();
    const palette = this._palette;
    const margin = { top: 10, right: 20, bottom: 40, left: 45 };
    const width = 400;
    const barHeight = 32;
    const height = margin.top + margin.bottom + browserData.length * barHeight;
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const data = browserData.sort((a, b) => b.count - a.count);

    const svg = d3.select(container).append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('class', 'w-full h-auto');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count) || 1])
      .nice()
      .range([0, innerW]);

    const y = d3.scaleBand()
      .domain(data.map(d => d.name))
      .range([0, innerH])
      .padding(0.25);

    // Bars
    g.selectAll('rect')
      .data(data)
      .enter().append('rect')
      .attr('x', 0)
      .attr('y', d => y(d.name))
      .attr('height', y.bandwidth())
      .attr('rx', 4)
      .attr('fill', (d, i) => palette[i % palette.length])
      .transition().duration(400)
      .attr('width', d => x(d.count));

    // Labels
    g.selectAll('.label')
      .data(data)
      .enter().append('text')
      .attr('x', d => x(d.count) + 6)
      .attr('y', d => y(d.name) + y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('fill', theme.subtext)
      .attr('font-size', '11px')
      .text(d => d.count);

    // Y axis
    g.append('g')
      .call(d3.axisLeft(y).tickSize(0))
      .selectAll('text').attr('fill', theme.text).attr('font-size', '12px');
    g.selectAll('.domain').attr('stroke', theme.grid);
  },

  // ── Top QR horizontal bar chart ──

  renderTopChart(topItems) {
    const container = '#chart-top';
    d3.select(container).selectAll('*').remove();
    if (!topItems.length) {
      d3.select(container).append('p').attr('class', 'text-sm text-gray-400 dark:text-slate-500 text-center py-8').text('Sin datos de escaneo');
      return;
    }

    const theme = this._theme();
    const margin = { top: 10, right: 50, bottom: 10, left: 150 };
    const barHeight = 30;
    const height = margin.top + margin.bottom + topItems.length * barHeight;
    const width = 600;
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(container).append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('class', 'w-full h-auto');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
      .domain([0, d3.max(topItems, d => d.scan_count) || 1])
      .nice()
      .range([0, innerW]);

    const y = d3.scaleBand()
      .domain(topItems.map(d => d.name))
      .range([0, innerH])
      .padding(0.2);

    // Bars
    g.selectAll('rect')
      .data(topItems)
      .enter().append('rect')
      .attr('x', 0)
      .attr('y', d => y(d.name))
      .attr('height', y.bandwidth())
      .attr('rx', 4)
      .attr('fill', this._theme().line)
      .attr('opacity', 0.85)
      .transition().duration(400)
      .attr('width', d => x(d.scan_count));

    // Values
    g.selectAll('.val')
      .data(topItems)
      .enter().append('text')
      .attr('x', d => x(d.scan_count) + 6)
      .attr('y', d => y(d.name) + y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('fill', theme.subtext)
      .attr('font-size', '11px')
      .text(d => d.scan_count);

    // Names
    g.append('g')
      .call(d3.axisLeft(y).tickSize(0))
      .selectAll('text')
      .attr('fill', theme.text)
      .attr('font-size', '12px')
      .each(function () {
        const text = d3.select(this);
        if (text.text().length > 20) text.text(text.text().slice(0, 18) + '...');
      });
    g.selectAll('.domain').remove();
  },

  // ── Geo map (Leaflet + heatmap) ──

  _getTileUrl() {
    const dark = document.documentElement.classList.contains('dark');
    return dark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  },

  _updateMapTiles() {
    if (!this._mapInstance || !this._tileLayer) return;
    this._tileLayer.setUrl(this._getTileUrl());
  },

  renderMap(locations) {
    const container = 'geo-map';
    if (!this._mapInstance) {
      this._mapInstance = L.map(container, { scrollWheelZoom: true, zoomControl: true }).setView([20, 0], 2);
      this._tileLayer = L.tileLayer(this._getTileUrl(), {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 18
      }).addTo(this._mapInstance);
    } else {
      if (this._heatLayer) {
        this._mapInstance.removeLayer(this._heatLayer);
        this._heatLayer = null;
      }
      this._tileLayer.setUrl(this._getTileUrl());
    }

    if (!locations.length) {
      this._mapInstance.setView([20, 0], 2);
      return;
    }

    const points = locations.map(l => [l.lat, l.lon, l.count]);
    this._heatLayer = L.heatLayer(points, {
      radius: 20,
      blur: 15,
      maxZoom: 10,
      gradient: { 0.2: '#6366f1', 0.4: '#10b981', 0.6: '#f59e0b', 0.8: '#ef4444', 1: '#dc2626' }
    }).addTo(this._mapInstance);

    const bounds = L.latLngBounds(locations.map(l => [l.lat, l.lon]));
    this._mapInstance.fitBounds(bounds, { padding: [30, 30], maxZoom: 6 });
  },

  // ── Geo tables (countries + cities) ──

  renderGeoTable(countries, cities) {
    const dark = document.documentElement.classList.contains('dark');
    const rowClass = dark
      ? 'flex items-center justify-between py-2 border-b border-slate-800 last:border-0'
      : 'flex items-center justify-between py-2 border-b border-gray-100 last:border-0';
    const nameClass = dark ? 'text-sm text-slate-200' : 'text-sm text-gray-700';
    const countClass = dark ? 'text-sm font-medium text-indigo-300' : 'text-sm font-medium text-indigo-600';
    const emptyClass = dark ? 'text-sm text-slate-500 text-center py-4' : 'text-sm text-gray-400 text-center py-4';

    // Countries
    const $countries = $('#geo-countries').empty();
    if (!countries.length) {
      $countries.append('<p class="' + emptyClass + '">Sin datos de ubicacion</p>');
    } else {
      countries.slice(0, 10).forEach(c => {
        $countries.append(
          '<div class="' + rowClass + '">' +
            '<span class="' + nameClass + '">' + (c.country || 'Unknown') + '</span>' +
            '<span class="' + countClass + '">' + c.count + '</span>' +
          '</div>'
        );
      });
    }

    // Cities
    const $cities = $('#geo-cities').empty();
    if (!cities.length) {
      $cities.append('<p class="' + emptyClass + '">Sin datos de ubicacion</p>');
    } else {
      cities.slice(0, 10).forEach(c => {
        const label = (c.city || 'Unknown') + (c.country && c.country !== 'Unknown' ? ', ' + c.country : '');
        $cities.append(
          '<div class="' + rowClass + '">' +
            '<span class="' + nameClass + ' truncate mr-2">' + label + '</span>' +
            '<span class="' + countClass + ' flex-shrink-0">' + c.count + '</span>' +
          '</div>'
        );
      });
    }
  }
};
