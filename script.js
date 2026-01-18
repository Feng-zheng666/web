// 节点优选系统 - 前端交互脚本
document.addEventListener('DOMContentLoaded', function() {
    // 全局变量
    let nodesData = null;
    let currentFilter = 'all';
    let countries = new Set();
    
    // DOM元素
    const runnerIpElement = document.getElementById('runner-ip');
    const runnerLocationElement = document.getElementById('runner-location');
    const lastUpdateElement = document.getElementById('last-update');
    const onlineCountElement = document.getElementById('online-count');
    const countryCountElement = document.getElementById('country-count');
    const refreshButton = document.getElementById('refresh-btn');
    const countryFiltersContainer = document.getElementById('country-filters');
    const nodesContainer = document.getElementById('nodes-container');
    const copyNotification = document.getElementById('copy-notification');
    
    // 初始化
    init();
    
    // 初始化函数
    function init() {
        loadNodesData();
        setupEventListeners();
    }
    
    // 加载节点数据
    async function loadNodesData() {
        try {
            // 尝试从 nodes.json 加载数据
            const response = await fetch('nodes.json');
            if (!response.ok) {
                throw new Error('nodes.json 文件不存在或无法访问');
            }
            
            nodesData = await response.json();
            updateUI();
        } catch (error) {
            console.error('加载节点数据失败:', error);
            showErrorState();
        }
    }
    
    // 更新UI
    function updateUI() {
        if (!nodesData) return;
        
        // 更新服务器信息
        updateServerInfo();
        
        // 更新统计信息
        updateStats();
        
        // 更新国家过滤器
        updateCountryFilters();
        
        // 更新节点卡片
        updateNodesCards();
    }
    
    // 更新服务器信息
    function updateServerInfo() {
        const runner = nodesData.runner_ip || {};
        runnerIpElement.textContent = runner.query || '未知';
        runnerLocationElement.textContent = `位置: ${runner.country || '未知'} - ${runner.city || '未知'}`;
        lastUpdateElement.textContent = nodesData.updated_at || '--:--:--';
    }
    
    // 更新统计信息
    function updateStats() {
        if (!nodesData.nodes) return;
        
        const nodes = nodesData.nodes;
        onlineCountElement.textContent = nodes.length;
        
        // 计算不同国家数量
        countries.clear();
        nodes.forEach(node => {
            if (node.country && node.country !== 'Unknown') {
                countries.add(node.country);
            }
        });
        
        countryCountElement.textContent = countries.size;
    }
    
    // 更新国家过滤器
    function updateCountryFilters() {
        if (!nodesData.nodes) return;
        
        // 清空现有过滤器（保留"全部节点"）
        const filterAll = countryFiltersContainer.querySelector('.filter-all');
        countryFiltersContainer.innerHTML = '';
        countryFiltersContainer.appendChild(filterAll);
        
        // 按国家名称排序
        const sortedCountries = Array.from(countries).sort();
        
        // 添加国家过滤器
        sortedCountries.forEach(country => {
            const filterElement = document.createElement('div');
            filterElement.className = 'country-filter';
            filterElement.dataset.country = country;
            filterElement.innerHTML = `
                <i class="fas fa-flag"></i>
                <span>${country}</span>
            `;
            
            filterElement.addEventListener('click', () => {
                setActiveFilter(country);
            });
            
            countryFiltersContainer.appendChild(filterElement);
        });
    }
    
    // 设置活动过滤器
    function setActiveFilter(country) {
        currentFilter = country;
        
        // 更新过滤器样式
        document.querySelectorAll('.geo-filters > div').forEach(filter => {
            if (filter.dataset.country === country) {
                filter.classList.add('active');
            } else {
                filter.classList.remove('active');
            }
        });
        
        // 更新节点卡片
        updateNodesCards();
    }
    
    // 更新节点卡片
    function updateNodesCards() {
        if (!nodesData.nodes) return;
        
        // 清空容器
        nodesContainer.innerHTML = '';
        
        // 过滤节点
        let filteredNodes = nodesData.nodes;
        if (currentFilter !== 'all') {
            filteredNodes = nodesData.nodes.filter(node => node.country === currentFilter);
        }
        
        // 如果没有节点，显示空状态
        if (filteredNodes.length === 0) {
            const emptyCard = document.createElement('div');
            emptyCard.className = 'loading-card';
            emptyCard.innerHTML = `
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--cyber-yellow); margin-bottom: 20px;"></i>
                <p>${currentFilter === 'all' ? '没有找到可用节点' : `在 ${currentFilter} 中没有找到节点`}</p>
            `;
            nodesContainer.appendChild(emptyCard);
            return;
        }
        
        // 创建节点卡片
        filteredNodes.forEach(node => {
            const nodeCard = createNodeCard(node);
            nodesContainer.appendChild(nodeCard);
        });
    }
    
    // 创建节点卡片
    function createNodeCard(node) {
        const card = document.createElement('div');
        card.className = 'node-card';
        
        // 确定延迟类别和颜色
        const latencyClass = getLatencyClass(node.latency);
        const latencyColor = getLatencyColor(node.latency);
        
        card.innerHTML = `
            <div class="node-header">
                <div class="node-name">
                    <i class="fas fa-server"></i>
                    <span>${escapeHtml(node.name)}</span>
                </div>
                <div class="node-latency ${latencyClass}">
                    ${node.latency}ms
                </div>
            </div>
            
            <div class="node-details">
                <div class="detail-item">
                    <div class="detail-label">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>位置</span>
                    </div>
                    <div class="detail-value">
                        ${escapeHtml(node.country)} - ${escapeHtml(node.city)}
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">
                        <i class="fas fa-network-wired"></i>
                        <span>ISP</span>
                    </div>
                    <div class="detail-value">
                        ${escapeHtml(node.isp || '未知')}
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">
                        <i class="fas fa-link"></i>
                        <span>地址</span>
                    </div>
                    <div class="detail-value">
                        ${escapeHtml(node.host)}:${node.port}
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">
                        <i class="fas fa-bolt"></i>
                        <span>延迟状态</span>
                    </div>
                    <div class="detail-value">
                        <span style="color: ${latencyColor}">${getLatencyStatus(node.latency)}</span>
                    </div>
                </div>
            </div>
            
            <div class="node-actions">
                <button class="action-btn copy-btn" data-link="${escapeHtml(node.link)}">
                    <i class="fas fa-copy"></i>
                    <span>复制链接</span>
                </button>
                <button class="action-btn test-btn" data-host="${escapeHtml(node.host)}" data-port="${node.port}">
                    <i class="fas fa-play"></i>
                    <span>快速测试</span>
                </button>
            </div>
        `;
        
        // 添加事件监听器
        const copyBtn = card.querySelector('.copy-btn');
        const testBtn = card.querySelector('.test-btn');
        
        copyBtn.addEventListener('click', () => copyNodeLink(node.link));
        testBtn.addEventListener('click', () => quickTest(node.host, node.port));
        
        return card;
    }
    
    // 获取延迟类别
    function getLatencyClass(latency) {
        if (latency < 100) return 'latency-excellent';
        if (latency < 200) return 'latency-good';
        if (latency < 300) return 'latency-moderate';
        return 'latency-poor';
    }
    
    // 获取延迟颜色
    function getLatencyColor(latency) {
        if (latency < 100) return 'var(--delay-excellent)';
        if (latency < 200) return 'var(--delay-good)';
        if (latency < 300) return 'var(--delay-moderate)';
        return 'var(--delay-poor)';
    }
    
    // 获取延迟状态文本
    function getLatencyStatus(latency) {
        if (latency < 100) return '极速';
        if (latency < 200) return '良好';
        if (latency < 300) return '一般';
        return '较慢';
    }
    
    // 复制节点链接
    function copyNodeLink(link) {
        navigator.clipboard.writeText(link).then(() => {
            showCopyNotification();
        }).catch(err => {
            console.error('复制失败:', err);
            // 备用方法
            const textArea = document.createElement('textarea');
            textArea.value = link;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showCopyNotification();
        });
    }
    
    // 显示复制成功通知
    function showCopyNotification() {
        copyNotification.classList.add('show');
        setTimeout(() => {
            copyNotification.classList.remove('show');
        }, 3000);
    }
    
    // 快速测试节点
    function quickTest(host, port) {
        // 这里可以实现简单的ping测试
        // 由于浏览器限制，我们只能进行有限的测试
        alert(`快速测试 ${host}:${port}\n\n由于浏览器安全限制，完整的TCP测试需要在服务器端进行。\n当前延迟数据来自最近一次GitHub Actions测试。`);
    }
    
    // 设置事件监听器
    function setupEventListeners() {
        // 刷新按钮
        refreshButton.addEventListener('click', () => {
            refreshButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>更新中...</span>';
            refreshButton.disabled = true;
            
            // 模拟刷新过程
            setTimeout(() => {
                loadNodesData();
                refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i><span>手动更新</span>';
                refreshButton.disabled = false;
            }, 1000);
        });
        
        // 全部节点过滤器
        const filterAll = document.querySelector('.filter-all');
        filterAll.addEventListener('click', () => {
            setActiveFilter('all');
        });
        
        // 初始设置为全部节点
        setActiveFilter('all');
    }
    
    // 显示错误状态
    function showErrorState() {
        runnerIpElement.textContent = '数据加载失败';
        runnerLocationElement.textContent = '位置: 无法获取';
        lastUpdateElement.textContent = '--:--:--';
        onlineCountElement.textContent = '0';
        countryCountElement.textContent = '0';
        
        nodesContainer.innerHTML = `
            <div class="loading-card">
                <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: var(--cyber-red); margin-bottom: 20px;"></i>
                <p>无法加载节点数据</p>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 10px;">
                    请确保GitHub Actions已成功运行并生成nodes.json文件
                </p>
                <button id="retry-btn" class="cyber-button" style="margin-top: 20px;">
                    <i class="fas fa-redo"></i>
                    <span>重试加载</span>
                </button>
            </div>
        `;
        
        // 添加重试按钮事件监听器
        document.getElementById('retry-btn')?.addEventListener('click', loadNodesData);
    }
    
    // HTML转义函数
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // 自动刷新数据（每5分钟）
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            loadNodesData();
        }
    }, 5 * 60 * 1000);
});
