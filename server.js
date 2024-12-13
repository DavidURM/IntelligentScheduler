const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const TASKS_FILE = path.join(__dirname, 'tasks.json');
const COMPLETED_TASKS_FILE = path.join(__dirname, 'completedTasks.json');

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files (HTML, CSS, JS)
app.use(express.static('PUBLIC'));

// Route for the root URL "/"
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'PUBLIC', 'Home.html')); // Ensure Home.html is in the PUBLIC folder
});

// Endpoint to get tasks
app.get('/tasks', (req, res) => {
    fs.readFile(TASKS_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading tasks file:', err);
            return res.status(500).send('Error reading tasks file.');
        }
        const tasks = JSON.parse(data || '[]');
        res.json(tasks);
    });
});

// Endpoint to save tasks
app.post('/tasks', (req, res) => {
    const tasks = req.body;
    fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf8', (err) => {
        if (err) {
            console.error('Error writing tasks file:', err);
            return res.status(500).send('Error saving tasks.');
        }
        res.status(200).send('Tasks saved successfully.');
    });
});

// Endpoint to add a completed task
app.post('/completed-tasks', (req, res) => {
    const completedTask = req.body;

    // Read existing completed tasks
    fs.readFile(COMPLETED_TASKS_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading completed tasks file:', err);
            return res.status(500).send('Error reading completed tasks.');
        }

        let completedTasks = [];

        // Parse existing tasks, ensuring it is a valid array
        try {
            completedTasks = JSON.parse(data);
            if (!Array.isArray(completedTasks)) {
                completedTasks = []; // Reset to an empty array if malformed
            }
        } catch (parseError) {
            console.error('Error parsing completed tasks JSON:', parseError);
            completedTasks = [];
        }

        // Add the new completed task
        completedTasks.unshift(completedTask); // Add at the start

        // Save updated tasks back to the file
        fs.writeFile(
            COMPLETED_TASKS_FILE,
            JSON.stringify(completedTasks, null, 2),
            'utf8',
            (writeErr) => {
                if (writeErr) {
                    console.error('Error writing completed tasks file:', writeErr);
                    return res.status(500).send('Error saving completed task.');
                }
                res.status(200).send('Completed task saved successfully.');
            }
        );
    });
});

// Endpoint to get completed tasks
app.get('/completed-tasks', (req, res) => {
    fs.readFile(COMPLETED_TASKS_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading completed tasks file:', err);
            return res.status(500).send('Error reading completed tasks file.');
        }
        const completedTasks = JSON.parse(data || '[]');
        res.json(completedTasks);
    });
});

// Endpoint to save tasks (append mode)
app.post('/tasks', (req, res) => {
    const newTasks = req.body;
    fs.readFile(TASKS_FILE, 'utf8', (err, data) => {
        const currentTasks = data ? JSON.parse(data) : [];
        const updatedTasks = [...currentTasks.filter(task => task.priority), ...newTasks];
        fs.writeFile(TASKS_FILE, JSON.stringify(updatedTasks, null, 2), 'utf8', err => {
            if (err) {
                console.error('Error saving tasks:', err);
                return res.status(500).send('Error saving tasks.');
            }
            res.status(200).send('Tasks saved successfully.');
        });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
