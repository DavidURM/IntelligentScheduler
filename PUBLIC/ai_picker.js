document.addEventListener('DOMContentLoaded', () => {
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskTableBody = document.querySelector('#taskTable tbody');

    const START_TIME = 6; // Earliest hour (6 AM)
    const END_TIME = 20; // Latest hour (8 PM)

    let tasks = [];

    // Load tasks from server
    fetch('/tasks')
        .then(response => response.json())
        .then(data => {
            tasks = data;
            arrangeTasks();
        })
        .catch(error => console.error('Error loading tasks:', error));

    addTaskBtn.addEventListener('click', () => {
        const taskName = document.getElementById('taskName').value;
        const duration = parseFloat(document.getElementById('duration').value);

        if (taskName && duration > 0 && duration <= 14) {
            const success = addTask({ name: taskName, duration });

            if (success) {
                saveTasksToServer();
                arrangeTasks();
                clearForm();
            } else {
                alert('No suitable time slot found, even on subsequent days.');
            }
        } else {
            alert('Please enter a valid task name and duration (max 14 hours).');
        }
    });

    function addTask(newTask) {
        let nextDate = getToday(); // Start from today
        const maxLookAhead = 7; // Limit to search within the next 7 days to avoid infinite loops

        for (let i = 0; i < maxLookAhead; i++) {
            const availableSlots = findAvailableSlots(nextDate);

            for (const slot of availableSlots) {
                const slotStart = slot.start;
                const slotEnd = slot.start + newTask.duration;

                // Ensure the task fits within the slot
                if (slotEnd <= slot.end) {
                    const scheduledTask = {
                        name: newTask.name,
                        date: slot.date,
                        start: slotStart,
                        end: slotEnd,
                        priority: false, // AI_Picker tasks are non-priority
                    };

                    tasks.push(scheduledTask);
                    return true; // Task successfully scheduled
                }
            }

            nextDate = incrementDate(nextDate); // Move to the next day
        }

        return false; // No suitable slot found even after searching multiple days
    }

    function findAvailableSlots(date) {
        const slots = [];
        const dayTasks = tasks.filter(task => task.date === date);
    
        let currentStart = START_TIME;
    
        // If it's today, adjust the current start time to the next available hour
        const today = getToday();
        if (date === today) {
            const now = new Date();
            const currentHour = now.getHours() + now.getMinutes() / 60;
            currentStart = Math.max(currentStart, currentHour);
        }
    
        // Ensure tasks for the day are sorted by start time
        dayTasks.sort((a, b) => a.start - b.start);
    
        for (const task of dayTasks) {
            // Respect priority tasks and scheduled slots
            if (currentStart < task.start) {
                slots.push({ date, start: currentStart, end: task.start });
            }
            currentStart = Math.max(currentStart, task.end);
        }
    
        if (currentStart < END_TIME) {
            slots.push({ date, start: currentStart, end: END_TIME });
        }
    
        // If no tasks exist for the day, add the full day slot
        if (dayTasks.length === 0 && currentStart < END_TIME) {
            slots.push({ date, start: currentStart, end: END_TIME });
        }
    
        return slots;
    }
    
    function arrangeTasks() {
        taskTableBody.innerHTML = ''; // Clear the current table
        const now = new Date();

        tasks.sort((a, b) => new Date(a.date) - new Date(b.date) || a.start - b.start);

        tasks.forEach((task, index) => {
            const taskEnd = new Date(`${task.date}T${formatTime(task.end)}`);
            const isOverdue = taskEnd < now && !task.done;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${task.name}</td>
                <td>${task.date}</td>
                <td>${formatTime(task.start)}</td>
                <td>${formatTime(task.end)}</td>
                <td>
                    <button class="delete-btn" data-index="${index}">Delete</button>
                </td>
                <td>
                    <button class="done-btn" data-index="${index}">Done</button>
                </td>
            `;

            if (isOverdue) row.style.color = 'red'; // Mark overdue tasks
            taskTableBody.appendChild(row);
        });

        // Add delete functionality
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', deleteTask);
        });

        // Add done functionality
        document.querySelectorAll('.done-btn').forEach(button => {
            button.addEventListener('click', markTaskAsDone);
        });
    }

    function deleteTask(event) {
        const taskIndex = event.target.dataset.index;
        tasks.splice(taskIndex, 1); // Remove task from the array
        saveTasksToServer(); // Update server
        arrangeTasks(); // Refresh UI
    }

    function markTaskAsDone(event) {
        const taskIndex = event.target.dataset.index;
        const completedTask = tasks.splice(taskIndex, 1)[0]; // Remove from tasks and return the task

        // Save to completed tasks
        fetch('/completed-tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(completedTask),
        }).catch(error => console.error('Error saving completed task:', error));

        saveTasksToServer(); // Update server
        arrangeTasks(); // Refresh UI
    }

    function saveTasksToServer() {
        fetch('/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tasks),
        }).catch(error => console.error('Error saving tasks:', error));
    }

    function getToday() {
        return new Date().toISOString().split('T')[0];
    }

    function incrementDate(dateStr) {
        const date = new Date(dateStr);
        date.setDate(date.getDate() + 1);
        return date.toISOString().split('T')[0];
    }

    function formatTime(decimalTime) {
        if (isNaN(decimalTime)) return 'Invalid Time';
        const hours = Math.floor(decimalTime);
        const minutes = Math.round((decimalTime % 1) * 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    function clearForm() {
        document.getElementById('taskForm').reset();
    }
});
