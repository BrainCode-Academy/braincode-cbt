// State
let examData = {
    subjects: [], // Array of subject objects
    currentSubjectIndex: 0,
    answers: {}, // Key: subjectId_questionId, Value: selectedOption
    startTime: null,
    duration: 0, // in seconds
    timerInterval: null
};

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    const config = JSON.parse(sessionStorage.getItem('examConfig'));
    const user = sessionStorage.getItem('user');

    if (!config || !user) {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('candidateName').textContent = user;
    examData.duration = config.duration * 60;

    loadQuestions(config.subjects);
    startTimer();
    renderSubjectTabs();
    loadSubject(0);
});

// Load Data
function loadQuestions(selectedSubjectIds) {
    try {
        const data = window.MOCK_DATA;
        if (!data) throw new Error("Data not loaded");

        // Filter and randomize
        examData.subjects = data.subjects
            .filter(s => selectedSubjectIds.includes(s.id))
            .map(s => ({
                ...s,
                questions: shuffleArray([...s.questions]) // Clone before shuffle
            }));

        // Initialize answers structure
        examData.subjects.forEach(s => {
            s.questions.forEach(q => {
                // examData.answers[`${s.id}_${q.id}`] = null; // Not strictly needed, can just check existence
            });
        });

    } catch (error) {
        console.error("Failed to load questions", error);
        alert("Error loading exam data. Please try again.");
    }
}

// Utility: Shuffle
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Timer
function startTimer() {
    const timerDisplay = document.getElementById('timer');
    let timeLeft = examData.duration;

    examData.timerInterval = setInterval(() => {
        if (timeLeft <= 0) {
            clearInterval(examData.timerInterval);
            forceSubmit();
            return;
        }

        const hours = Math.floor(timeLeft / 3600);
        const minutes = Math.floor((timeLeft % 3600) / 60);
        const seconds = timeLeft % 60;

        timerDisplay.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

        // Warning color
        if (timeLeft < 300) { // 5 mins
            timerDisplay.style.color = 'red';
            timerDisplay.classList.add('animate-pulse'); // Add pulse animation if defined
        }

        timeLeft--;
    }, 1000);
}

function pad(num) {
    return num.toString().padStart(2, '0');
}

// UI Rendering
function renderSubjectTabs() {
    const container = document.getElementById('subjectTabs');
    container.innerHTML = '';

    examData.subjects.forEach((subject, index) => {
        const li = document.createElement('li');
        li.className = 'nav-item';
        li.innerHTML = `
            <a class="nav-link ${index === 0 ? 'active' : ''}" href="#" onclick="switchSubject(${index}); return false;">
                ${subject.name}
            </a>
        `;
        container.appendChild(li);
    });
}

let currentQuestionIndex = 0;

function switchSubject(index) {
    examData.currentSubjectIndex = index;
    currentQuestionIndex = 0; // Reset to first question of subject

    // Update tabs
    const tabs = document.querySelectorAll('#subjectTabs .nav-link');
    tabs.forEach((t, i) => {
        if (i === index) t.classList.add('active');
        else t.classList.remove('active');
    });

    loadQuestion();
    renderNavGrid();
}

function loadSubject(index) {
    switchSubject(index);
}

function loadQuestion() {
    const subject = examData.subjects[examData.currentSubjectIndex];
    const question = subject.questions[currentQuestionIndex];

    document.getElementById('subjectTitle').textContent = subject.name;
    document.getElementById('questionCounter').textContent = `Question ${currentQuestionIndex + 1} of ${subject.questions.length}`;
    document.getElementById('questionText').innerHTML = question.text;

    // Render Options
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';

    const currentAnswer = examData.answers[`${subject.id}_${question.id}`];

    for (const [key, value] of Object.entries(question.options)) {
        const div = document.createElement('div');
        div.className = `option-card ${currentAnswer === key ? 'selected' : ''}`;
        div.onclick = () => selectOption(subject.id, question.id, key);
        div.innerHTML = `
            <div class="d-flex align-items-center">
                <span class="fw-bold me-3 text-uppercase">${key}.</span>
                <span>${value}</span>
            </div>
        `;
        optionsContainer.appendChild(div);
    }

    // Update Nav Grid highlight
    updateNavGridHighlight();

    // Button states
    document.getElementById('prevBtn').disabled = currentQuestionIndex === 0;
    document.getElementById('nextBtn').disabled = currentQuestionIndex === subject.questions.length - 1;
}

function selectOption(subjectId, questionId, optionKey) {
    examData.answers[`${subjectId}_${questionId}`] = optionKey;
    loadQuestion(); // Re-render to show selection
    renderNavGrid(); // Update grid status
}

function navigate(direction) {
    const subject = examData.subjects[examData.currentSubjectIndex];
    const newIndex = currentQuestionIndex + direction;

    if (newIndex >= 0 && newIndex < subject.questions.length) {
        currentQuestionIndex = newIndex;
        loadQuestion();
    }
}

function jumpToQuestion(index) {
    currentQuestionIndex = index;
    loadQuestion();
}

function renderNavGrid() {
    const container = document.getElementById('navGrid');
    container.innerHTML = '';

    const subject = examData.subjects[examData.currentSubjectIndex];

    subject.questions.forEach((q, index) => {
        const isAnswered = examData.answers[`${subject.id}_${q.id}`] !== undefined;
        const isCurrent = index === currentQuestionIndex;

        const btn = document.createElement('div');
        btn.className = `nav-btn ${isAnswered ? 'answered' : ''} ${isCurrent ? 'current' : ''}`;
        btn.textContent = index + 1;
        btn.onclick = () => jumpToQuestion(index);

        container.appendChild(btn);
    });
}

function updateNavGridHighlight() {
    // Just re-render for simplicity, or toggle classes if performance needed
    renderNavGrid();
}

// Submission
function submitExam() {
    // Calculate stats for modal
    let answered = 0;
    let total = 0;

    examData.subjects.forEach(s => {
        s.questions.forEach(q => {
            total++;
            if (examData.answers[`${s.id}_${q.id}`]) answered++;
        });
    });

    document.getElementById('modalAnswered').textContent = answered;
    document.getElementById('modalUnanswered').textContent = total - answered;

    const modal = new bootstrap.Modal(document.getElementById('submitModal'));
    modal.show();
}

function confirmSubmit() {
    calculateResults();
}

function forceSubmit() {
    alert("Time is up! Submitting your exam now.");
    calculateResults();
}

function calculateResults() {
    clearInterval(examData.timerInterval);

    const results = {
        totalScore: 0,
        totalQuestions: 0,
        subjectScores: []
    };

    examData.subjects.forEach(subject => {
        let subjectScore = 0;
        let subjectTotal = subject.questions.length;

        subject.questions.forEach(q => {
            const userAnswer = examData.answers[`${subject.id}_${q.id}`];
            if (userAnswer === q.answer) {
                subjectScore++;
            }
        });

        results.subjectScores.push({
            name: subject.name,
            score: subjectScore,
            total: subjectTotal
        });

        results.totalScore += subjectScore;
        results.totalQuestions += subjectTotal;
    });

    sessionStorage.setItem('examResults', JSON.stringify(results));
    window.location.href = 'result.html';
}
