const API_BASE = 'http://127.0.0.1:8000';
let currentData = null;
let currentFilters = {};
let liveDashboardInterval = null;
let isLiveDashboardActive = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    loadInitialData();
    populateFilters();
    caseStudyManager.loadCaseStudies();
});

async function loadInitialData() {
    try {
        const response = await fetch(`${API_BASE}/sales/products`);
        const products = await response.json();
        currentData = products;
        renderSalesChart(products);
        populateProductSelect(products);
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function populateFilters() {
    // Populate regions
    fetch(`${API_BASE}/sales/regions`)
        .then(response => response.json())
        .then(regions => {
            const regionSelect = document.getElementById('regionFilter');
            regions.forEach(region => {
                const option = document.createElement('option');
                option.value = region;
                option.textContent = region;
                regionSelect.appendChild(option);
            });
        });

    // Populate categories
    fetch(`${API_BASE}/sales/categories`)
        .then(response => response.json())
        .then(categories => {
            const categorySelect = document.getElementById('categoryFilter');
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            });
        });

    // Populate months
    fetch(`${API_BASE}/sales/months`)
        .then(response => response.json())
        .then(months => {
            const monthSelect = document.getElementById('monthFilter');
            months.forEach(month => {
                const option = document.createElement('option');
                option.value = month;
                option.textContent = month;
                monthSelect.appendChild(option);
            });
        });
}

function populateProductSelect(products) {
    const productSelect = document.getElementById('productSelect');
    products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = product.name;
        productSelect.appendChild(option);
    });
}

function renderSalesChart(products) {
    const chartContainer = document.querySelector('#chart-container');
    
    // Clear existing chart
    chartContainer.innerHTML = '';
    
    // Calculate total revenue for scaling
    let totalRevenue = 0;
    products.forEach(product => {
        product.sales_data.forEach(sale => {
            totalRevenue += sale.revenue;
        });
    });
    
    const maxRevenue = Math.max(...products.flatMap(p => p.sales_data.map(s => s.revenue)));
    const scale = 2 / maxRevenue; // Scale to max 2 units height (much shorter bars)
    
    // Create 3D bars for each product
    products.forEach((product, productIndex) => {
        const productRevenue = product.sales_data.reduce((sum, sale) => sum + sale.revenue, 0);
        const height = productRevenue * scale;
        
        // Create main product bar
        const bar = document.createElement('a-box');
        bar.setAttribute('color', getProductColor(product.category));
        bar.setAttribute('height', height);
        bar.setAttribute('depth', 0.8);
        bar.setAttribute('width', 0.8);
        bar.setAttribute('position', `${productIndex * 2 - 3} ${height / 2} 0`);
        bar.setAttribute('class', 'product-bar');
        bar.setAttribute('data-product-id', product.id);
        bar.setAttribute('data-product-name', product.name);
        
        // Add click event for interactivity
        bar.addEventListener('click', () => {
            showProductDetails(product);
        });
        
        chartContainer.appendChild(bar);
        
        // Add product name label (positioned at accessible height)
        const nameText = document.createElement('a-text');
        nameText.setAttribute('value', product.name);
        nameText.setAttribute('position', `${productIndex * 2 - 3} ${Math.max(1.8, height + 0.3)} 0`);
        nameText.setAttribute('align', 'center');
        nameText.setAttribute('scale', '0.6 0.6 0.6');
        nameText.setAttribute('color', '#ffffff');
        chartContainer.appendChild(nameText);
        
        // Add revenue label (positioned at accessible height)
        const revenueText = document.createElement('a-text');
        revenueText.setAttribute('value', `R${(productRevenue / 1000).toFixed(0)}K`);
        revenueText.setAttribute('position', `${productIndex * 2 - 3} ${Math.max(1.6, height + 0.1)} 0`);
        revenueText.setAttribute('align', 'center');
        revenueText.setAttribute('scale', '0.5 0.5 0.5');
        revenueText.setAttribute('color', '#4CC3D9');
        chartContainer.appendChild(revenueText);
    });
}

function getProductColor(category) {
    const colors = {
        'Electronics': '#4CC3D9',
        'Accessories': '#FF6B6B',
        'Gaming': '#4ECDC4',
        'Home': '#45B7D1'
    };
    return colors[category] || '#95A5A6';
}

function showProductDetails(product) {
    alert(`Product: ${product.name}\nCategory: ${product.category}\nBase Price: R${product.base_price.toLocaleString()}\nTotal Sales: ${product.sales_data.length} records`);
}

async function applyFilters() {
    const filters = {
        region: document.getElementById('regionFilter').value || null,
        category: document.getElementById('categoryFilter').value || null,
        month: document.getElementById('monthFilter').value || null
    };
    
    currentFilters = filters;
    
    try {
        const response = await fetch(`${API_BASE}/sales/filter`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(filters)
        });
        
        const result = await response.json();
        renderSalesChart(result.products);
    } catch (error) {
        console.error('Error applying filters:', error);
    }
}

function resetFilters() {
    document.getElementById('regionFilter').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('monthFilter').value = '';
    currentFilters = {};
    renderSalesChart(currentData);
}

async function showSummary() {
    try {
        const response = await fetch(`${API_BASE}/sales/summary`);
        const summary = await response.json();
        
        alert(`Sales Summary:\n\nTotal Revenue: R${summary.total_revenue.toLocaleString()}\nTotal Sales: ${summary.total_sales} units\nAverage Order Value: R${summary.average_order_value.toLocaleString()}\n\nRegions:\n${Object.entries(summary.region_breakdown).map(([region, data]) => `${region}: R${data.revenue.toLocaleString()}`).join('\n')}`);
    } catch (error) {
        console.error('Error loading summary:', error);
    }
}

async function makePrediction() {
    const productId = document.getElementById('productSelect').value;
    const region = document.getElementById('predictionRegion').value;
    const priceChange = parseFloat(document.getElementById('priceChange').value);
    const marketingChange = parseFloat(document.getElementById('marketingChange').value);
    
    if (!productId) {
        alert('Please select a product');
        return;
    }
    
    if (!region) {
        alert('Please select a province');
        return;
    }
    
    console.log('Making prediction with:', { productId, region, priceChange, marketingChange });
    
    try {
        const response = await fetch(`${API_BASE}/sales/predict`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                product_id: parseInt(productId),
                region: region,
                months_ahead: 1,
                price_change_percent: priceChange,
                marketing_budget_change: marketingChange
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error: ${errorData.detail || response.statusText}`);
        }
        
        const prediction = await response.json();
        
        // Display prediction result
        const resultDiv = document.getElementById('predictionResult');
        const contentDiv = document.getElementById('predictionContent');
        
        contentDiv.innerHTML = `
            <strong>${prediction.product_name}</strong><br>
            Province: ${prediction.region}<br>
            Predicted Sales: ${prediction.predicted_sales} units<br>
            Predicted Revenue: R${prediction.predicted_revenue ? prediction.predicted_revenue.toLocaleString() : 'N/A'}<br>
            Confidence: ${prediction.confidence}<br>
            Trend: ${prediction.factors.trend}<br>
            <small style="color: #666;">Based on South African market data</small>
        `;
        
        resultDiv.style.display = 'block';
        
        // Add prediction bar to the chart
        addPredictionToChart(prediction);
        
    } catch (error) {
        console.error('Error making prediction:', error);
        alert('Error making prediction: ' + error.message);
    }
}

function addPredictionToChart(prediction) {
    const predictionContainer = document.querySelector('#prediction-container');
    
    // Remove any existing prediction bars first
    const existingPredictions = predictionContainer.querySelectorAll('[data-prediction="true"]');
    existingPredictions.forEach(el => el.remove());
    
    // Create a glowing prediction bar in separate container
    const predictionBar = document.createElement('a-box');
    predictionBar.setAttribute('data-prediction', 'true');
    predictionBar.setAttribute('color', '#FFD700');
    
    // Better scaling for prediction bar height
    const maxSales = 200; // Assume max sales around 200 for scaling
    const barHeight = Math.max(0.3, Math.min(3, (prediction.predicted_sales / maxSales) * 3));
    const barY = barHeight / 2; // Position bar so it sits on ground
    
    predictionBar.setAttribute('height', barHeight);
    predictionBar.setAttribute('depth', 0.6);
    predictionBar.setAttribute('width', 0.6);
    predictionBar.setAttribute('position', `0 ${barY} 0`); // Position relative to prediction container
    predictionBar.setAttribute('animation', 'property: rotation; to: 0 360 0; loop: true; dur: 10000');
    predictionBar.setAttribute('opacity', '0.9');
    
    predictionContainer.appendChild(predictionBar);
    
    // Add prediction label - positioned at accessible height
    const predictionText = document.createElement('a-text');
    predictionText.setAttribute('data-prediction', 'true');
    predictionText.setAttribute('value', `🔮 AI Prediction: ${prediction.predicted_sales} units`);
    predictionText.setAttribute('position', `0 ${Math.max(1.8, barY + barHeight/2 + 0.3)} 0`); // At accessible height
    predictionText.setAttribute('align', 'center');
    predictionText.setAttribute('scale', '0.5 0.5 0.5');
    predictionText.setAttribute('color', '#FFD700');
    predictionText.setAttribute('background-color', 'rgba(0,0,0,0.8)');
    predictionContainer.appendChild(predictionText);
    
    // Add revenue label at accessible height
    const revenueText = document.createElement('a-text');
    revenueText.setAttribute('data-prediction', 'true');
    revenueText.setAttribute('value', `R${prediction.predicted_revenue ? prediction.predicted_revenue.toLocaleString() : 'N/A'}`);
    revenueText.setAttribute('position', `0 ${Math.max(1.5, barY + barHeight/2 + 0.1)} 0`); // At accessible height
    revenueText.setAttribute('align', 'center');
    revenueText.setAttribute('scale', '0.4 0.4 0.4');
    revenueText.setAttribute('color', '#FFD700');
    revenueText.setAttribute('background-color', 'rgba(0,0,0,0.8)');
    predictionContainer.appendChild(revenueText);
}

// Live Dashboard Functions
function toggleLiveDashboard() {
    const dashboardPanel = document.getElementById('live-dashboard-panel');
    
    if (isLiveDashboardActive) {
        // Stop live dashboard
        if (liveDashboardInterval) {
            clearInterval(liveDashboardInterval);
            liveDashboardInterval = null;
        }
        dashboardPanel.style.display = 'none';
        isLiveDashboardActive = false;
    } else {
        // Start live dashboard
        dashboardPanel.style.display = 'block';
        isLiveDashboardActive = true;
        startLiveDashboard();
    }
}

function startLiveDashboard() {
    // Initial load
    updateLiveDashboard();
    
    // Update every 5 seconds
    liveDashboardInterval = setInterval(updateLiveDashboard, 5000);
}

async function updateLiveDashboard() {
    try {
        // Update live metrics
        const metricsResponse = await fetch(`${API_BASE}/dashboard/metrics`);
        const metrics = await metricsResponse.json();
        
        document.getElementById('live-revenue').textContent = `R${metrics.total_revenue.toLocaleString()}`;
        document.getElementById('live-sales').textContent = `${metrics.total_sales} units`;
        document.getElementById('live-users').textContent = metrics.active_users;
        document.getElementById('live-conversion').textContent = `${metrics.conversion_rate}%`;
        document.getElementById('live-aov').textContent = `R${metrics.avg_order_value.toLocaleString()}`;
        
        // Update trending products
        const trendingResponse = await fetch(`${API_BASE}/dashboard/trending`);
        const trendingData = await trendingResponse.json();
        
        const trendingList = document.getElementById('trending-list');
        trendingList.innerHTML = '';
        trendingData.trending_products.forEach((product, index) => {
            const item = document.createElement('div');
            item.innerHTML = `${index + 1}. ${product[0]}: ${product[1]} units`;
            trendingList.appendChild(item);
        });
        
        // Update regional performance
        const regionalResponse = await fetch(`${API_BASE}/dashboard/regional`);
        const regionalData = await regionalResponse.json();
        
        const regionalList = document.getElementById('regional-list');
        regionalList.innerHTML = '';
        Object.entries(regionalData.regional_performance).forEach(([region, data]) => {
            const item = document.createElement('div');
            item.innerHTML = `${region}: R${data.revenue.toLocaleString()} (${data.sales} units)`;
            regionalList.appendChild(item);
        });
        
        // Update timestamp
        const now = new Date();
        document.getElementById('last-update').textContent = `Last updated: ${now.toLocaleTimeString()}`;
        
        // Update live status
        document.getElementById('live-status').textContent = '🟢 Live';
        
    } catch (error) {
        console.error('Error updating live dashboard:', error);
        document.getElementById('live-status').textContent = '🔴 Error';
    }
}

// Advanced Visualization Functions
function toggleAdvancedViz() {
    const vizPanel = document.getElementById('advanced-viz-panel');

    if (vizPanel.style.display === 'none' || vizPanel.style.display === '') {
        vizPanel.style.display = 'block';
    } else {
        vizPanel.style.display = 'none';
        // Clear advanced visualizations when closing
        clearAdvancedViz();
    }
}

function clearAdvancedViz() {
    const vizContainer = document.querySelector('#advanced-viz-container');
    const existingViz = vizContainer.querySelectorAll('[data-viz="true"]');
    existingViz.forEach(el => el.remove());
}

// Fetch fresh sales data for advanced visualizations
async function fetchSalesDataForViz() {
    try {
        const response = await fetch(`${API_BASE}/data`);
        const data = await response.json();
        return data.products;
    } catch (error) {
        console.error('Error fetching sales data for visualization:', error);
        return [];
    }
}

async function createHeatMap() {
    const vizContainer = document.querySelector('#advanced-viz-container');

    // Clear existing visualizations
    const existingViz = vizContainer.querySelectorAll('[data-viz="true"]');
    existingViz.forEach(el => el.remove());
    
    // Fetch fresh data
    const products = await fetchSalesDataForViz();
    if (products.length === 0) {
        console.error('No data available for heat map');
        return;
    }
    
    // Add title
    const title = document.createElement('a-text');
    title.setAttribute('data-viz', 'true');
    title.setAttribute('value', '🔥 REVENUE HEAT MAP\n(Intensity by Region-Product)');
    title.setAttribute('position', '0 2.5 0');
    title.setAttribute('align', 'center');
    title.setAttribute('scale', '0.4 0.4 0.4');
    title.setAttribute('color', '#FFD700');
    vizContainer.appendChild(title);
    
    // Create heat map grid
    const regions = ['Gauteng', 'Western Cape', 'KwaZulu-Natal'];
    const productNames = products.map(p => p.name);

    // Find max revenue for normalization
    let maxRevenue = 0;
    products.forEach(product => {
        product.sales_data.forEach(sale => {
            if (sale.revenue > maxRevenue) maxRevenue = sale.revenue;
        });
    });

    // Add region labels on the left side
    regions.forEach((region, regionIndex) => {
        const regionLabel = document.createElement('a-text');
        regionLabel.setAttribute('data-viz', 'true');
        regionLabel.setAttribute('value', region);
        regionLabel.setAttribute('position', `-3.5 ${1.5 - regionIndex * 0.8} 0`);
        regionLabel.setAttribute('align', 'center');
        regionLabel.setAttribute('scale', '0.3 0.3 0.3');
        regionLabel.setAttribute('color', '#ffffff');
        vizContainer.appendChild(regionLabel);
    });

    // Add product labels on the top
    productNames.forEach((productName, productIndex) => {
        const productLabel = document.createElement('a-text');
        productLabel.setAttribute('data-viz', 'true');
        productLabel.setAttribute('value', productName);
        productLabel.setAttribute('position', `${productIndex * 1.2 - 1.8} 2.2 0`);
        productLabel.setAttribute('align', 'center');
        productLabel.setAttribute('scale', '0.25 0.25 0.25');
        productLabel.setAttribute('color', '#4CC3D9');
        vizContainer.appendChild(productLabel);
    });

    regions.forEach((region, regionIndex) => {
        productNames.forEach((productName, productIndex) => {
            // Calculate revenue for this region-product combination
            const productData = products.find(p => p.name === productName);
            if (productData) {
                const regionSales = productData.sales_data.find(s => s.region === region);
                if (regionSales) {
                    const intensity = regionSales.revenue / maxRevenue; // Normalize to 0-1
                    const color = getHeatMapColor(intensity);

                    // Create heat map cell
                    const cell = document.createElement('a-box');
                    cell.setAttribute('data-viz', 'true');
                    cell.setAttribute('color', color);
                    cell.setAttribute('width', 0.8);
                    cell.setAttribute('height', 0.1);
                    cell.setAttribute('depth', 0.8);
                    cell.setAttribute('position', `${productIndex * 1.2 - 1.8} 0.05 ${regionIndex * 1.2 - 1.2}`);
                    cell.setAttribute('opacity', 0.8);
                    
                    vizContainer.appendChild(cell);

                    // Add value label at ground level with background
                    const valueLabel = document.createElement('a-text');
                    valueLabel.setAttribute('data-viz', 'true');
                    valueLabel.setAttribute('value', `R${regionSales.revenue.toLocaleString()}\n${regionSales.sales} units`);
                    valueLabel.setAttribute('position', `${productIndex * 1.2 - 1.8} 0.15 ${regionIndex * 1.2 - 1.2}`);
                    valueLabel.setAttribute('align', 'center');
                    valueLabel.setAttribute('scale', '0.2 0.2 0.2');
                    valueLabel.setAttribute('color', 'white');
                    valueLabel.setAttribute('background-color', 'rgba(0,0,0,0.7)');
                    vizContainer.appendChild(valueLabel);
                }
            }
        });
    });
}

async function createScatterPlot() {
    const vizContainer = document.querySelector('#advanced-viz-container');

    // Clear existing visualizations
    const existingViz = vizContainer.querySelectorAll('[data-viz="true"]');
    existingViz.forEach(el => el.remove());
    
    // Fetch fresh data
    const products = await fetchSalesDataForViz();
    if (products.length === 0) {
        console.error('No data available for scatter plot');
        return;
    }
    
    // Add title
    const title = document.createElement('a-text');
    title.setAttribute('data-viz', 'true');
    title.setAttribute('value', '📊 SALES vs REVENUE SCATTER PLOT\n(Product Performance Analysis)');
    title.setAttribute('position', '0 2.5 0');
    title.setAttribute('align', 'center');
    title.setAttribute('scale', '0.4 0.4 0.4');
    title.setAttribute('color', '#FFD700');
    vizContainer.appendChild(title);
    
    // Add axis labels
    const xAxisLabel = document.createElement('a-text');
    xAxisLabel.setAttribute('data-viz', 'true');
    xAxisLabel.setAttribute('value', 'SALES (Units) →');
    xAxisLabel.setAttribute('position', '0 -0.5 0');
    xAxisLabel.setAttribute('align', 'center');
    xAxisLabel.setAttribute('scale', '0.3 0.3 0.3');
    xAxisLabel.setAttribute('color', '#ffffff');
    vizContainer.appendChild(xAxisLabel);
    
    const yAxisLabel = document.createElement('a-text');
    yAxisLabel.setAttribute('data-viz', 'true');
    yAxisLabel.setAttribute('value', 'REVENUE\n(Rands)');
    yAxisLabel.setAttribute('position', '-3.5 1.5 0');
    yAxisLabel.setAttribute('align', 'center');
    yAxisLabel.setAttribute('scale', '0.3 0.3 0.3');
    yAxisLabel.setAttribute('color', '#ffffff');
    vizContainer.appendChild(yAxisLabel);
    
    // Find max values for scaling
    let maxSales = 0;
    let maxRevenue = 0;
    products.forEach(product => {
        const totalSales = product.sales_data.reduce((sum, sale) => sum + sale.sales, 0);
        const totalRevenue = product.sales_data.reduce((sum, sale) => sum + sale.revenue, 0);
        if (totalSales > maxSales) maxSales = totalSales;
        if (totalRevenue > maxRevenue) maxRevenue = totalRevenue;
    });
    
    // Create scatter plot
    products.forEach((product, index) => {
        const totalRevenue = product.sales_data.reduce((sum, sale) => sum + sale.revenue, 0);
        const totalSales = product.sales_data.reduce((sum, sale) => sum + sale.sales, 0);
        const avgPrice = totalRevenue / totalSales;

        // Position based on sales (X) and revenue (Y) with better scaling
        const x = (totalSales / maxSales) * 4 - 2; // Scale to -2 to 2
        const y = (totalRevenue / maxRevenue) * 2; // Scale to 0 to 2
        const z = -2;

        // Create scatter point
        const point = document.createElement('a-sphere');
        point.setAttribute('data-viz', 'true');
        point.setAttribute('color', getProductColor(product.name));
        point.setAttribute('radius', 0.2);
        point.setAttribute('position', `${x} ${y} ${z}`);
        point.setAttribute('opacity', 0.8);
        point.setAttribute('animation', 'property: scale; to: 1.2 1.2 1.2; dir: alternate; loop: true; dur: 2000');
        
        vizContainer.appendChild(point);

        // Add product label in side legend
        const productLabel = document.createElement('a-text');
        productLabel.setAttribute('data-viz', 'true');
        productLabel.setAttribute('value', `${product.name}`);
        productLabel.setAttribute('position', `3 ${1.5 - index * 0.3} 0`);
        productLabel.setAttribute('align', 'center');
        productLabel.setAttribute('scale', '0.25 0.25 0.25');
        productLabel.setAttribute('color', getProductColor(product.name));
        vizContainer.appendChild(productLabel);
        
        // Add value label at ground level
        const valueLabel = document.createElement('a-text');
        valueLabel.setAttribute('data-viz', 'true');
        valueLabel.setAttribute('value', `${totalSales} units\nR${totalRevenue.toLocaleString()}\nAvg: R${avgPrice.toLocaleString()}`);
        valueLabel.setAttribute('position', `${x} 0.1 ${z}`);
        valueLabel.setAttribute('align', 'center');
        valueLabel.setAttribute('scale', '0.2 0.2 0.2');
        valueLabel.setAttribute('color', 'white');
        valueLabel.setAttribute('background-color', 'rgba(0,0,0,0.7)');
        vizContainer.appendChild(valueLabel);
    });
}

async function createTrendLine() {
    const vizContainer = document.querySelector('#advanced-viz-container');

    // Clear existing visualizations
    const existingViz = vizContainer.querySelectorAll('[data-viz="true"]');
    existingViz.forEach(el => el.remove());
    
    // Fetch fresh data
    const products = await fetchSalesDataForViz();
    if (products.length === 0) {
        console.error('No data available for trend line');
        return;
    }
    
    // Find max sales for scaling
    let maxSales = 0;
    products.forEach(product => {
        const gautengData = product.sales_data.filter(s => s.region === 'Gauteng');
        gautengData.forEach(sale => {
            if (sale.sales > maxSales) maxSales = sale.sales;
        });
    });
    
    // Add title
    const title = document.createElement('a-text');
    title.setAttribute('data-viz', 'true');
    title.setAttribute('value', '📈 SALES TRENDS - GAUTENG REGION\n(Jan-Jun 2024)');
    title.setAttribute('position', '0 3 0');
    title.setAttribute('align', 'center');
    title.setAttribute('scale', '0.4 0.4 0.4');
    title.setAttribute('color', '#FFD700');
    vizContainer.appendChild(title);
    
    // Add axis labels
    const yAxisLabel = document.createElement('a-text');
    yAxisLabel.setAttribute('data-viz', 'true');
    yAxisLabel.setAttribute('value', 'SALES\n(Units)');
    yAxisLabel.setAttribute('position', '-3.5 1.5 0');
    yAxisLabel.setAttribute('align', 'center');
    yAxisLabel.setAttribute('scale', '0.3 0.3 0.3');
    yAxisLabel.setAttribute('color', '#ffffff');
    vizContainer.appendChild(yAxisLabel);
    
    const xAxisLabel = document.createElement('a-text');
    xAxisLabel.setAttribute('data-viz', 'true');
    xAxisLabel.setAttribute('value', 'MONTHS →');
    xAxisLabel.setAttribute('position', '0 -0.5 0');
    xAxisLabel.setAttribute('align', 'center');
    xAxisLabel.setAttribute('scale', '0.3 0.3 0.3');
    xAxisLabel.setAttribute('color', '#ffffff');
    vizContainer.appendChild(xAxisLabel);
    
    // Create trend line for each product
    products.forEach((product, productIndex) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const gautengData = product.sales_data.filter(s => s.region === 'Gauteng');

        if (gautengData.length > 0) {
            // Add product label at accessible height
            const productLabel = document.createElement('a-text');
            productLabel.setAttribute('data-viz', 'true');
            productLabel.setAttribute('value', `${product.name}`);
            productLabel.setAttribute('position', `-4 ${1.5 - productIndex * 0.3} 0`);
            productLabel.setAttribute('align', 'center');
            productLabel.setAttribute('scale', '0.25 0.25 0.25');
            productLabel.setAttribute('color', getProductColor(product.name));
            vizContainer.appendChild(productLabel);
            
            // Create trend line points
            gautengData.forEach((sale, monthIndex) => {
                const x = monthIndex * 0.8 - 2;
                const y = (sale.sales / maxSales) * 2; // Better scaling
                const z = productIndex * 0.3 - 0.6; // Closer together

                // Create trend point
                const point = document.createElement('a-sphere');
                point.setAttribute('data-viz', 'true');
                point.setAttribute('color', getProductColor(product.name));
                point.setAttribute('radius', 0.08);
                point.setAttribute('position', `${x} ${y} ${z}`);
                point.setAttribute('opacity', 0.9);
                point.setAttribute('animation', 'property: scale; to: 1.3 1.3 1.3; dir: alternate; loop: true; dur: 2000');
                
                vizContainer.appendChild(point);

                // Add month labels on x-axis
                const monthLabel = document.createElement('a-text');
                monthLabel.setAttribute('data-viz', 'true');
                monthLabel.setAttribute('value', months[monthIndex]);
                monthLabel.setAttribute('position', `${x} -0.8 ${z}`);
                monthLabel.setAttribute('align', 'center');
                monthLabel.setAttribute('scale', '0.2 0.2 0.2');
                monthLabel.setAttribute('color', '#cccccc');
                vizContainer.appendChild(monthLabel);

                // Connect points with lines to show the trend
                if (monthIndex > 0) {
                    const prevSale = gautengData[monthIndex - 1];
                    const prevY = (prevSale.sales / maxSales) * 2;
                    const prevX = (monthIndex - 1) * 0.8 - 2;

                    // Create line between points
                    const line = document.createElement('a-cylinder');
                    line.setAttribute('data-viz', 'true');
                    line.setAttribute('color', getProductColor(product.name));
                    line.setAttribute('radius', 0.03);
                    line.setAttribute('height', Math.sqrt(Math.pow(x - prevX, 2) + Math.pow(y - prevY, 2)));
                    line.setAttribute('position', `${(x + prevX) / 2} ${(y + prevY) / 2} ${z}`);
                    line.setAttribute('rotation', `0 0 ${Math.atan2(y - prevY, x - prevX) * 180 / Math.PI}`);
                    line.setAttribute('opacity', 0.8);

                    vizContainer.appendChild(line);
                }
            });
            
            // Add trend summary at accessible height
            const firstMonth = gautengData[0].sales;
            const lastMonth = gautengData[gautengData.length - 1].sales;
            const trend = lastMonth > firstMonth ? '↗️ UP' : lastMonth < firstMonth ? '↘️ DOWN' : '→ FLAT';
            const changePercent = ((lastMonth - firstMonth) / firstMonth * 100).toFixed(1);
            
            const trendSummary = document.createElement('a-text');
            trendSummary.setAttribute('data-viz', 'true');
            trendSummary.setAttribute('value', `${trend} ${changePercent}%`);
            trendSummary.setAttribute('position', `3 ${1.5 - productIndex * 0.3} 0`);
            trendSummary.setAttribute('align', 'center');
            trendSummary.setAttribute('scale', '0.2 0.2 0.2');
            trendSummary.setAttribute('color', lastMonth > firstMonth ? '#00FF00' : lastMonth < firstMonth ? '#FF0000' : '#FFFF00');
            vizContainer.appendChild(trendSummary);
        }
    });
}

async function createCorrelationMatrix() {
    const vizContainer = document.querySelector('#advanced-viz-container');

    // Clear existing visualizations
    const existingViz = vizContainer.querySelectorAll('[data-viz="true"]');
    existingViz.forEach(el => el.remove());
    
    // Fetch fresh data
    const products = await fetchSalesDataForViz();
    if (products.length === 0) {
        console.error('No data available for correlation matrix');
        return;
    }
    
    // Add title
    const title = document.createElement('a-text');
    title.setAttribute('data-viz', 'true');
    title.setAttribute('value', '🔗 REGIONAL PERFORMANCE CORRELATION\n(Revenue Intensity Matrix)');
    title.setAttribute('position', '0 2.5 0');
    title.setAttribute('align', 'center');
    title.setAttribute('scale', '0.4 0.4 0.4');
    title.setAttribute('color', '#FFD700');
    vizContainer.appendChild(title);
    
    // Create correlation matrix visualization
    const regions = ['Gauteng', 'Western Cape', 'KwaZulu-Natal'];
    const productNames = products.map(p => p.name);
    
    // Add region labels on the left side
    regions.forEach((region, regionIndex) => {
        const regionLabel = document.createElement('a-text');
        regionLabel.setAttribute('data-viz', 'true');
        regionLabel.setAttribute('value', region);
        regionLabel.setAttribute('position', `-3.5 ${1.5 - regionIndex * 0.8} 0`);
        regionLabel.setAttribute('align', 'center');
        regionLabel.setAttribute('scale', '0.3 0.3 0.3');
        regionLabel.setAttribute('color', '#ffffff');
        vizContainer.appendChild(regionLabel);
    });

    // Add product labels on the top
    productNames.forEach((productName, productIndex) => {
        const productLabel = document.createElement('a-text');
        productLabel.setAttribute('data-viz', 'true');
        productLabel.setAttribute('value', productName);
        productLabel.setAttribute('position', `${productIndex * 1.2 - 1.2} 2.2 0`);
        productLabel.setAttribute('align', 'center');
        productLabel.setAttribute('scale', '0.25 0.25 0.25');
        productLabel.setAttribute('color', '#4CC3D9');
        vizContainer.appendChild(productLabel);
    });
    
    // Find max revenue across all regions for normalization
    let maxRevenue = 0;
    regions.forEach(region => {
        products.forEach(product => {
            const sale = product.sales_data.find(s => s.region === region);
            if (sale && sale.revenue > maxRevenue) maxRevenue = sale.revenue;
        });
    });
    
    regions.forEach((region, regionIndex) => {
        const regionData = products.map(product => {
            const sale = product.sales_data.find(s => s.region === region);
            return sale ? sale.revenue : 0;
        });

        regionData.forEach((revenue, productIndex) => {
            const intensity = revenue / maxRevenue;
            const color = getHeatMapColor(intensity);

            // Create correlation cell
            const cell = document.createElement('a-box');
            cell.setAttribute('data-viz', 'true');
            cell.setAttribute('color', color);
            cell.setAttribute('width', 0.6);
            cell.setAttribute('height', 0.6);
            cell.setAttribute('depth', 0.6);
            cell.setAttribute('position', `${productIndex * 1.2 - 1.2} ${intensity * 1.5} ${regionIndex * 1.2 - 1.2}`);
            cell.setAttribute('opacity', 0.8);
            cell.setAttribute('animation', 'property: rotation; to: 0 360 0; loop: true; dur: 10000');
            
            vizContainer.appendChild(cell);

            // Add value label at ground level with background
            const valueLabel = document.createElement('a-text');
            valueLabel.setAttribute('data-viz', 'true');
            valueLabel.setAttribute('value', `R${revenue.toLocaleString()}`);
            valueLabel.setAttribute('position', `${productIndex * 1.2 - 1.2} 0.1 ${regionIndex * 1.2 - 1.2}`);
            valueLabel.setAttribute('align', 'center');
            valueLabel.setAttribute('scale', '0.2 0.2 0.2');
            valueLabel.setAttribute('color', 'white');
            valueLabel.setAttribute('background-color', 'rgba(0,0,0,0.7)');
            vizContainer.appendChild(valueLabel);
        });
    });
}

function getHeatMapColor(intensity) {
    // Convert intensity (0-1) to heat map color
    if (intensity < 0.2) return '#0000FF'; // Blue
    if (intensity < 0.4) return '#00FFFF'; // Cyan
    if (intensity < 0.6) return '#00FF00'; // Green
    if (intensity < 0.8) return '#FFFF00'; // Yellow
    return '#FF0000'; // Red
}

// Export Functions
async function exportAnalysis() {
    try {
        // Get current data
        const response = await fetch(`${API_BASE}/sales/summary`);
        const summary = await response.json();
        
        // Create analysis report
        const report = {
            title: "South African VR Analytics Lab - Analysis Report",
            timestamp: new Date().toISOString(),
            summary: summary,
            filters: currentFilters,
            insights: generateInsights(summary),
            recommendations: generateRecommendations(summary)
        };
        
        // Export as JSON
        const jsonData = JSON.stringify(report, null, 2);
        downloadFile(jsonData, 'analysis-report.json', 'application/json');
        
        // Also create CSV export
        const csvData = generateCSV(summary);
        downloadFile(csvData, 'sales-data.csv', 'text/csv');
        
        alert('Analysis exported successfully! Check your downloads folder.');
        
    } catch (error) {
        console.error('Error exporting analysis:', error);
        alert('Error exporting analysis: ' + error.message);
    }
}

function generateInsights(summary) {
    const insights = [];
    
    // Find top performing region
    const topRegion = Object.entries(summary.region_breakdown)
        .sort(([,a], [,b]) => b.revenue - a.revenue)[0];
    insights.push(`Top performing region: ${topRegion[0]} with R${topRegion[1].revenue.toLocaleString()} revenue`);
    
    // Find top performing category
    const topCategory = Object.entries(summary.category_breakdown)
        .sort(([,a], [,b]) => b.revenue - a.revenue)[0];
    insights.push(`Top performing category: ${topCategory[0]} with R${topCategory[1].revenue.toLocaleString()} revenue`);
    
    // Calculate growth insights
    const totalRevenue = summary.total_revenue;
    const totalSales = summary.total_sales;
    const avgOrderValue = summary.average_order_value;
    
    insights.push(`Total business value: R${totalRevenue.toLocaleString()} across ${totalSales} units sold`);
    insights.push(`Average order value: R${avgOrderValue.toLocaleString()} per transaction`);
    
    return insights;
}

function generateRecommendations(summary) {
    const recommendations = [];
    
    // Regional recommendations
    const regions = Object.entries(summary.region_breakdown);
    const lowestRegion = regions.sort(([,a], [,b]) => a.revenue - b.revenue)[0];
    recommendations.push(`Focus on expanding ${lowestRegion[0]} market - currently underperforming`);
    
    // Category recommendations
    const categories = Object.entries(summary.category_breakdown);
    const topCategory = categories.sort(([,a], [,b]) => b.revenue - a.revenue)[0];
    recommendations.push(`Leverage success in ${topCategory[0]} category for cross-selling opportunities`);
    
    // General recommendations
    recommendations.push('Consider implementing AI-driven pricing optimization');
    recommendations.push('Invest in digital marketing for underperforming regions');
    recommendations.push('Develop customer retention programs to increase average order value');
    
    return recommendations;
}

function generateCSV(summary) {
    let csv = 'Metric,Value\n';
    csv += `Total Revenue,R${summary.total_revenue.toLocaleString()}\n`;
    csv += `Total Sales,${summary.total_sales}\n`;
    csv += `Average Order Value,R${summary.average_order_value.toLocaleString()}\n\n`;
    
    csv += 'Region,Revenue,Sales\n';
    Object.entries(summary.region_breakdown).forEach(([region, data]) => {
        csv += `${region},R${data.revenue.toLocaleString()},${data.sales}\n`;
    });
    
    csv += '\nCategory,Revenue,Sales\n';
    Object.entries(summary.category_breakdown).forEach(([category, data]) => {
        csv += `${category},R${data.revenue.toLocaleString()},${data.sales}\n`;
    });
    
    return csv;
}

function downloadFile(data, filename, mimeType) {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Panel Toggle Functions
function togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    const minimizeBtn = panel.querySelector('.minimize-btn');
    
    if (panel.classList.contains('panel-minimized')) {
        // Expand panel
        panel.classList.remove('panel-minimized');
        minimizeBtn.textContent = '−';
    } else {
        // Minimize panel
        panel.classList.add('panel-minimized');
        minimizeBtn.textContent = '+';
    }
}
