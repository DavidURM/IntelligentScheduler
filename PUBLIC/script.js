document.addEventListener('DOMContentLoaded', () => {
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskTableBody = document.querySelector('#taskTable tbody');

    let tasks = [];

    // Load tasks from the server
    fetch('/tasks')
        .then(response => response.json())
        .then(data => {
            tasks = data;
            updateTaskTable();
        })
        .catch(error => console.error('Error loading tasks:', error));

    addTaskBtn.addEventListener('click', () => {
        const taskDate = document.getElementById('taskDate').value;
        const taskName = document.getElementById('taskName').value;
        const startTime = document.getElementById('startTime').value;
        const endTime = document.getElementById('endTime').value;

        if (taskDate && taskName && startTime && endTime) {
            const newTask = {
                date: taskDate,
                name: taskName,
                start: convertTimeToDecimal(startTime),
                end: convertTimeToDecimal(endTime),
                priority: true, // Tasks added via Home.html are priority tasks
            };

            if (isTaskConflict(newTask)) {
                alert('This task conflicts with an existing task!');
                return;
            }

            tasks.push(newTask);
            saveTasksToServer();
            updateTaskTable();
            clearForm();
        } else {
            alert('Please fill out all fields.');
        }
    });

    function updateTaskTable() {
        const now = new Date();
        taskTableBody.innerHTML = ''; // Clear current table

        tasks.sort((a, b) => new Date(a.date) - new Date(b.date) || a.start - b.start);

        tasks.forEach((task, index) => {
            const taskEnd = new Date(`${task.date}T${formatTime(task.end)}`);
            const isOverdue = taskEnd < now && !task.done;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${task.date}</td>
                <td>${task.name}</td>
                <td>${formatTime(task.start)}</td>
                <td>${formatTime(task.end)}</td>
                <td>
                    <button class="delete-btn" data-index="${index}">Delete</button>
                </td>
                <td>
                    <button class="done-btn" data-index="${index}">Done</button>
                </td>
            `;

            if (isOverdue) row.style.color = 'red';
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
        saveTasksToServer(); // Update the server
        updateTaskTable(); // Refresh the UI
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

        saveTasksToServer(); // Update the server
        updateTaskTable(); // Refresh the UI
    }

    function saveTasksToServer() {
        fetch('/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tasks),
        }).catch(error => console.error('Error saving tasks:', error));
    }

    function isTaskConflict(newTask) {
        return tasks.some(
            task =>
                task.date === newTask.date &&
                ((newTask.start >= task.start && newTask.start < task.end) ||
                    (newTask.end > task.start && newTask.end <= task.end) ||
                    (newTask.start <= task.start && newTask.end >= task.end))
        );
    }

    function convertTimeToDecimal(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours + minutes / 60;
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

    // Navigate to Completed Tasks
    window.navigateToCompletedTasks = () => {
        window.location.href = 'CompletedTasks.html'; // Redirect to the Completed Tasks page
    };
});
