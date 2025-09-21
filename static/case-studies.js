// Case Studies Module
class CaseStudyManager {
    constructor() {
        this.currentCase = null;
        this.userAnswers = {};
        this.userScore = 0;
        this.badges = [];
        this.points = 0;
    }

    async loadCaseStudies() {
        try {
            const response = await fetch(`${API_BASE}/case-studies`);
            const cases = await response.json();
            this.displayCaseStudyList(cases);
        } catch (error) {
            console.error('Error loading case studies:', error);
        }
    }

    displayCaseStudyList(cases) {
        const caseStudyPanel = document.getElementById('case-study-panel');
        if (!caseStudyPanel) return;

        let html = `
            <div class="case-study-header">
                <h2>📚 Business Case Studies</h2>
                <button onclick="caseStudyManager.closeCaseStudyPanel()" class="close-btn">✕ Close</button>
            </div>
            <div class="case-list">
        `;
        
        cases.forEach(caseItem => {
            html += `
                <div class="case-item" onclick="caseStudyManager.startCaseStudy(${caseItem.id})">
                    <h3>${caseItem.title}</h3>
                    <p>${caseItem.description}</p>
                    <div class="case-meta">
                        <span class="difficulty">📊 ${caseItem.learning_objectives.length} Learning Objectives</span>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        caseStudyPanel.innerHTML = html;
    }

    async startCaseStudy(caseId) {
        try {
            const response = await fetch(`${API_BASE}/case-studies/${caseId}`);
            const caseData = await response.json();
            this.currentCase = caseData;
            this.userAnswers = {};
            this.displayCaseStudy(caseData);
        } catch (error) {
            console.error('Error loading case study:', error);
        }
    }

    displayCaseStudy(caseData) {
        const caseStudyPanel = document.getElementById('case-study-panel');
        
        let html = `
            <div class="case-study-header">
                <h2>📚 ${caseData.title}</h2>
                <button onclick="caseStudyManager.backToCaseList()" class="back-btn">← Back to Cases</button>
            </div>
            
            <div class="case-scenario">
                <h3>📋 Scenario</h3>
                <p>${caseData.scenario}</p>
            </div>

            <div class="case-data">
                <h3>📊 Data Analysis</h3>
                <button onclick="caseStudyManager.visualizeCaseData()" class="analyze-btn">🔍 Analyze Data in VR</button>
                <div id="case-data-details" class="data-details"></div>
            </div>

            <div class="case-questions">
                <h3>❓ Assessment Questions</h3>
        `;
        
        caseData.questions.forEach((question, index) => {
            html += `
                <div class="question-item">
                    <h4>Question ${index + 1}: ${question.question}</h4>
                    <div class="options">
            `;
            
            question.options.forEach((option, optIndex) => {
                html += `
                    <label>
                        <input type="radio" name="q${question.id}" value="${optIndex}" 
                               onchange="caseStudyManager.selectAnswer(${question.id}, ${optIndex})">
                        ${option}
                    </label>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });
        
        html += `
                <button onclick="caseStudyManager.submitAnswers()" class="submit-btn">Submit Answers</button>
            </div>
        `;
        
        caseStudyPanel.innerHTML = html;
        
        // Display detailed data for the case study
        this.displayCaseDataDetails(caseData);
    }

    selectAnswer(questionId, answerIndex) {
        this.userAnswers[questionId] = answerIndex;
    }

    async submitAnswers() {
        if (!this.currentCase) return;

        try {
            const response = await fetch(`${API_BASE}/case-studies/${this.currentCase.id}/submit-answers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.userAnswers)
            });

            const results = await response.json();
            this.displayResults(results);
            this.updateUserProgress(results);
        } catch (error) {
            console.error('Error submitting answers:', error);
        }
    }

    displayResults(results) {
        const caseStudyPanel = document.getElementById('case-study-panel');
        
        let html = `
            <div class="results-header">
                <h2>🎯 Assessment Results</h2>
                <button onclick="caseStudyManager.backToCaseList()" class="back-btn">← Back to Cases</button>
            </div>
            
            <div class="score-display">
                <h3>Your Score: ${results.score}%</h3>
                <p>${results.correct_answers} out of ${results.total_questions} questions correct</p>
                <div class="score-bar">
                    <div class="score-fill" style="width: ${results.score}%"></div>
                </div>
            </div>

            <div class="question-results">
        `;
        
        results.results.forEach(result => {
            const resultClass = result.is_correct ? 'correct' : 'incorrect';
            const userAnswer = result.user_answer !== null ? result.user_answer : 'Not answered';
            
            html += `
                <div class="result-item ${resultClass}">
                    <h4>${result.question}</h4>
                    <p><strong>Your Answer:</strong> ${userAnswer}</p>
                    <p><strong>Correct Answer:</strong> ${result.correct_answer}</p>
                    <p><strong>Explanation:</strong> ${result.explanation}</p>
                </div>
            `;
        });
        
        html += `
            </div>

            <div class="recommendations">
                <h3>💡 Key Recommendations</h3>
                <ul>
        `;
        
        results.recommendations.forEach(rec => {
            html += `<li>${rec}</li>`;
        });
        
        html += `
                </ul>
            </div>
        `;
        
        caseStudyPanel.innerHTML = html;
    }

    updateUserProgress(results) {
        // Award points based on performance
        const pointsEarned = Math.round(results.score / 10) * 10;
        this.points += pointsEarned;

        // Award badges
        if (results.score >= 90) {
            this.awardBadge('Analytics Expert', '🏆');
        } else if (results.score >= 70) {
            this.awardBadge('Data Analyst', '🥇');
        } else if (results.score >= 50) {
            this.awardBadge('Learning Progress', '🥈');
        }

        // Update UI
        this.updateProgressDisplay();
    }

    awardBadge(name, emoji) {
        if (!this.badges.find(b => b.name === name)) {
            this.badges.push({ name, emoji, date: new Date().toLocaleDateString() });
            this.showBadgeNotification(name, emoji);
        }
    }

    showBadgeNotification(name, emoji) {
        // Create floating badge notification
        const notification = document.createElement('div');
        notification.className = 'badge-notification';
        notification.innerHTML = 
            '<div class="badge-content">' +
                '<span class="badge-emoji">' + emoji + '</span>' +
                '<span class="badge-text">Badge Earned: ' + name + '</span>' +
            '</div>';
        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    updateProgressDisplay() {
        const progressPanel = document.getElementById('progress-panel');
        if (progressPanel) {
            let html = `
                <h3>🏆 Your Progress</h3>
                <div class="progress-stats">
                    <div class="stat">
                        <span class="stat-label">Points:</span>
                        <span class="stat-value">${this.points}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Badges:</span>
                        <span class="stat-value">${this.badges.length}</span>
                    </div>
                </div>
                
                <div class="badges-display">
                    <h4>🏅 Badges Earned</h4>
            `;
            
            this.badges.forEach(badge => {
                html += `
                    <div class="badge-item">
                        <span class="badge-emoji">${badge.emoji}</span>
                        <span class="badge-name">${badge.name}</span>
                        <span class="badge-date">${badge.date}</span>
                    </div>
                `;
            });
            
            html += '</div>';
            progressPanel.innerHTML = html;
        }
    }

    async visualizeCaseData() {
        if (!this.currentCase) return;

        try {
            const response = await fetch(`${API_BASE}/case-studies/${this.currentCase.id}/data`);
            const data = await response.json();
            
            // Create 3D visualization of case study data
            this.createCaseStudyVisualization(data);
        } catch (error) {
            console.error('Error loading case data:', error);
        }
    }

    createCaseStudyVisualization(data) {
        const chartContainer = document.querySelector('#chart-container');
        chartContainer.innerHTML = '';

        // Create 3D visualization based on case study data
        if (data.revenue_data) {
            this.createRevenueChart(data.revenue_data);
        } else if (data.candidate_cities) {
            this.createCityComparison(data.candidate_cities);
        } else if (data.quality_metrics) {
            this.createQualityMetrics(data.quality_metrics);
        } else {
            // Fallback for any case study data
            this.createGenericVisualization(data);
        }
    }

    createGenericVisualization(data) {
        const chartContainer = document.querySelector('#chart-container');
        
        // Create a simple bar chart for any numeric data
        const dataPoints = [];
        
        // Extract numeric values from the data object
        Object.keys(data).forEach(key => {
            if (Array.isArray(data[key])) {
                data[key].forEach((item, index) => {
                    if (typeof item === 'object' && item !== null) {
                        Object.keys(item).forEach(subKey => {
                            if (typeof item[subKey] === 'number' && item[subKey] > 0) {
                                dataPoints.push({
                                    name: `${key}_${subKey}_${index}`,
                                    value: item[subKey],
                                    label: `${subKey}: ${item[subKey]}`
                                });
                            }
                        });
                    }
                });
            }
        });

        if (dataPoints.length > 0) {
            const maxValue = Math.max(...dataPoints.map(d => d.value));
            const scale = 3 / maxValue;

            dataPoints.forEach((point, index) => {
                const height = (point.value / maxValue) * 3;
                const bar = document.createElement('a-box');
                bar.setAttribute('color', '#4ECDC4');
                bar.setAttribute('height', height);
                bar.setAttribute('depth', 0.5);
                bar.setAttribute('width', 0.5);
                bar.setAttribute('position', `${index * 1.5 - 3} ${height / 2} 0`);
                chartContainer.appendChild(bar);

                // Add label
                const labelText = document.createElement('a-text');
                labelText.setAttribute('value', point.label);
                labelText.setAttribute('position', `${index * 1.5 - 3} ${height + 0.3} 0`);
                labelText.setAttribute('align', 'center');
                labelText.setAttribute('scale', '0.5 0.5 0.5');
                labelText.setAttribute('color', '#ffffff');
                chartContainer.appendChild(labelText);
            });
        } else {
            // Show a message if no data to visualize
            const messageText = document.createElement('a-text');
            messageText.setAttribute('value', 'No numeric data to visualize');
            messageText.setAttribute('position', '0 2 0');
            messageText.setAttribute('align', 'center');
            messageText.setAttribute('scale', '1 1 1');
            messageText.setAttribute('color', '#FF6B6B');
            chartContainer.appendChild(messageText);
        }
    }

    createRevenueChart(revenueData) {
        const chartContainer = document.querySelector('#chart-container');
        const maxRevenue = Math.max(...revenueData.map(d => d.revenue));
        const scale = 3 / maxRevenue;

        revenueData.forEach((dataPoint, index) => {
            const height = (dataPoint.revenue / maxRevenue) * 3;
            const bar = document.createElement('a-box');
            bar.setAttribute('color', '#FF6B6B');
            bar.setAttribute('height', height);
            bar.setAttribute('depth', 0.5);
            bar.setAttribute('width', 0.5);
            bar.setAttribute('position', `${index * 1.5 - 3} ${height / 2} 0`);
            chartContainer.appendChild(bar);

            // Add month label
            const monthText = document.createElement('a-text');
            monthText.setAttribute('value', dataPoint.month);
            monthText.setAttribute('position', `${index * 1.5 - 3} ${height + 0.3} 0`);
            monthText.setAttribute('align', 'center');
            monthText.setAttribute('scale', '0.6 0.6 0.6');
            monthText.setAttribute('color', '#ffffff');
            chartContainer.appendChild(monthText);

            // Add revenue label
            const revenueText = document.createElement('a-text');
            revenueText.setAttribute('value', `R${(dataPoint.revenue / 1000000).toFixed(1)}M`);
            revenueText.setAttribute('position', `${index * 1.5 - 3} ${height + 0.1} 0`);
            revenueText.setAttribute('align', 'center');
            revenueText.setAttribute('scale', '0.5 0.5 0.5');
            revenueText.setAttribute('color', '#4CC3D9');
            chartContainer.appendChild(revenueText);
        });
    }

    createCityComparison(cities) {
        const chartContainer = document.querySelector('#chart-container');
        const maxPopulation = Math.max(...cities.map(c => c.population));
        const scale = 3 / maxPopulation;

        cities.forEach((city, index) => {
            const height = (city.population / maxPopulation) * 3;
            const bar = document.createElement('a-box');
            bar.setAttribute('color', '#FF6B6B');
            bar.setAttribute('height', height);
            bar.setAttribute('depth', 0.5);
            bar.setAttribute('width', 0.5);
            bar.setAttribute('position', `${index * 1.5 - 3} ${height / 2} 0`);
            chartContainer.appendChild(bar);

            // Add city name
            const cityText = document.createElement('a-text');
            cityText.setAttribute('value', city.city);
            cityText.setAttribute('position', `${index * 1.5 - 3} ${height + 0.3} 0`);
            cityText.setAttribute('align', 'center');
            cityText.setAttribute('scale', '0.6 0.6 0.6');
            cityText.setAttribute('color', '#ffffff');
            chartContainer.appendChild(cityText);

            // Add population label
            const popText = document.createElement('a-text');
            popText.setAttribute('value', `${(city.population / 1000000).toFixed(1)}M`);
            popText.setAttribute('position', `${index * 1.5 - 3} ${height + 0.1} 0`);
            popText.setAttribute('align', 'center');
            popText.setAttribute('scale', '0.5 0.5 0.5');
            popText.setAttribute('color', '#4CC3D9');
            chartContainer.appendChild(popText);
        });
    }

    createQualityMetrics(metrics) {
        const chartContainer = document.querySelector('#chart-container');
        const maxEfficiency = Math.max(...metrics.map(m => m.efficiency));
        const scale = 3 / maxEfficiency;

        metrics.forEach((metric, index) => {
            const height = (metric.efficiency / maxEfficiency) * 3;
            const bar = document.createElement('a-box');
            bar.setAttribute('color', '#4ECDC4');
            bar.setAttribute('height', height);
            bar.setAttribute('depth', 0.5);
            bar.setAttribute('width', 0.5);
            bar.setAttribute('position', `${index * 1.5 - 3} ${height / 2} 0`);
            chartContainer.appendChild(bar);

            // Add line name
            const lineText = document.createElement('a-text');
            lineText.setAttribute('value', metric.line);
            lineText.setAttribute('position', `${index * 1.5 - 3} ${height + 0.3} 0`);
            lineText.setAttribute('align', 'center');
            lineText.setAttribute('scale', '0.6 0.6 0.6');
            lineText.setAttribute('color', '#ffffff');
            chartContainer.appendChild(lineText);

            // Add efficiency label
            const effText = document.createElement('a-text');
            effText.setAttribute('value', `${metric.efficiency}%`);
            effText.setAttribute('position', `${index * 1.5 - 3} ${height + 0.1} 0`);
            effText.setAttribute('align', 'center');
            effText.setAttribute('scale', '0.5 0.5 0.5');
            effText.setAttribute('color', '#4CC3D9');
            chartContainer.appendChild(effText);
        });
    }

    backToCaseList() {
        this.loadCaseStudies();
    }

    closeCaseStudyPanel() {
        const caseStudyPanel = document.getElementById('case-study-panel');
        if (caseStudyPanel) {
            caseStudyPanel.style.display = 'none';
        }
    }

    showCaseStudyPanel() {
        const caseStudyPanel = document.getElementById('case-study-panel');
        if (caseStudyPanel) {
            caseStudyPanel.style.display = 'block';
        }
    }

    displayCaseDataDetails(caseData) {
        const dataDetailsDiv = document.getElementById('case-data-details');
        if (!dataDetailsDiv) return;

        let html = '<h4>📋 Detailed Data:</h4>';

        if (caseData.data.revenue_data) {
            html += '<h5>Revenue Data:</h5><table class="data-table"><tr><th>Month</th><th>Revenue (R)</th><th>Customers</th><th>Region</th></tr>';
            caseData.data.revenue_data.forEach(item => {
                html += `<tr><td>${item.month}</td><td>R${item.revenue.toLocaleString()}</td><td>${item.customers}</td><td>${item.region}</td></tr>`;
            });
            html += '</table>';
        }

        if (caseData.data.competitor_data) {
            html += '<h5>Market Share Analysis:</h5><table class="data-table"><tr><th>Company</th><th>Market Share (%)</th><th>Price Advantage (%)</th></tr>';
            caseData.data.competitor_data.forEach(competitor => {
                html += `<tr><td>${competitor.company}</td><td>${competitor.market_share}%</td><td>${competitor.price_advantage}%</td></tr>`;
            });
            html += '</table>';
        }

        if (caseData.data.candidate_cities) {
            html += '<h5>City Comparison:</h5><table class="data-table"><tr><th>City</th><th>Population</th><th>Avg Income (R)</th><th>Competition</th><th>Growth Rate (%)</th></tr>';
            caseData.data.candidate_cities.forEach(city => {
                html += `<tr><td>${city.city}</td><td>${city.population.toLocaleString()}</td><td>R${city.avg_income.toLocaleString()}</td><td>${city.competition}</td><td>${city.growth_rate}%</td></tr>`;
            });
            html += '</table>';
        }

        if (caseData.data.quality_metrics) {
            html += '<h5>Production Line Metrics:</h5><table class="data-table"><tr><th>Line</th><th>Efficiency (%)</th><th>Defect Rate (%)</th><th>Downtime (min)</th></tr>';
            caseData.data.quality_metrics.forEach(metric => {
                html += `<tr><td>${metric.line}</td><td>${metric.efficiency}%</td><td>${metric.defect_rate}%</td><td>${metric.downtime}</td></tr>`;
            });
            html += '</table>';
            
            if (caseData.data.cost_analysis) {
                html += '<h5>Cost Analysis:</h5><table class="data-table"><tr><th>Cost Type</th><th>Amount (R)</th></tr>';
                html += `<tr><td>Material Cost</td><td>R${caseData.data.cost_analysis.material_cost.toLocaleString()}</td></tr>`;
                html += `<tr><td>Labor Cost</td><td>R${caseData.data.cost_analysis.labor_cost.toLocaleString()}</td></tr>`;
                html += `<tr><td>Overhead Cost</td><td>R${caseData.data.cost_analysis.overhead_cost.toLocaleString()}</td></tr>`;
                html += `<tr><td>Quality Cost</td><td>R${caseData.data.cost_analysis.quality_cost.toLocaleString()}</td></tr>`;
                html += `<tr><td><strong>Total Daily Cost</strong></td><td><strong>R${(caseData.data.cost_analysis.material_cost + caseData.data.cost_analysis.labor_cost + caseData.data.cost_analysis.overhead_cost + caseData.data.cost_analysis.quality_cost).toLocaleString()}</strong></td></tr>`;
                html += '</table>';
            }
        }

        dataDetailsDiv.innerHTML = html;
    }
}

// Initialize case study manager
const caseStudyManager = new CaseStudyManager();
