//Importing the required libraries.
const express = require('express'); 
const sqlite3 = require('sqlite3').verbose(); //lets us interact with an SQLite database
const bodyParser = require('body-parser'); //middleware to parse incoming request bodies
const bcrypt = require('bcrypt'); //this is a library for securley hashing passwords
const jwt = require('jsonwebtoken'); //used to create and verify tokens
const dotenv = require('dotenv'); // loads environment variables from my .env file

dotenv.config(); // Loading the environment variables

const app = express();
app.use(bodyParser.json());

// Shared SQLite database instance`
const db = new sqlite3.Database('my_database.db');

//For testing only
const dropTables = () => {
    db.serialize(() => {
        db.run('DROP TABLE IF EXISTS users')
        db.run('DROP TABLE IF EXISTS availability')
        db.run('DROP TABLE IF EXISTS appointments')
    })
}

dropTables()

// Initialising the database - creating the tables
const initializeDB = () => {
    db.serialize(() => {
        //db.serialize ensures that database operations are executed sequentially. 
        // Create a table for users (with fields for id, email, password, and role)
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('student', 'professor'))
        )`);

        // Create a table for professor availability (with a start and end time)    
        db.run(`CREATE TABLE IF NOT EXISTS availability (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            professor_id INTEGER NOT NULL,
            start_time DATETIME NOT NULL,
            end_time DATETIME NOT NULL,
            FOREIGN KEY (professor_id) REFERENCES users(id)
        )`);

        //Create a table for appointments (with fields for student_id, professor_id, slot_id and status)
        db.run(`CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            professor_id INTEGER NOT NULL,
            slot_id INTEGER NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('booked', 'cancelled')),
            FOREIGN KEY (student_id) REFERENCES users(id),
            FOREIGN KEY (professor_id) REFERENCES users(id),
            FOREIGN KEY (slot_id) REFERENCES availability(id)
        )`);
    });
};

initializeDB(); // Ensure the database is set up by calling the function

//For visualising the database with pre-filled values.
const insertData = () => {
    db.run('INSERT OR IGNORE INTO users (id, email, password, role) VALUES (1, "student1@gmail.com", "password", "student")', function (err) {
        if (err) console.error('Error inserting student1:', err);
    });

    db.run('INSERT OR IGNORE INTO users (id, email, password, role) VALUES (2, "student2@gmail.com", "password", "student")', function (err) {
        if (err) console.error('Error inserting student2:', err);
    });

    db.run('INSERT OR IGNORE INTO users (id, email, password, role) VALUES (3, "professor1@gmail.com", "password", "professor")', function (err) {
        if (err) console.error('Error inserting professor1:', err);
    });

    db.run('INSERT OR IGNORE INTO users (id, email, password, role) VALUES (4, "professor2@gmail.com", "password", "professor")', function (err) {
        if (err) console.error('Error inserting professor1:', err);
    });

    // Insert initial availability
    db.run('INSERT OR IGNORE INTO availability (id, professor_id, start_time, end_time) VALUES (1, 3, "2025-03-21 09:00:00", "2025-03-21 10:00:00")', function (err) {
        if (err) console.error('Error inserting availability slot 1:', err);
    });

    db.run('INSERT OR IGNORE INTO availability (id, professor_id, start_time, end_time) VALUES (2, 3, "2025-03-21 11:00:00", "2025-03-21 12:00:00")', function (err) {
        if (err) console.error('Error inserting availability slot 2:', err);
    });

    db.run('INSERT OR IGNORE INTO availability (id, professor_id, start_time, end_time) VALUES (3, 4, "2025-03-21 13:00:00", "2025-03-21 15:00:00")', function (err) {
        if (err) console.error('Error inserting availability slot 2:', err);
    });

    // Insert initial appointments
    db.run('INSERT OR IGNORE INTO appointments (id, student_id, professor_id, slot_id, status) VALUES (1, 1, 3, 1, "booked")', function (err) {
        if (err) console.error('Error inserting appointment 1:', err);
    });

    db.run('INSERT OR IGNORE INTO appointments (id, student_id, professor_id, slot_id, status) VALUES (2, 2, 3, 2, "booked")', function (err) {
        if (err) console.error('Error inserting appointment 2:', err);
    });
}

insertData();

// Middleware for authentication by verifying the JWT
const authenticate = (req, res, next) => {
    try {
        //We get the token from the 'Authorization' header in bearer token format
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) return res.status(401).send('Access denied!'); //if there is no token, we return an error

        //We now verify the token using the secret key from the environment variables
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
        req.user = verified;
        next(); //proceed to the next middleware
    } catch (err) {
        res.status(401).send('Invalid token.'); //if the token verification fails, return an error
    }
};

// Registering the user
app.post('/register', (req, res) => {
    const { email, password, role } = req.body;
    //checking if all fields have been filled in
    if (!email || !password || !role) return res.status(400).send('Fill in all fields please.');
    //checking if the role is either 'student' or 'professor'
    if (!['student', 'professor'].includes(role)) return res.status(400).send('Invalid role.');

    const hashedPassword = bcrypt.hashSync(password, 10); //hash the password

    //insert the new user into the database
    db.run(`INSERT INTO users (email, password, role) VALUES (?, ?, ?)`, [email, hashedPassword, role], function (err) {
        if (err) return res.status(400).send('User already exists.'); //if the user already exists, return an error
        res.send({ id: this.lastID }); //Send back the new user's Id as a response
    });
});

// Login user
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    //get the user details from the database using their email
    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
        if (!user || !bcrypt.compareSync(password, user.password)) return res.status(400).send('Invalid credentials.'); //If theres no user or the password doesnt match
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'default_secret'); //Create a JWT token
        res.send({ token }); //we send the token back, for their future login
    });
});

// Get appointments for student
app.get('/appointments', authenticate, (req, res) => {
    //return an error if the user isnt a student
    if (req.user.role !== 'student') return res.status(403).send('Only students can view appointments.');
    
    //We get all the appointments for the logged in user
    db.all(`SELECT a.id, a.status, p.email AS professor_email, v.start_time, v.end_time 
            FROM appointments a 
            JOIN availability v ON a.slot_id = v.id 
            JOIN users p ON a.professor_id = p.id 
            WHERE a.student_id = ?`, [req.user.id], (err, appointments) => {
        if (err) return res.status(400).send('Error fetching appointments.');
        res.send(appointments);  //Send the appointments info to the user
    });
});

// Add availability
app.post('/availability', authenticate, (req, res) => {
    if (req.user.role !== 'professor') return res.status(403).send('Only professors can add availability.');

    const { start_time, end_time } = req.body;

    //Putting the availability into the database
    db.run(`INSERT INTO availability (professor_id, start_time, end_time) VALUES (?, ?, ?)`, [req.user.id, start_time, end_time], function (err) {
        if (err) return res.status(400).send('Error adding availability.');
        res.send({ id: this.lastID }); // Send the ID of the newly created availability slot
    });
});

// Get availability
app.get('/availability/:professorId', authenticate, (req, res) => {
    //we get back all the availability slots for a specific professor (P1)
    db.all(`SELECT * FROM availability WHERE professor_id = ?`, [req.params.professorId], (err, slots) => {
        if (err) return res.status(400).send('Error fetching availability.');
        res.send(slots);
    });
});

// Book appointment
app.post('/appointments', authenticate, (req, res) => {
    if (req.user.role !== 'student') return res.status(403).send('Only students can book appointments.');

    const { professor_id, slot_id } = req.body;

    // Checking if the professor_id exists and is a professor
    db.get(`SELECT * FROM users WHERE id = ? AND role = 'professor'`, [professor_id], (err, professor) => {
        if (!professor) return res.status(400).send('Invalid professor ID.');

        // Checking if the slot_id exists and belongs to the professor
        db.get(`SELECT * FROM availability WHERE id = ? AND professor_id = ?`, [slot_id, professor_id], (err, slot) => {
            if (!slot) return res.status(400).send('Slot does not exist or does not belong to the professor.');

            // Checking if the slot is already booked
            db.get(`SELECT * FROM appointments WHERE slot_id = ?`, [slot_id], (err, existingAppointment) => {
                if (existingAppointment) return res.status(400).send('Slot is already booked.');

                // Booking the appointment
                db.run(`INSERT INTO appointments (student_id, professor_id, slot_id, status) VALUES (?, ?, ?, 'booked')`, 
                    [req.user.id, professor_id, slot_id], 
                    function (err) {
                        if (err) return res.status(400).send('Error booking appointment.');
                        res.send({ id: this.lastID });
                    });
            });
        });
    });
});

// Cancel appointment
app.delete('/appointments/:id', authenticate, (req, res) => {
    //deleting the appointment by its id
    db.run(`DELETE FROM appointments WHERE id = ?`, [req.params.id], function (err) {
        if (err) return res.status(400).send('Error cancelling appointment.');
        res.send('Appointment cancelled.'); //send confirmation that the appointment has been cancelled
    });
});

// Start server on port 3000
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Close database connection after server stops
const closeDatabase = () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        }
    });
};

//Export the app and server to be used in the testing
module.exports = { app, server, closeDatabase };
