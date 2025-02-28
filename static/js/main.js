// Global variables
let topics = [];
let totalTime = 0;
let currentTopic = null;
let timerInterval = null;
let timeLeft = 0;
let completedTopics = [];
let skippedTopics = [];
let sessionSummary = [];
let lastTopicName = null; // Track the last topic to avoid repeats

// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    // Initialize DOM elements after the document is fully loaded
    const setupScreen = document.getElementById('setup-screen');
    const revisionScreen = document.getElementById('revision-screen');
    const summaryScreen = document.getElementById('summary-screen');
    const topicsList = document.getElementById('topics-list');
    const topicInput = document.getElementById('topic-input');
    const totalTimeInput = document.getElementById('total-time');
    const currentTopicElement = document.getElementById('current-topic');
    const timerMinutesElement = document.getElementById('timer-minutes');
    const timerSecondsElement = document.getElementById('timer-seconds');
    const topicsProgressElement = document.getElementById('topics-progress');
    const summaryListElement = document.getElementById('summary-list');
    const totalTimeSpentElement = document.getElementById('total-time-spent');
    const timerProgressCircle = document.querySelector('.timer-progress');
    const addTopicButton = document.getElementById('add-topic');
    const startSessionButton = document.getElementById('start-session');
    const completeTopicButton = document.getElementById('complete-topic');
    const skipTopicButton = document.getElementById('skip-topic');
    const startNewSessionButton = document.getElementById('start-new-session');

    // Event Listeners
    if (addTopicButton) {
        addTopicButton.addEventListener('click', addTopic);
    }
    
    if (startSessionButton) {
        startSessionButton.addEventListener('click', startSession);
    }
    
    if (completeTopicButton) {
        completeTopicButton.addEventListener('click', completeTopic);
    }
    
    if (skipTopicButton) {
        skipTopicButton.addEventListener('click', skipTopic);
    }
    
    if (startNewSessionButton) {
        startNewSessionButton.addEventListener('click', resetApp);
    }
    
    if (topicInput) {
        topicInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addTopic();
            }
        });
    }

    // Initialize app
    renderTopicsList();
    if (startSessionButton) {
        startSessionButton.disabled = topics.length === 0;
    }

    // Functions
    function addTopic() {
        const topicName = topicInput.value.trim();
        if (topicName !== '') {
            topics.push(topicName);
            renderTopicsList();
            topicInput.value = '';
            topicInput.focus();
            
            // Enable start button if we have at least one topic
            if (startSessionButton) {
                startSessionButton.disabled = topics.length === 0;
            }
        }
    }

    function removeTopic(index) {
        topics.splice(index, 1);
        renderTopicsList();
        
        // Disable start button if we have no topics
        if (startSessionButton) {
            startSessionButton.disabled = topics.length === 0;
        }
    }

    function renderTopicsList() {
        if (!topicsList) return;
        
        topicsList.innerHTML = '';
        
        if (topics.length === 0) {
            topicsList.innerHTML = '<li>No topics added yet</li>';
            return;
        }
        
        topics.forEach((topic, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${topic}</span>
                <button class="remove-btn" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            // Add event listener directly to the remove button
            const removeBtn = li.querySelector('.remove-btn');
            if (removeBtn) {
                removeBtn.addEventListener('click', function() {
                    removeTopic(index);
                });
            }
            topicsList.appendChild(li);
        });
    }

    function startSession() {
        if (topics.length === 0) {
            alert('Please add at least one topic to start the session');
            return;
        }
        
        totalTime = parseInt(totalTimeInput.value, 10);
        if (isNaN(totalTime) || totalTime <= 0) {
            alert('Please enter a valid time in minutes');
            return;
        }
        
        // Reset session variables
        completedTopics = [];
        skippedTopics = [];
        sessionSummary = [];
        lastTopicName = null;
        
        // Send topics to server
        fetch('/submit_topics', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                topics: topics,
                totalTime: totalTime
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Switch to revision screen
                setupScreen.classList.remove('active');
                revisionScreen.classList.add('active');
                
                // Start with a random topic
                getRandomTopic();
                renderTopicsProgress();
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to start session. Please try again.');
        });
    }

    function getRandomTopic() {
        // Include the last topic name in the request to avoid getting the same topic again
        fetch(`/get_random_topic?last_topic=${lastTopicName || ""}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                currentTopic = {
                    name: data.topic,
                    time: data.time
                };
                
                // Update last topic name for next request
                lastTopicName = currentTopic.name;
                
                // Show the topic with animation
                if (currentTopicElement) {
                    currentTopicElement.textContent = currentTopic.name;
                    currentTopicElement.style.animation = 'none';
                    setTimeout(() => {
                        currentTopicElement.style.animation = 'pulse 1.5s infinite alternate';
                    }, 10);
                }
                
                // Start timer
                startTimer(currentTopic.time * 60); // Convert minutes to seconds
            } else {
                showSummary();
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to get a topic. Please try again.');
        });
    }

    function startTimer(duration) {
        clearInterval(timerInterval);
        
        timeLeft = duration;
        const circumference = 2 * Math.PI * 90; // 2πr where r=90 is the circle radius
        let originalDuration = duration;
        
        updateTimerDisplay(timeLeft);
        
        timerInterval = setInterval(() => {
            timeLeft--;
            
            if (timeLeft < 0) {
                clearInterval(timerInterval);
                completeTopic();
                return;
            }
            
            // Update timer display
            updateTimerDisplay(timeLeft);
            
            // Update circle progress
            if (timerProgressCircle) {
                const progress = timeLeft / originalDuration;
                const dashoffset = circumference * (1 - progress);
                timerProgressCircle.style.strokeDasharray = circumference;
                timerProgressCircle.style.strokeDashoffset = dashoffset;
            }
        }, 1000);
    }

    function updateTimerDisplay(timeInSeconds) {
        if (!timerMinutesElement || !timerSecondsElement) return;
        
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = timeInSeconds % 60;
        
        timerMinutesElement.textContent = minutes.toString().padStart(2, '0');
        timerSecondsElement.textContent = seconds.toString().padStart(2, '0');
    }

    function completeTopic() {
        // Add to completed topics
        if (currentTopic) {
            // Clear current topic display immediately to indicate change
            if (currentTopicElement) {
                currentTopicElement.textContent = "Loading next topic...";
                currentTopicElement.style.animation = "none";
            }
            
            // Stop the timer
            clearInterval(timerInterval);
            
            completedTopics.push(currentTopic.name);
            
            // Record for summary
            const timeSpent = (currentTopic.time * 60) - timeLeft;
            sessionSummary.push({
                topic: currentTopic.name,
                status: 'completed',
                timeSpent: timeSpent
            });
            
            // Update progress display
            renderTopicsProgress();
            
            // Get next topic
            getRandomTopic();
        }
    }

    function skipTopic() {
        // Add to skipped topics
        if (currentTopic) {
            // Clear current topic display immediately to indicate change
            if (currentTopicElement) {
                currentTopicElement.textContent = "Loading next topic...";
                currentTopicElement.style.animation = "none";
            }
            
            // Stop the timer
            clearInterval(timerInterval);
            
            skippedTopics.push(currentTopic.name);
            
            // Record for summary
            const timeSpent = (currentTopic.time * 60) - timeLeft;
            sessionSummary.push({
                topic: currentTopic.name,
                status: 'skipped',
                timeSpent: timeSpent
            });
            
            // Update progress display
            renderTopicsProgress();
            
            // Get next topic
            getRandomTopic();
        }
    }

    function renderTopicsProgress() {
        if (!topicsProgressElement) return;
        
        // Get all topics to display progress
        fetch('/get_all_topics')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                topicsProgressElement.innerHTML = '';
                
                data.topics.forEach(topic => {
                    const topicElement = document.createElement('div');
                    topicElement.classList.add('topic-progress-item');
                    
                    if (completedTopics.includes(topic.name)) {
                        topicElement.classList.add('completed');
                        topicElement.innerHTML = `<i class="fas fa-check"></i> ${topic.name}`;
                    } else if (skippedTopics.includes(topic.name)) {
                        topicElement.classList.add('skipped');
                        topicElement.innerHTML = `<i class="fas fa-forward"></i> ${topic.name}`;
                    } else {
                        topicElement.innerHTML = `<i class="fas fa-clock"></i> ${topic.name}`;
                    }
                    
                    topicsProgressElement.appendChild(topicElement);
                });
                
                // Check if all topics are either completed or skipped
                const allTopics = data.topics.map(t => t.name);
                const handledTopics = [...completedTopics, ...skippedTopics];
                
                // If all topics are handled or we've gone through all - show summary
                if (handledTopics.length >= allTopics.length || sessionSummary.length >= allTopics.length * 2) {
                    clearInterval(timerInterval);
                    showSummary();
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }

    function showSummary() {
        if (!summaryScreen || !revisionScreen || !summaryListElement || !totalTimeSpentElement) return;
        
        // Switch to summary screen
        revisionScreen.classList.remove('active');
        summaryScreen.classList.add('active');
        
        // Calculate total time spent
        let totalTimeSpent = 0;
        
        // Render summary
        summaryListElement.innerHTML = '';
        sessionSummary.forEach(item => {
            const li = document.createElement('li');
            
            // Calculate time in minutes and seconds
            const minutes = Math.floor(item.timeSpent / 60);
            const seconds = item.timeSpent % 60;
            const timeString = `${minutes}m ${seconds}s`;
            
            // Add time to total
            totalTimeSpent += item.timeSpent;
            
            li.innerHTML = `
                <span>
                    ${item.status === 'completed' ? 
                        '<i class="fas fa-check" style="color: var(--success-color);"></i>' : 
                        '<i class="fas fa-forward" style="color: var(--error-color);"></i>'}
                    ${item.topic}
                </span>
                <span>${timeString}</span>
            `;
            summaryListElement.appendChild(li);
        });
        
        // Show total time spent
        const totalMinutes = Math.floor(totalTimeSpent / 60);
        totalTimeSpentElement.textContent = totalMinutes;
    }

    function resetApp() {
        if (!summaryScreen || !setupScreen) return;
        
        // Reset all variables
        topics = [];
        totalTime = 0;
        currentTopic = null;
        clearInterval(timerInterval);
        timeLeft = 0;
        completedTopics = [];
        skippedTopics = [];
        sessionSummary = [];
        lastTopicName = null;
        
        // Reset UI
        if (topicInput) topicInput.value = '';
        if (totalTimeInput) totalTimeInput.value = '60';
        renderTopicsList();
        
        // Switch to setup screen
        summaryScreen.classList.remove('active');
        setupScreen.classList.add('active');
    }

    // Make removeTopic function available globally for onclick handlers
    window.removeTopic = removeTopic;
});