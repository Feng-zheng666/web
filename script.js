document.addEventListener('DOMContentLoaded', () => {
    let allNodes = [];
    
    async function fetchData() {
        try {
            const resp = await fetch('nodes.json');
            const data = await resp.json();
            allNodes = data.nodes;
            
            updateHeader(data.server_info);
            updateStats(data.nodes);
            renderFilters(data.nodes);
            renderNodes(data.nodes);
        } catch (e) {
            document.getElementById('nodes-container').innerHTML = '<p class="error">数据加载失败，请检查配置文件</p>';
        }
    }

    function updateHeader(info) {
        document.getElementById('runner-ip').textContent = `分析源: ${info.location} (${info.ip})`;
        document.getElementById('update-time').textContent = `最后更新: ${info.timestamp}`;
    }

    function updateStats(nodes) {
        document.getElementById('node-count').textContent = nodes.length;
        const countries = new Set(nodes.map(n => n.country));
        document.getElementById('country-count').textContent = countries.size;
        const avg = nodes.length ? Math.round(nodes.reduce((s, n) => s + n.latency, 0) / nodes.length) : 0;
        document.getElementById('avg-latency').textContent = `${avg}ms`;
    }

    function renderFilters(nodes) {
        const countries = ['all', ...new Set(nodes.map(n => n.country))];
        const container = document.getElementById('country-filters');
        container.innerHTML = countries.map(c => `
            <button class="filter-btn ${c === 'all' ? 'active' : ''}" data-country="${c}">
                ${c === 'all' ? '全部' : c}
            </button>
        `).join('');

        container.querySelectorAll('.filter-btn').forEach(btn => {
            btn.onclick = () => {
                container.querySelector('.active').classList.remove('active');
                btn.classList.add('active');
                filterNodes();
            };
        });
    }

    function renderNodes(nodes) {
        const container = document.getElementById('nodes-container');
        if (!nodes.length) {
            container.innerHTML = '<div class="no-results">未匹配到符合条件的节点</div>';
            return;
        }

        container.innerHTML = nodes.map(node => `
            <div class="node-card" onclick="copyToClipboard('${node.raw}')">
                <div class="node-header">
                    <span class="protocol-tag">${node.protocol}</span>
                    <span class="latency-tag ${getLatencyClass(node.latency)}">${node.latency}ms</span>
                </div>
                <div class="node-body">
                    <h3>${node.name}</h3>
                    <p><i class="fas fa-map-marker-alt"></i> ${node.country} - ${node.city}</p>
                    <p><i class="fas fa-broadcast-tower"></i> ${node.isp}</p>
                </div>
                <div class="node-footer">
                    <span>${node.address}</span>
                    <i class="fas fa-copy"></i>
                </div>
            </div>
        `).join('');
    }

    function getLatencyClass(l) {
        if (l < 100) return 'low';
        if (l < 250) return 'mid';
        return 'high';
    }

    function filterNodes() {
        const searchTerm = document.getElementById('node-search').value.toLowerCase();
        const countryFilter = document.querySelector('.filter-btn.active').dataset.country;

        const filtered = allNodes.filter(n => {
            const matchesSearch = n.name.toLowerCase().includes(searchTerm) || 
                                n.isp.toLowerCase().includes(searchTerm) ||
                                n.country.toLowerCase().includes(searchTerm);
            const matchesCountry = countryFilter === 'all' || n.country === countryFilter;
            return matchesSearch && matchesCountry;
        });
        renderNodes(filtered);
    }

    window.copyToClipboard = (text) => {
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        
        const toast = document.getElementById('toast');
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    };

    document.getElementById('node-search').oninput = filterNodes;
    fetchData();
});