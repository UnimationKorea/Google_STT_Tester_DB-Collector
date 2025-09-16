// Global state
let currentUser = null;
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let sentences = [];
let selectedSentence = null;
let recognitionResults = [];
let statsData = null;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    renderMainLayout();
    loadUsers();
    loadSentences();
    loadResults();
    setupEventListeners();
}

// ==================== UI Rendering ====================
function renderMainLayout() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="min-h-screen bg-gray-50">
            <!-- Header -->
            <header class="bg-white shadow-sm border-b border-gray-200">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between items-center py-4">
                        <div class="flex items-center">
                            <i class="fas fa-microphone-alt text-blue-600 text-2xl mr-3"></i>
                            <h1 class="text-2xl font-bold text-gray-900">구글 음성인식 테스터 시스템</h1>
                        </div>
                        <div class="flex space-x-4">
                            <button onclick="showSection('recording')" class="nav-btn px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100">
                                <i class="fas fa-record-vinyl mr-2"></i>음성 녹음
                            </button>
                            <button onclick="showSection('sentences')" class="nav-btn px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100">
                                <i class="fas fa-list mr-2"></i>문장 관리
                            </button>
                            <button onclick="showSection('dashboard')" class="nav-btn px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100">
                                <i class="fas fa-chart-bar mr-2"></i>대시보드
                            </button>
                            <button onclick="showSection('users')" class="nav-btn px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100">
                                <i class="fas fa-users mr-2"></i>사용자 관리
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <!-- Main Content -->
            <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <!-- User Selection and Controls -->
                <div class="mb-6 bg-white rounded-lg shadow p-4">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center space-x-4">
                            <label class="text-sm font-medium text-gray-700">현재 사용자:</label>
                            <select id="userSelect" class="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">사용자를 선택하세요</option>
                            </select>
                            <button onclick="showAddUserModal()" class="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700">
                                <i class="fas fa-user-plus mr-1"></i>새 사용자
                            </button>
                        </div>
                        <div id="userInfo" class="text-sm text-gray-600"></div>
                    </div>
                    <!-- CSV Download Buttons -->
                    <div class="flex items-center space-x-3 pt-3 border-t border-gray-200">
                        <span class="text-sm font-medium text-gray-700">데이터 내보내기:</span>
                        <button onclick="exportData('results')" class="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm">
                            <i class="fas fa-download mr-1"></i>결과 CSV
                        </button>
                        <button onclick="exportData('stats')" class="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
                            <i class="fas fa-download mr-1"></i>통계 CSV
                        </button>
                        <button onclick="showDetailedStats()" class="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm">
                            <i class="fas fa-chart-line mr-1"></i>상세 통계
                        </button>
                    </div>
                </div>

                <!-- Content Sections -->
                <div id="recording-section" class="section">
                    ${renderRecordingSection()}
                </div>

                <div id="sentences-section" class="section hidden">
                    ${renderSentencesSection()}
                </div>

                <div id="dashboard-section" class="section hidden">
                    ${renderDashboardSection()}
                </div>

                <div id="users-section" class="section hidden">
                    ${renderUsersSection()}
                </div>
            </main>
        </div>

        <!-- Modals -->
        <div id="modals"></div>
    `;
}

function renderRecordingSection() {
    return `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Target Sentence Selection -->
            <div class="bg-white rounded-lg shadow p-6">
                <h2 class="text-xl font-semibold mb-4">
                    <i class="fas fa-quote-left text-blue-600 mr-2"></i>
                    발화 대상 선택
                </h2>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">문장/단어 선택</label>
                    <select id="sentenceSelect" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">문장을 선택하세요</option>
                    </select>
                </div>
                <div id="targetDisplay" class="p-4 bg-gray-50 rounded-lg min-h-[100px]">
                    <p class="text-gray-500 text-center">선택된 문장이 없습니다</p>
                </div>
            </div>

            <!-- Recording Control -->
            <div class="bg-white rounded-lg shadow p-6">
                <h2 class="text-xl font-semibold mb-4">
                    <i class="fas fa-microphone text-red-600 mr-2"></i>
                    음성 녹음
                </h2>
                <div class="text-center">
                    <button id="recordBtn" onclick="toggleRecording()" class="record-button">
                        <i class="fas fa-microphone text-4xl"></i>
                    </button>
                    <p id="recordStatus" class="mt-4 text-gray-600">녹음 준비</p>
                    <div id="recordTimer" class="mt-2 text-2xl font-mono hidden">00:00</div>
                </div>
            </div>
        </div>

        <!-- Recent Results -->
        <div class="mt-6 bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-semibold mb-4">
                <i class="fas fa-history text-green-600 mr-2"></i>
                최근 인식 결과
            </h2>
            <div id="recentResults" class="overflow-x-auto">
                <p class="text-gray-500 text-center">결과가 없습니다</p>
            </div>
        </div>
    `;
}

function renderSentencesSection() {
    return `
        <div class="bg-white rounded-lg shadow p-6">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-semibold">
                    <i class="fas fa-list text-blue-600 mr-2"></i>
                    문장/단어 관리
                </h2>
                <button onclick="showAddSentenceModal()" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    <i class="fas fa-plus mr-2"></i>새 문장 추가
                </button>
            </div>
            <div id="sentencesList" class="overflow-x-auto"></div>
        </div>
    `;
}

function renderDashboardSection() {
    return `
        <div class="space-y-6">
            <!-- Stats Overview -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="bg-white rounded-lg shadow p-4">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">전체 시도</p>
                            <p id="totalAttempts" class="text-2xl font-semibold text-gray-900">0</p>
                        </div>
                        <i class="fas fa-microphone-alt text-blue-500 text-2xl"></i>
                    </div>
                </div>
                <div class="bg-white rounded-lg shadow p-4">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">정답률</p>
                            <p id="accuracyRate" class="text-2xl font-semibold text-green-600">0%</p>
                        </div>
                        <i class="fas fa-check-circle text-green-500 text-2xl"></i>
                    </div>
                </div>
                <div class="bg-white rounded-lg shadow p-4">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">평균 신뢰도</p>
                            <p id="avgConfidence" class="text-2xl font-semibold text-blue-600">0%</p>
                        </div>
                        <i class="fas fa-chart-line text-blue-500 text-2xl"></i>
                    </div>
                </div>
                <div class="bg-white rounded-lg shadow p-4">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">사용자 수</p>
                            <p id="totalUsers" class="text-2xl font-semibold text-purple-600">0</p>
                        </div>
                        <i class="fas fa-users text-purple-500 text-2xl"></i>
                    </div>
                </div>
            </div>

            <!-- Charts -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="bg-white rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold mb-4">문장별 정답률</h3>
                    <canvas id="sentenceChart"></canvas>
                </div>
                <div class="bg-white rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold mb-4">시간대별 성능</h3>
                    <canvas id="hourChart"></canvas>
                </div>
            </div>

            <!-- Detailed Statistics Tables -->
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-lg font-semibold mb-4">상세 통계 테이블</h3>
                <div class="mb-4">
                    <div class="flex space-x-2">
                        <button onclick="showDetailedTable('sentence')" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                            문장별 상세 통계
                        </button>
                        <button onclick="showDetailedTable('user')" class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
                            사용자별 상세 통계
                        </button>
                    </div>
                </div>
                <div id="detailedStatsTable" class="overflow-x-auto">
                    <p class="text-gray-500 text-center py-4">위 버튼을 클릭하여 상세 통계를 확인하세요</p>
                </div>
            </div>
        </div>
    `;
}

function renderUsersSection() {
    return `
        <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-semibold mb-4">
                <i class="fas fa-users text-purple-600 mr-2"></i>
                사용자 관리
            </h2>
            <div id="usersList" class="overflow-x-auto"></div>
        </div>
    `;
}

// ==================== Data Loading ====================
async function loadUsers() {
    try {
        const response = await axios.get('/api/users');
        if (response.data.success) {
            const users = response.data.users;
            const select = document.getElementById('userSelect');
            select.innerHTML = '<option value="">사용자를 선택하세요</option>';
            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = `${user.username} (${user.age}세, ${user.gender === 'male' ? '남' : user.gender === 'female' ? '여' : '기타'})`;
                select.appendChild(option);
            });

            // Update users list
            updateUsersList(users);
        }
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

async function loadSentences() {
    try {
        const response = await axios.get('/api/sentences');
        if (response.data.success) {
            sentences = response.data.sentences;
            updateSentenceSelect();
            updateSentencesList();
        }
    } catch (error) {
        console.error('Failed to load sentences:', error);
    }
}

async function loadResults() {
    try {
        const response = await axios.get('/api/results', { params: { limit: 10 } });
        if (response.data.success) {
            recognitionResults = response.data.results;
            updateRecentResults();
        }
    } catch (error) {
        console.error('Failed to load results:', error);
    }
}

async function loadStats() {
    try {
        // Load sentence stats
        const sentenceStats = await axios.get('/api/stats', { params: { groupBy: 'sentence' } });
        // Load hour stats
        const hourStats = await axios.get('/api/stats', { params: { groupBy: 'hour' } });
        // Load user stats
        const userStats = await axios.get('/api/stats', { params: { groupBy: 'user' } });
        
        updateDashboard(sentenceStats.data.stats, hourStats.data.stats, userStats.data.stats);
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

// ==================== Recording Functions ====================
async function toggleRecording() {
    if (!currentUser) {
        alert('먼저 사용자를 선택해주세요.');
        return;
    }
    if (!selectedSentence) {
        alert('먼저 발화할 문장을 선택해주세요.');
        return;
    }

    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            await sendAudioToServer(audioBlob);
        };

        mediaRecorder.start();
        isRecording = true;
        updateRecordingUI(true);
        startTimer();
    } catch (error) {
        console.error('Failed to start recording:', error);
        alert('마이크 접근 권한이 필요합니다.');
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        isRecording = false;
        updateRecordingUI(false);
        stopTimer();
    }
}

async function sendAudioToServer(audioBlob) {
    try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        formData.append('userId', currentUser);
        formData.append('targetSentenceId', selectedSentence.id);
        formData.append('language', 'en-US');

        showLoadingModal();

        const response = await axios.post('/api/speech-to-text', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        hideLoadingModal();

        if (response.data.success) {
            showResultModal(response.data.result);
            loadResults();
            loadStats();
        } else {
            alert('음성 인식 실패: ' + response.data.error);
        }
    } catch (error) {
        hideLoadingModal();
        console.error('Failed to send audio:', error);
        alert('서버 오류가 발생했습니다.');
    }
}

// ==================== UI Update Functions ====================
function updateRecordingUI(recording) {
    const btn = document.getElementById('recordBtn');
    const status = document.getElementById('recordStatus');
    
    if (recording) {
        btn.classList.add('recording');
        btn.innerHTML = '<i class="fas fa-stop text-4xl"></i>';
        status.textContent = '녹음 중...';
        status.classList.add('text-red-600');
    } else {
        btn.classList.remove('recording');
        btn.innerHTML = '<i class="fas fa-microphone text-4xl"></i>';
        status.textContent = '녹음 준비';
        status.classList.remove('text-red-600');
    }
}

function updateSentenceSelect() {
    const select = document.getElementById('sentenceSelect');
    if (!select) return;
    
    // Sort sentences by level, then set, then content
    const sortedSentences = [...sentences].sort((a, b) => {
        if (a.level !== b.level) return a.level.localeCompare(b.level);
        if (a.set_number !== b.set_number) return a.set_number - b.set_number;
        return a.content.localeCompare(b.content);
    });
    
    select.innerHTML = '<option value="">문장을 선택하세요</option>';
    sortedSentences.forEach(sentence => {
        const option = document.createElement('option');
        option.value = sentence.id;
        option.textContent = `[${sentence.level}${sentence.set_number}] ${sentence.content} (${sentence.type === 'word' ? '단어' : '문장'})`;
        select.appendChild(option);
    });
}

function updateSentencesList() {
    const container = document.getElementById('sentencesList');
    if (!container) return;

    if (sentences.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">등록된 문장이 없습니다</p>';
        return;
    }

    // Sort sentences by level, then set, then content, then type
    const sortedSentences = [...sentences].sort((a, b) => {
        if (a.level !== b.level) return a.level.localeCompare(b.level);
        if (a.set_number !== b.set_number) return a.set_number - b.set_number;
        if (a.content !== b.content) return a.content.localeCompare(b.content);
        return a.type.localeCompare(b.type);
    });

    const table = `
        <table class="min-w-full">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">레벨</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">세트</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">내용</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">타입</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">액션</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                ${sortedSentences.map(s => `
                    <tr>
                        <td class="px-4 py-2 text-sm font-medium">${s.level}</td>
                        <td class="px-4 py-2 text-sm">${s.set_number}</td>
                        <td class="px-4 py-2 text-sm">${s.content}</td>
                        <td class="px-4 py-2 text-sm">${s.type === 'word' ? '단어' : '문장'}</td>
                        <td class="px-4 py-2 text-sm">
                            <button onclick="deleteSentence(${s.id})" class="text-red-600 hover:text-red-800" title="삭제">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = table;
}

function updateRecentResults() {
    const container = document.getElementById('recentResults');
    if (!container) return;

    // Filter to show only incorrect results (errors)
    const errorResults = recognitionResults.filter(r => !r.is_correct);

    if (errorResults.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">오류가 없습니다. 모든 인식이 정확합니다!</p>';
        return;
    }

    const table = `
        <table class="min-w-full">
            <thead class="bg-red-50">
                <tr>
                    <th class="px-4 py-2 text-left text-xs font-medium text-red-700 uppercase">시간</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-red-700 uppercase">사용자</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-red-700 uppercase">원본</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-red-700 uppercase">인식 결과 (오류)</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-red-700 uppercase">신뢰도</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                ${errorResults.map(r => `
                    <tr class="bg-red-50">
                        <td class="px-4 py-2 text-sm">${new Date(r.created_at).toLocaleString('ko-KR')}</td>
                        <td class="px-4 py-2 text-sm">${r.username || '-'}</td>
                        <td class="px-4 py-2 text-sm font-medium text-green-700">${r.target_text}</td>
                        <td class="px-4 py-2 text-sm font-medium text-red-700">${r.recognized_text || '인식 실패'}</td>
                        <td class="px-4 py-2 text-sm">${(r.confidence_score * 100).toFixed(1)}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = table;
}

function updateUsersList(users) {
    const container = document.getElementById('usersList');
    if (!container) return;

    if (users.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">등록된 사용자가 없습니다</p>';
        return;
    }

    const table = `
        <table class="min-w-full">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">나이</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">성별</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">등록일</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                ${users.map(u => `
                    <tr>
                        <td class="px-4 py-2 text-sm">${u.username}</td>
                        <td class="px-4 py-2 text-sm">${u.age}</td>
                        <td class="px-4 py-2 text-sm">${u.gender === 'male' ? '남' : u.gender === 'female' ? '여' : '기타'}</td>
                        <td class="px-4 py-2 text-sm">${new Date(u.created_at).toLocaleDateString('ko-KR')}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = table;
}

function updateDashboard(sentenceStats, hourStats, userStats) {
    // Update overview stats
    let totalAttempts = 0;
    let correctCount = 0;
    let totalConfidence = 0;
    let confCount = 0;

    sentenceStats.forEach(stat => {
        if (stat.total_attempts) {
            totalAttempts += stat.total_attempts;
            correctCount += stat.correct_count || 0;
            if (stat.avg_confidence) {
                totalConfidence += stat.avg_confidence * stat.total_attempts;
                confCount += stat.total_attempts;
            }
        }
    });

    document.getElementById('totalAttempts').textContent = totalAttempts;
    document.getElementById('accuracyRate').textContent = totalAttempts > 0 
        ? ((correctCount / totalAttempts) * 100).toFixed(1) + '%' 
        : '0%';
    document.getElementById('avgConfidence').textContent = confCount > 0
        ? ((totalConfidence / confCount) * 100).toFixed(1) + '%'
        : '0%';
    document.getElementById('totalUsers').textContent = userStats.length;

    // Update charts
    updateSentenceChart(sentenceStats);
    updateHourChart(hourStats);
}

function updateSentenceChart(stats) {
    const ctx = document.getElementById('sentenceChart');
    if (!ctx) return;

    const chartData = stats
        .filter(s => s.total_attempts > 0)
        .sort((a, b) => (a.accuracy_rate || 0) - (b.accuracy_rate || 0))
        .slice(0, 10);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.map(s => s.content.substring(0, 20) + '...'),
            datasets: [{
                label: '정답률 (%)',
                data: chartData.map(s => (s.accuracy_rate || 0) * 100),
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

function updateHourChart(stats) {
    const ctx = document.getElementById('hourChart');
    if (!ctx) return;

    const hours = Array.from({length: 24}, (_, i) => i);
    const data = hours.map(h => {
        const stat = stats.find(s => parseInt(s.hour) === h);
        return stat ? (stat.accuracy_rate || 0) * 100 : 0;
    });

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: hours.map(h => `${h}시`),
            datasets: [{
                label: '시간대별 정답률 (%)',
                data: data,
                borderColor: 'rgba(16, 185, 129, 1)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

// ==================== Modal Functions ====================
function showAddUserModal() {
    const modal = `
        <div id="userModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-6 w-96">
                <h2 class="text-xl font-semibold mb-4">새 사용자 등록</h2>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">이름</label>
                        <input id="newUsername" type="text" class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">나이</label>
                        <input id="newUserAge" type="number" min="1" max="100" class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">성별</label>
                        <select id="newUserGender" class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="male">남성</option>
                            <option value="female">여성</option>
                            <option value="other">기타</option>
                        </select>
                    </div>
                </div>
                <div class="mt-6 flex justify-end space-x-3">
                    <button onclick="closeModal('userModal')" class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">취소</button>
                    <button onclick="saveUser()" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">저장</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modals').innerHTML = modal;
}

function showAddSentenceModal() {
    const modal = `
        <div id="sentenceModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-6 w-96">
                <h2 class="text-xl font-semibold mb-4">새 문장/단어 추가</h2>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">내용</label>
                        <input id="newSentenceContent" type="text" class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">타입</label>
                        <select id="newSentenceType" class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="sentence">문장</option>
                            <option value="word">단어</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">레벨</label>
                        <select id="newSentenceLevel" class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="3A">3A</option>
                            <option value="4A">4A</option>
                            <option value="5A">5A</option>
                            <option value="6A">6A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="D">D</option>
                            <option value="E">E</option>
                            <option value="F">F</option>
                            <option value="G">G</option>
                            <option value="H">H</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">세트</label>
                        <select id="newSentenceSet" class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            ${Array.from({length: 20}, (_, i) => i + 1).map(n => 
                                `<option value="${n}">${n}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
                <div class="mt-6 flex justify-end space-x-3">
                    <button onclick="closeModal('sentenceModal')" class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">취소</button>
                    <button onclick="saveSentence()" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">저장</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modals').innerHTML = modal;
}

function showResultModal(result) {
    const modal = `
        <div id="resultModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-6 w-96">
                <h2 class="text-xl font-semibold mb-4">인식 결과</h2>
                <div class="space-y-4">
                    <div class="p-4 ${result.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded-lg">
                        <p class="text-sm font-medium text-gray-700">결과</p>
                        <p class="text-2xl font-bold ${result.isCorrect ? 'text-green-600' : 'text-red-600'}">
                            ${result.isCorrect ? '정답! ✓' : '오답 ✗'}
                        </p>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-gray-700">원본</p>
                        <p class="text-lg">${result.targetText}</p>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-gray-700">인식 결과</p>
                        <p class="text-lg ${result.isCorrect ? 'text-green-600' : 'text-red-600'}">${result.recognizedText || '인식 실패'}</p>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-gray-700">신뢰도</p>
                        <div class="flex items-center">
                            <div class="flex-1 bg-gray-200 rounded-full h-2">
                                <div class="bg-blue-600 h-2 rounded-full" style="width: ${result.confidence * 100}%"></div>
                            </div>
                            <span class="ml-2 text-sm">${(result.confidence * 100).toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
                <div class="mt-6 flex justify-end">
                    <button onclick="closeModal('resultModal')" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">확인</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modals').innerHTML = modal;
}

function showLoadingModal() {
    const modal = `
        <div id="loadingModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-6">
                <div class="flex items-center">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                    <p class="text-lg">음성 인식 중...</p>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modals').innerHTML = modal;
}

function hideLoadingModal() {
    closeModal('loadingModal');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}

// ==================== Save Functions ====================
async function saveUser() {
    const username = document.getElementById('newUsername').value;
    const age = document.getElementById('newUserAge').value;
    const gender = document.getElementById('newUserGender').value;

    if (!username || !age) {
        alert('모든 필드를 입력해주세요.');
        return;
    }

    try {
        const response = await axios.post('/api/users', { username, age: parseInt(age), gender });
        if (response.data.success) {
            closeModal('userModal');
            loadUsers();
            alert('사용자가 등록되었습니다.');
        }
    } catch (error) {
        console.error('Failed to save user:', error);
        alert('사용자 등록 실패');
    }
}

async function saveSentence() {
    const content = document.getElementById('newSentenceContent').value;
    const type = document.getElementById('newSentenceType').value;
    const level = document.getElementById('newSentenceLevel').value;
    const set_number = parseInt(document.getElementById('newSentenceSet').value);

    if (!content) {
        alert('내용을 입력해주세요.');
        return;
    }

    try {
        const response = await axios.post('/api/sentences', {
            content,
            type,
            level,
            set_number
        });
        if (response.data.success) {
            closeModal('sentenceModal');
            loadSentences();
            alert('문장이 등록되었습니다.');
        }
    } catch (error) {
        console.error('Failed to save sentence:', error);
        alert('문장 등록 실패');
    }
}

// ==================== Delete Functions ====================
async function deleteSentence(sentenceId) {
    if (!confirm('이 문장을 정말 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        const response = await axios.delete(`/api/sentences/${sentenceId}`);
        if (response.data.success) {
            alert('문장이 삭제되었습니다.');
            loadSentences();
        }
    } catch (error) {
        console.error('Failed to delete sentence:', error);
        alert('문장 삭제 실패');
    }
}

// ==================== Detailed Statistics Functions ====================
async function showDetailedStats() {
    showSection('dashboard');
    showDetailedTable('sentence');
}

async function showDetailedTable(type) {
    const container = document.getElementById('detailedStatsTable');
    if (!container) return;

    try {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">로딩 중...</p>';
        
        if (type === 'sentence') {
            const [statsResponse, resultsResponse] = await Promise.all([
                axios.get('/api/stats', { params: { groupBy: 'sentence' } }),
                axios.get('/api/results', { params: { limit: 1000 } })
            ]);
            
            const stats = statsResponse.data.stats;
            const results = resultsResponse.data.results;
            
            if (stats.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-center py-4">통계 데이터가 없습니다</p>';
                return;
            }
            
            const table = `
                <table class="min-w-full">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">레벨</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">세트</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">내용</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">타입</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">시도횟수</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">정답수</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">정답률</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">평균신뢰도</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">오류 인식결과</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${stats.map(s => {
                            const sentenceResults = results.filter(r => r.sentence_content === s.content);
                            const errorResults = sentenceResults.filter(r => !r.is_correct);
                            const errorTexts = [...new Set(errorResults.map(r => r.recognized_text || '인식실패'))].slice(0, 3);
                            
                            return `
                                <tr>
                                    <td class="px-4 py-2 text-sm font-medium">${s.level || '-'}</td>
                                    <td class="px-4 py-2 text-sm">${s.set_number || '-'}</td>
                                    <td class="px-4 py-2 text-sm">${s.content}</td>
                                    <td class="px-4 py-2 text-sm">${s.type === 'word' ? '단어' : '문장'}</td>
                                    <td class="px-4 py-2 text-sm">${s.total_attempts || 0}</td>
                                    <td class="px-4 py-2 text-sm">${s.correct_count || 0}</td>
                                    <td class="px-4 py-2 text-sm">
                                        <span class="px-2 py-1 rounded-full text-xs ${
                                            (s.accuracy_rate || 0) >= 0.8 ? 'bg-green-100 text-green-800' :
                                            (s.accuracy_rate || 0) >= 0.6 ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }">
                                            ${((s.accuracy_rate || 0) * 100).toFixed(1)}%
                                        </span>
                                    </td>
                                    <td class="px-4 py-2 text-sm">${((s.avg_confidence || 0) * 100).toFixed(1)}%</td>
                                    <td class="px-4 py-2 text-sm text-red-600">
                                        ${errorTexts.length > 0 ? errorTexts.join(', ') : '-'}
                                        ${errorTexts.length >= 3 ? '...' : ''}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
            container.innerHTML = table;
            
        } else if (type === 'user') {
            const [statsResponse, resultsResponse] = await Promise.all([
                axios.get('/api/stats', { params: { groupBy: 'user' } }),
                axios.get('/api/results', { params: { limit: 1000 } })
            ]);
            
            const stats = statsResponse.data.stats;
            const results = resultsResponse.data.results;
            
            if (stats.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-center py-4">통계 데이터가 없습니다</p>';
                return;
            }
            
            const table = `
                <table class="min-w-full">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">사용자명</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">나이</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">성별</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">총시도횟수</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">정답수</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">정답률</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">평균신뢰도</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">최근오류</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${stats.map(s => {
                            const userResults = results.filter(r => r.username === s.username);
                            const recentErrors = userResults.filter(r => !r.is_correct).slice(0, 2);
                            
                            return `
                                <tr>
                                    <td class="px-4 py-2 text-sm font-medium">${s.username}</td>
                                    <td class="px-4 py-2 text-sm">${s.age || '-'}</td>
                                    <td class="px-4 py-2 text-sm">${s.gender === 'male' ? '남' : s.gender === 'female' ? '여' : '기타'}</td>
                                    <td class="px-4 py-2 text-sm">${s.total_attempts || 0}</td>
                                    <td class="px-4 py-2 text-sm">${s.correct_count || 0}</td>
                                    <td class="px-4 py-2 text-sm">
                                        <span class="px-2 py-1 rounded-full text-xs ${
                                            (s.accuracy_rate || 0) >= 0.8 ? 'bg-green-100 text-green-800' :
                                            (s.accuracy_rate || 0) >= 0.6 ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }">
                                            ${((s.accuracy_rate || 0) * 100).toFixed(1)}%
                                        </span>
                                    </td>
                                    <td class="px-4 py-2 text-sm">${((s.avg_confidence || 0) * 100).toFixed(1)}%</td>
                                    <td class="px-4 py-2 text-sm text-red-600">
                                        ${recentErrors.map(e => 
                                            `${e.target_text} → ${e.recognized_text || '실패'}`
                                        ).join('<br>') || '-'}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
            container.innerHTML = table;
        }
        
    } catch (error) {
        console.error('Failed to load detailed stats:', error);
        container.innerHTML = '<p class="text-red-500 text-center py-4">통계 로딩 실패</p>';
    }
}

// ==================== Export Functions ====================
async function exportData(type) {
    try {
        const response = await axios.get(`/api/export/csv?type=${type}`, {
            responseType: 'blob'
        });
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `stt-data-${type}-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (error) {
        console.error('Failed to export data:', error);
        alert('데이터 내보내기 실패');
    }
}

// ==================== Event Listeners ====================
function setupEventListeners() {
    // User selection change
    document.getElementById('userSelect').addEventListener('change', (e) => {
        currentUser = e.target.value;
        const userInfo = document.getElementById('userInfo');
        if (currentUser) {
            const option = e.target.selectedOptions[0];
            userInfo.textContent = `선택됨: ${option.textContent}`;
        } else {
            userInfo.textContent = '';
        }
    });

    // Sentence selection change
    document.getElementById('sentenceSelect').addEventListener('change', (e) => {
        const sentenceId = parseInt(e.target.value);
        selectedSentence = sentences.find(s => s.id === sentenceId);
        const display = document.getElementById('targetDisplay');
        if (selectedSentence) {
            display.innerHTML = `
                <div class="text-center">
                    <p class="text-2xl font-bold text-gray-800 mb-2">${selectedSentence.content}</p>
                    <p class="text-sm text-gray-600">
                        레벨 ${selectedSentence.level} 세트 ${selectedSentence.set_number} | 
                        ${selectedSentence.type === 'word' ? '단어' : '문장'}
                    </p>
                </div>
            `;
        } else {
            display.innerHTML = '<p class="text-gray-500 text-center">선택된 문장이 없습니다</p>';
        }
    });
}

// ==================== Navigation ====================
function showSection(section) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    // Show selected section
    document.getElementById(`${section}-section`).classList.remove('hidden');
    
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-blue-100', 'text-blue-700');
    });
    event.target.closest('button').classList.add('bg-blue-100', 'text-blue-700');

    // Load section-specific data
    if (section === 'dashboard') {
        loadStats();
    }
}

// ==================== Timer Functions ====================
let timerInterval = null;
let startTime = null;

function startTimer() {
    startTime = Date.now();
    const timer = document.getElementById('recordTimer');
    timer.classList.remove('hidden');
    
    timerInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const displaySeconds = seconds % 60;
        timer.textContent = `${String(minutes).padStart(2, '0')}:${String(displaySeconds).padStart(2, '0')}`;
    }, 100);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    const timer = document.getElementById('recordTimer');
    timer.classList.add('hidden');
    timer.textContent = '00:00';
}